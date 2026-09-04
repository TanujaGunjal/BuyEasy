/**
 * policyEngine.js
 *
 * Deterministic return-eligibility rules for BuyEasy.
 *
 * IMPORTANT: Write and understand every line here yourself.
 * This is the function you must defend in the interview:
 *   "How do you know the AI made the right decision?"
 *   Answer: "The AI doesn't decide — this function does. It's deterministic,
 *            unit-tested independently, and I can prove it's correct without
 *            running the model at all."
 *
 * The LLM calls the tool; the tool calls this function; this function
 * returns a deterministic verdict. The LLM only narrates the result.
 */

const NON_RETURNABLE_CATEGORIES = ['Food'];
const RETURN_WINDOW_DAYS = 30;

/**
 * Evaluates whether an order is eligible for return.
 *
 * @param {Object|null} order - Mongoose Order document (must have orderItems populated)
 * @returns {{ eligible: boolean, reason: string, daysSinceDelivery?: number }}
 */
function checkReturnEligibility(order) {
  // Rule 0: order must exist
  if (!order) {
    return { eligible: false, reason: 'Order not found' };
  }

  // Rule 1: order must be in Delivered status
  if (order.orderStatus !== 'Delivered') {
    return {
      eligible: false,
      reason: `Order not yet delivered (current status: ${order.orderStatus})`,
    };
  }

  // Rule 2: deliveredAt must be present — do NOT fall back to updatedAt.
  // updatedAt changes for any field update (e.g. admin edits a note) and
  // would silently extend the return window for unrelated reasons.
  // This is a financial policy decision: missing data → manual review, not a guess.
  if (!order.deliveredAt) {
    return {
      eligible: false,
      reason: 'Delivery date unavailable; manual review required',
    };
  }

  // Rule 3: return window — 30 calendar days from deliveredAt
  const daysSinceDelivery =
    (Date.now() - new Date(order.deliveredAt).getTime()) / (1000 * 60 * 60 * 24);

  if (daysSinceDelivery > RETURN_WINDOW_DAYS) {
    return {
      eligible: false,
      reason: `Return window expired (${Math.floor(daysSinceDelivery)} days since delivery; limit is ${RETURN_WINDOW_DAYS} days)`,
      daysSinceDelivery: Math.floor(daysSinceDelivery),
    };
  }

  // Rule 4: non-returnable categories
  // orderItems stores { product, name, quantity, price, image }.
  // Category comes from the populated product document.
  const hasNonReturnableItem = order.orderItems.some((item) => {
    const category = item.product?.category || item.category;
    return NON_RETURNABLE_CATEGORIES.includes(category);
  });

  if (hasNonReturnableItem) {
    return {
      eligible: false,
      reason: `Order contains a non-returnable item (category: ${NON_RETURNABLE_CATEGORIES.join(', ')})`,
    };
  }

  // All checks passed
  return {
    eligible: true,
    reason: `Within ${RETURN_WINDOW_DAYS}-day return window and all items are eligible`,
    daysSinceDelivery: Math.floor(daysSinceDelivery),
  };
}

module.exports = {
  checkReturnEligibility,
  RETURN_WINDOW_DAYS,
  NON_RETURNABLE_CATEGORIES,
};
