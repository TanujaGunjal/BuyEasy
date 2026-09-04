/**
 * refundService.js
 *
 * Single source of truth for executing a payment refund.
 *
 * Both the existing manual admin route (POST /api/payments/:id/refund)
 * and the new agent-approval route (PUT /api/admin/pending-approvals/:id/approve)
 * call this function — one implementation, no duplication.
 *
 * In production: replace the TODO comment with your Stripe refund call.
 */
const Payment = require('../models/Payment');

/**
 * Processes a refund for a given payment record.
 *
 * @param {string} paymentId - MongoDB _id of the Payment document
 * @param {number} amount    - Refund amount (always from DB, never from LLM)
 * @param {string} reason    - Human-readable refund reason
 * @returns {Promise<Payment>} - Updated payment document
 */
async function processRefund(paymentId, amount, reason) {
  const payment = await Payment.findById(paymentId);
  if (!payment) {
    throw new Error('Payment not found');
  }

  // Belt-and-suspenders idempotency at the payment layer.
  // The PendingApproval status check is the primary guard;
  // this is the secondary in case of concurrent requests.
  if (payment.status === 'Refunded') {
    return payment;
  }

  // Only attempt Stripe refund if there is a valid Stripe PaymentIntent ID
  if (payment.transactionId && payment.transactionId.startsWith('pi_')) {
    const stripe = require('./stripe');
    if (!stripe) {
      throw new Error('Stripe is not configured on the server');
    }
    
    try {
      const refund = await stripe.refunds.create({
        payment_intent: payment.transactionId,
        amount: Math.round(amount * 100), // Stripe uses cents
      });
      payment.refundTransactionId = refund.id; // Store re_...
    } catch (error) {
      // If Stripe rejects/fails the refund, we throw and abort the DB update
      throw new Error(`Stripe refund failed: ${error.message}`);
    }
  }

  payment.status = 'Refunded';
  payment.refundAmount = amount;
  payment.refundDate = Date.now();
  payment.refundReason = reason;
  await payment.save();

  return payment;
}

module.exports = { processRefund };
