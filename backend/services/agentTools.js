/**
 * agentTools.js
 *
 * The 4 tools the Gemini agent can call. Each function:
 *   1. Enforces ownership via Order.findOne({ _id, user: authenticatedUserId })
 *      — the LLM NEVER determines who can access what.
 *   2. Returns a small, shaped object — never a raw Mongoose document.
 *   3. Accepts authenticatedUserId as a server-side parameter injected by
 *      agentController from req.user.id. It is never in the Gemini tool schema.
 */
const Order = require('../models/Order');
const Delivery = require('../models/Delivery');
const PendingApproval = require('../models/PendingApproval');
const { checkReturnEligibility } = require('./policyEngine');

// ─── Tool 1: getOrderStatus ───────────────────────────────────────────────────

/**
 * Returns current status, payment, and delivery info for an order.
 * Ownership is enforced at the DB query level.
 *
 * @param {string} orderId
 * @param {string} authenticatedUserId  — from req.user.id, never from LLM args
 */
async function getOrderStatus(orderId, authenticatedUserId) {
  // Ownership enforced in the query itself — not in a separate check.
  // If the order exists but belongs to another user, this returns null
  // and we return the same "not found" response. We do not distinguish
  // 404 from 403 to avoid leaking the existence of other users' orders.
  const order = await Order.findOne({
    _id: orderId,
    user: authenticatedUserId,
  });

  if (!order) {
    return { error: 'Order not found or not accessible', orderId };
  }

  // Return a shaped object — never the full Mongoose document
  return {
    orderId: order._id.toString(),
    status: order.orderStatus,
    isPaid: order.isPaid,
    paidAt: order.paidAt || null,
    isDelivered: order.isDelivered,
    deliveredAt: order.deliveredAt || null,
    trackingNumber: order.trackingNumber || null,
    itemCount: order.orderItems.length,
    totalPrice: order.totalPrice,
    createdAt: order.createdAt,
  };
}

// ─── Tool 2: checkReturnEligibility ──────────────────────────────────────────

/**
 * Checks whether an order is eligible for return using the deterministic
 * policy engine. The LLM never decides eligibility — it only narrates
 * the result this function returns.
 *
 * @param {string} orderId
 * @param {string} authenticatedUserId
 */
async function checkReturnEligibilityTool(orderId, authenticatedUserId) {
  // Populate orderItems.product so the policy engine can read product.category
  const order = await Order.findOne({
    _id: orderId,
    user: authenticatedUserId,
  }).populate('orderItems.product', 'category name');

  if (!order) {
    return { error: 'Order not found or not accessible', orderId };
  }

  const result = checkReturnEligibility(order);

  return {
    orderId: order._id.toString(),
    eligible: result.eligible,
    reason: result.reason,
    ...(result.daysSinceDelivery !== undefined && {
      daysSinceDelivery: result.daysSinceDelivery,
    }),
  };
}

// ─── Tool 3: initiateRefund ───────────────────────────────────────────────────

/**
 * Validates eligibility, then creates a PendingApproval record.
 * Does NOT call Stripe or execute the refund directly — that happens
 * only after a human admin approves via the admin UI.
 *
 * The refund amount is taken from order.totalPrice (trusted DB state).
 * The LLM only supplies the reason string.
 *
 * @param {string} orderId
 * @param {string} reason   — reason text from the user (model passes this through)
 * @param {string} authenticatedUserId
 */
async function initiateRefund(orderId, reason, authenticatedUserId) {
  const order = await Order.findOne({
    _id: orderId,
    user: authenticatedUserId,
  }).populate('orderItems.product', 'category name');

  if (!order) {
    return { error: 'Order not found or not accessible', orderId };
  }

  // Step 1: policy check — eligibility decides, not the LLM
  const eligibility = checkReturnEligibility(order);
  if (!eligibility.eligible) {
    return {
      status: 'REJECTED_BY_POLICY',
      orderId,
      reason: eligibility.reason,
    };
  }

  // Step 2: duplicate guard — don't create two pending records for the same order
  const existing = await PendingApproval.findOne({
    orderId: orderId.toString(),
    status: 'pending',
  });
  if (existing) {
    return {
      status: 'ALREADY_PENDING',
      orderId,
      message: 'A refund request for this order is already awaiting approval.',
    };
  }

  // Step 3: compute refund amount from DB — never from LLM output
  const refundAmount = order.totalPrice;

  // Step 4: create the pending record — this is all that happens here
  const pendingApproval = await PendingApproval.create({
    orderId: orderId.toString(),
    userId: authenticatedUserId,
    reason,
    requestedAmount: refundAmount,
  });

  return {
    status: 'PENDING_APPROVAL',
    orderId,
    amount: refundAmount,
    pendingApprovalId: pendingApproval._id.toString(),
    message:
      'Your refund request has been submitted for admin review. You will be notified once it is processed.',
  };
}

// ─── Tool 4: getDeliveryEstimate ──────────────────────────────────────────────

/**
 * Returns delivery status, estimated date, tracking number, and carrier.
 * Falls back to order-level data if no Delivery record exists yet.
 *
 * @param {string} orderId
 * @param {string} authenticatedUserId
 */
async function getDeliveryEstimate(orderId, authenticatedUserId) {
  const order = await Order.findOne({
    _id: orderId,
    user: authenticatedUserId,
  });

  if (!order) {
    return { error: 'Order not found or not accessible', orderId };
  }

  const delivery = await Delivery.findOne({ order: orderId });

  if (delivery) {
    return {
      orderId,
      deliveryStatus: delivery.status,
      trackingNumber: delivery.trackingNumber || null,
      estimatedDate: delivery.estimatedDate || null,
      actualDeliveryDate: delivery.actualDeliveryDate || null,
      carrier: delivery.carrier || null,
    };
  }

  // No Delivery record yet — return what the Order model knows
  return {
    orderId,
    deliveryStatus: order.orderStatus,
    trackingNumber: order.trackingNumber || null,
    estimatedDate: null,
    actualDeliveryDate: order.deliveredAt || null,
    note: 'No carrier tracking record has been created yet.',
  };
}

module.exports = {
  getOrderStatus,
  checkReturnEligibility: checkReturnEligibilityTool,
  initiateRefund,
  getDeliveryEstimate,
};
