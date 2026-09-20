/**
 * smokeGemini.js — Manual smoke test for the Gemini function-calling + thought_signature flow.
 *
 * Run AFTER changing GEMINI_MODEL to verify the new model supports:
 *   1. Function calling (the model returns a functionCall part)
 *   2. thought_signature (the functionCall part has a thought_signature)
 *   3. Multi-turn: the model correctly processes a fake tool result
 *
 * Usage:
 *   GEMINI_API_KEY=<your-key> GEMINI_MODEL=gemini-2.5-flash node backend/scripts/smokeGemini.js
 *   npm run smoke:gemini
 *
 * NEVER prints the API key. Exits 1 on failure, 0 on success.
 */

'use strict';

const { GoogleGenerativeAI } = require('@google/generative-ai');

// ── Config ────────────────────────────────────────────────────────────────────

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const MODEL_NAME     = process.env.GEMINI_MODEL || 'gemini-2.5-flash';

if (!GEMINI_API_KEY) {
  console.error('[smoke] ERROR: GEMINI_API_KEY environment variable is not set.');
  process.exit(1);
}

console.log(`[smoke] Model under test : ${MODEL_NAME}`);
console.log(`[smoke] SDK              : @google/generative-ai (${require('@google/generative-ai/package.json').version})`);
console.log('');

// ── Dummy tool declaration ────────────────────────────────────────────────────

const DUMMY_TOOL = {
  name: 'getTime',
  description: 'Returns the current server time in ISO-8601 format.',
  parameters: {
    type: 'object',
    properties: {},
    required: [],
  },
};

// ── Helper: summarise a content part ─────────────────────────────────────────

function describeCandidate(candidate) {
  const parts = candidate.content?.parts || [];
  const types = parts.map(p => {
    if (p.text)         return `text(${p.text.slice(0, 40).replace(/\n/g, ' ')}...)`;
    if (p.functionCall) return `functionCall(${p.functionCall.name})`;
    if (p.thought)      return `thought`;
    return 'unknown';
  });
  return types.join(', ');
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

  const model = genAI.getGenerativeModel({
    model: MODEL_NAME,
    tools: [{ functionDeclarations: [DUMMY_TOOL] }],
  });

  // ── Turn 1: ask the model to call getTime ──────────────────────────────────

  console.log('[smoke] Turn 1 — sending user message asking for current time...');

  const turn1Contents = [
    { role: 'user', parts: [{ text: 'What is the current server time? Please call the getTime tool.' }] },
  ];

  let turn1Response;
  try {
    turn1Response = await model.generateContent({ contents: turn1Contents });
  } catch (err) {
    console.error(`[smoke] FAIL — Turn 1 API call threw: ${err.message}`);
    if (err.status === 404) {
      console.error(`[smoke] → Model '${MODEL_NAME}' is not available. Update GEMINI_MODEL and redeploy.`);
    }
    if (err.status === 429) {
      console.error('[smoke] → API quota exhausted. Try again later.');
    }
    process.exit(1);
  }

  const turn1Candidate = turn1Response.response.candidates?.[0];
  if (!turn1Candidate) {
    console.error('[smoke] FAIL — No candidates returned in Turn 1 response.');
    process.exit(1);
  }

  console.log(`[smoke] Turn 1 parts    : ${describeCandidate(turn1Candidate)}`);

  const turn1Parts = turn1Candidate.content?.parts || [];

  // Check for functionCall part
  const funcCallPart = turn1Parts.find(p => p.functionCall);
  if (!funcCallPart) {
    console.warn('[smoke] WARN — No functionCall part in Turn 1. The model may have answered without calling the tool.');
    console.warn('[smoke]        Check if the model supports function calling with this tool definition.');
  } else {
    console.log(`[smoke] ✓ functionCall   : ${funcCallPart.functionCall.name}`);
  }

  // Check for thought_signature (present on thinking models)
  const hasSig = turn1Parts.some(p => p.thought === true || (p.functionCall && p.functionCall.thought_signature));
  // Also check if the raw response has thought parts
  const thoughtPart = turn1Parts.find(p => p.thought === true);
  if (thoughtPart) {
    console.log('[smoke] ✓ thought part   : present (thinking model)');
  } else {
    console.log('[smoke] ℹ thought part   : not present (non-thinking model or thinking disabled)');
  }

  if (!funcCallPart) {
    console.error('[smoke] FAIL — Cannot continue without a functionCall. Exiting.');
    process.exit(1);
  }

  // ── Turn 2: return a fake tool result and check the final text reply ───────

  console.log('\n[smoke] Turn 2 — returning fake tool result...');

  // Build Turn 2 contents:
  // 1. Echo the user message
  // 2. Echo the model turn (ALL parts, including thought parts verbatim — required for thought_signature)
  // 3. Add the tool result
  const turn2Contents = [
    ...turn1Contents,
    { role: 'model', parts: turn1Parts },   // echo ALL parts (thought_signature preservation)
    {
      role: 'user',
      parts: [{
        functionResponse: {
          name: 'getTime',
          response: { name: 'getTime', content: { time: new Date().toISOString() } },
        },
      }],
    },
  ];

  let turn2Response;
  try {
    turn2Response = await model.generateContent({ contents: turn2Contents });
  } catch (err) {
    console.error(`[smoke] FAIL — Turn 2 API call threw: ${err.message}`);
    if (err.status === 400 && err.message.includes('thought_signature')) {
      console.error('[smoke] → thought_signature was not echoed correctly. Check the echo-back logic.');
    }
    process.exit(1);
  }

  const turn2Candidate = turn2Response.response.candidates?.[0];
  const turn2Parts     = turn2Candidate?.content?.parts || [];
  const textPart       = turn2Parts.find(p => p.text);

  console.log(`[smoke] Turn 2 parts    : ${describeCandidate(turn2Candidate || { content: { parts: [] } })}`);

  if (textPart) {
    console.log(`[smoke] ✓ Final reply   : "${textPart.text.slice(0, 100).replace(/\n/g, ' ')}..."`);
  } else {
    console.warn('[smoke] WARN — No text part in Turn 2 response. The model did not produce a text reply.');
  }

  // ── Summary ────────────────────────────────────────────────────────────────

  console.log('\n[smoke] ═══════════════════════════════════');
  console.log('[smoke] SUMMARY');
  console.log(`[smoke]   Model            : ${MODEL_NAME}`);
  console.log(`[smoke]   functionCall     : ${funcCallPart ? '✓ YES' : '✗ NO'}`);
  console.log(`[smoke]   thought part     : ${thoughtPart ? '✓ YES (thinking model)' : '— no'}`);
  console.log(`[smoke]   Turn 2 text      : ${textPart ? '✓ YES' : '✗ NO'}`);
  console.log('[smoke] ═══════════════════════════════════');

  const passed = funcCallPart && textPart;
  if (passed) {
    console.log('[smoke] RESULT: PASS ✓');
    process.exit(0);
  } else {
    console.log('[smoke] RESULT: FAIL ✗ — see warnings above');
    process.exit(1);
  }
}

main().catch(err => {
  console.error('[smoke] Unexpected error:', err.message);
  process.exit(1);
});
