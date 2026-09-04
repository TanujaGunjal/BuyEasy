const { GoogleGenerativeAI } = require('@google/generative-ai');
const AgentActionLog = require('../models/AgentActionLog');
const agentTools = require('../services/agentTools');

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// ─── System Prompt ─────────────────────────────────────────────────────────────
const SYSTEM_PROMPT = `You are BuyEasy's order support assistant. You help users with:
- Checking order status
- Verifying return eligibility
- Requesting refunds (pending human admin approval)
- Tracking deliveries

RULES you must follow without exception:

1. TOOLS FIRST: Always use the available tools. Never invent order details, statuses, amounts, or eligibility decisions.

2. CONVERSATION CONTEXT: If the user refers to "it", "that order", "my order" or similar without providing an order ID, and a previous order ID was discussed in this conversation, use that order ID. If no prior order ID exists in the conversation, ask for it.

3. MULTI-STEP REFUND FLOW: If the user requests a refund, FIRST call checkReturnEligibility. Only if eligible=true, then call initiateRefund. If eligible=false, explain the reason and do NOT call initiateRefund.

4. REFUNDS require human admin approval. Always communicate this explicitly: "Your refund request has been submitted for admin review."

5. NEVER decide eligibility yourself. The tool result is authoritative.

6. Keep responses concise, factual, and empathetic.`;

// ─── Tool Schemas ──────────────────────────────────────────────────────────────
// IMPORTANT: userId is deliberately absent from all schemas.
// The LLM must NEVER control who can access what.
const toolDeclarations = [
  {
    name: 'getOrderStatus',
    description: 'Get the current status, payment status, and delivery info for an order belonging to the authenticated user.',
    parameters: {
      type: 'object',
      properties: {
        orderId: { type: 'string', description: 'The MongoDB order ID' },
      },
      required: ['orderId'],
    },
  },
  {
    name: 'checkReturnEligibility',
    description: 'Check whether an order is eligible for return under the 30-day return policy. The backend decides eligibility — not the AI.',
    parameters: {
      type: 'object',
      properties: {
        orderId: { type: 'string', description: 'The MongoDB order ID' },
      },
      required: ['orderId'],
    },
  },
  {
    name: 'initiateRefund',
    description: 'Submit a refund request for admin approval. Only call this AFTER checkReturnEligibility returns eligible=true. The refund amount comes from the database — never pass an amount. The refund is NOT processed immediately; it requires human admin approval.',
    parameters: {
      type: 'object',
      properties: {
        orderId: { type: 'string', description: 'The MongoDB order ID' },
        reason: { type: 'string', description: 'The reason the user provided for the refund request' },
      },
      required: ['orderId', 'reason'],
    },
  },
  {
    name: 'getDeliveryEstimate',
    description: 'Get delivery status, estimated arrival date, tracking number, and carrier for an order.',
    parameters: {
      type: 'object',
      properties: {
        orderId: { type: 'string', description: 'The MongoDB order ID' },
      },
      required: ['orderId'],
    },
  },
];

// ─── Tool Dispatch ─────────────────────────────────────────────────────────────
// authenticatedUserId is injected server-side. The LLM never provides it.
const toolMap = {
  getOrderStatus:          (args, uid) => agentTools.getOrderStatus(args.orderId, uid),
  checkReturnEligibility:  (args, uid) => agentTools.checkReturnEligibility(args.orderId, uid),
  initiateRefund:          (args, uid) => agentTools.initiateRefund(args.orderId, args.reason, uid),
  getDeliveryEstimate:     (args, uid) => agentTools.getDeliveryEstimate(args.orderId, uid),
};

async function dispatchTool(name, args, uid) {
  const fn = toolMap[name];
  if (!fn) throw new Error(`Unknown tool: ${name}`);
  return fn(args, uid);
}

// ─── Order ID Extractor ────────────────────────────────────────────────────────
// Extracts a MongoDB ObjectId from the result of any order-related tool call.
// Used to maintain conversation-local lastOrderId context.
function extractOrderId(toolName, args, result) {
  // From args (most reliable — what the model passed in)
  if (args && args.orderId) return args.orderId;
  // From result if args somehow missing
  if (result && result.orderId) return result.orderId;
  return null;
}

// ─── Main Chat Handler ─────────────────────────────────────────────────────────
exports.chat = async (req, res) => {
  // Identity always comes from JWT middleware — NEVER from request body or LLM args
  const authenticatedUserId = req.user.id;
  const userMessage = req.body.message;

  // Conversation-local context: lastOrderId from the PREVIOUS turn
  // The frontend sends this back to us each request.
  // It is NEVER used for auth — only to help the LLM fill in missing orderId.
  const lastOrderId = req.body.lastOrderId || null;

  if (!userMessage || typeof userMessage !== 'string' || !userMessage.trim()) {
    return res.status(400).json({ success: false, message: 'Message is required' });
  }

  // Higher limit to support the eligibility → refund multi-step chain
  const MAX_TOOL_CALLS = 5;
  let toolCallCount = 0;
  let updatedLastOrderId = lastOrderId; // track for response

  // Build system instruction with context hint if we have a previous order
  const systemWithContext = lastOrderId
    ? `${SYSTEM_PROMPT}\n\nCONVERSATION CONTEXT: The user previously discussed order ID: ${lastOrderId}. If they refer to "it", "my order", or similar without specifying an order ID, use this order ID.`
    : SYSTEM_PROMPT;

  try {
    const model = genAI.getGenerativeModel({
      model: 'gemini-3.6-flash', // Current model as recommended by Google API
      systemInstruction: systemWithContext,
      tools: [{ functionDeclarations: toolDeclarations }],
    });

    // Mutable contents array — correct pattern for Gemini generateContent API
    const contents = [
      { role: 'user', parts: [{ text: userMessage }] },
    ];

    while (true) {
      if (toolCallCount >= MAX_TOOL_CALLS) {
        // Safety cap — never allow infinite loops
        return res.status(200).json({
          reply: "I've completed multiple steps for your request. If you need further help, please contact our support team directly.",
          lastOrderId: updatedLastOrderId,
        });
      }

      const result = await model.generateContent({ contents });
      const response = result.response;
      const candidate = response.candidates?.[0];

      if (!candidate) {
        return res.status(200).json({
          reply: 'I could not generate a response. Please try again.',
          lastOrderId: updatedLastOrderId,
        });
      }

      const parts = candidate.content?.parts || [];
      const functionCallPart = parts.find((p) => p.functionCall);
      const textPart = parts.find((p) => p.text);

      if (functionCallPart) {
        toolCallCount++;
        const { name, args } = functionCallPart.functionCall;

        // ── Validate tool name ───────────────────────────────────────────
        if (!toolMap[name]) {
          return res.status(200).json({
            reply: 'I encountered an issue processing your request. Please try again.',
            lastOrderId: updatedLastOrderId,
          });
        }

        let toolResult;
        let logStatus = 'SUCCESS';

        try {
          // authenticatedUserId is injected server-side — NEVER from LLM args
          toolResult = await dispatchTool(name, args, authenticatedUserId);

          if (toolResult.status === 'PENDING_APPROVAL') {
            logStatus = 'PENDING_APPROVAL';
          }
          if (toolResult.error) {
            logStatus = 'FAILED';
          }
        } catch (toolErr) {
          toolResult = { error: toolErr.message };
          logStatus = 'FAILED';
        }

        // ── Update conversation-local lastOrderId ────────────────────────
        // Extract from args (what the model sent) or result
        const extractedId = extractOrderId(name, args, toolResult);
        if (extractedId) {
          updatedLastOrderId = extractedId;
        }

        // ── Audit log ────────────────────────────────────────────────────
        await AgentActionLog.create({
          userId:          authenticatedUserId,
          action:          name,
          orderId:         args.orderId || updatedLastOrderId || null,
          params:          args, // never includes userId — it is not in tool schemas
          result:          toolResult,
          status:          logStatus,
          requiresApproval: name === 'initiateRefund',
        });

        // ── Append to contents for next generateContent call ─────────────
        // model turn: include ALL parts from the candidate (not just functionCall).
        // Thinking models (gemini-3.6-flash) require thought parts with thought_signature
        // to be echoed back — omitting them causes a 400 "missing thought_signature" error.
        contents.push({
          role: 'model',
          parts: candidate.content.parts, // all parts, including thought parts
        });
        // user turn: our tool result
        contents.push({
          role: 'user',
          parts: [{ functionResponse: { name, response: { output: toolResult } } }],
        });
        continue;
      }

      if (textPart) {
        // ── Final text response from model ───────────────────────────────
        return res.status(200).json({
          reply: textPart.text,
          lastOrderId: updatedLastOrderId,
        });
      }

      // Unexpected response shape
      return res.status(200).json({
        reply: 'I received an unexpected response. Please try again.',
        lastOrderId: updatedLastOrderId,
      });
    }
  } catch (err) {
    // Catches API errors, DB errors, network issues
    console.error('Agent chat error:', err);

    // Detect Gemini quota exhaustion → give user a clear, actionable message
    if (err.status === 429 || (err.message && err.message.includes('429'))) {
      return res.status(200).json({
        reply: '⚠️ The AI assistant is temporarily unavailable due to API rate limits. Please wait a few minutes and try again. If this persists, the daily quota may be exhausted — it resets at midnight Pacific Time.',
        lastOrderId: updatedLastOrderId,
      });
    }

    // All other errors — never expose stack traces to the user
    return res.status(200).json({
      reply: 'Something went wrong processing your request. Please try again or contact support.',
      lastOrderId: updatedLastOrderId,
    });
  }
};
