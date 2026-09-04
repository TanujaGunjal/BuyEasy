const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const PendingApproval = require('../models/PendingApproval');
const AgentActionLog = require('../models/AgentActionLog');
const Payment = require('../models/Payment');
const { processRefund } = require('../services/refundService');

// All routes in this file require: authenticated + admin role
// This is a SEPARATE auth boundary from the user chat endpoint (/api/agent/chat)
// which only requires authentication.
router.use(protect);
router.use(authorize('admin'));

// ─── GET /api/admin/pending-approvals ─────────────────────────────────────────
router.get('/pending-approvals', async (req, res, next) => {
  try {
    const pending = await PendingApproval.find({ status: 'pending' })
      .populate('userId', 'name email')
      .sort('-createdAt');

    res.status(200).json({
      success: true,
      count: pending.length,
      data: pending,
    });
  } catch (err) {
    next(err);
  }
});

// ─── PUT /api/admin/pending-approvals/:id/approve ─────────────────────────────
router.put('/pending-approvals/:id/approve', async (req, res, next) => {
  try {
    const pendingApproval = await PendingApproval.findById(req.params.id);
    if (!pendingApproval) {
      return res
        .status(404)
        .json({ success: false, message: 'Pending approval not found' });
    }

    // Primary idempotency guard — checked BEFORE any Stripe/payment call.
    // Prevents double-click or concurrent requests from issuing two refunds.
    if (pendingApproval.status !== 'pending') {
      return res.status(409).json({
        success: false,
        message: `Already processed (status: ${pendingApproval.status})`,
      });
    }

    // Find the payment record for this order
    const payment = await Payment.findOne({ order: pendingApproval.orderId });
    if (!payment) {
      return res.status(404).json({
        success: false,
        message: 'Payment record not found for this order',
      });
    }

    // Execute the refund via the shared service.
    // refundService has belt-and-suspenders idempotency at the payment layer too.
    // If Stripe rejects the refund, processRefund throws and we do NOT update
    // the PendingApproval status — the admin can retry.
    let updatedPayment;
    try {
      updatedPayment = await processRefund(
        payment._id,
        pendingApproval.requestedAmount, // always from DB, never from LLM
        pendingApproval.reason
      );
    } catch (refundErr) {
      // Stripe failure: log it and return a clear error — do NOT mark as approved
      await AgentActionLog.create({
        userId: pendingApproval.userId,
        action: 'refundFailed',
        orderId: pendingApproval.orderId,
        params: { approvedBy: req.user.id },
        result: { error: refundErr.message },
        status: 'FAILED',
        approvedBy: req.user.id,
      });
      return res.status(502).json({
        success: false,
        message: `Refund failed: ${refundErr.message}`,
      });
    }

    // Update the pending approval record
    pendingApproval.status = 'approved';
    pendingApproval.processedBy = req.user.id;
    pendingApproval.processedAt = Date.now();
    await pendingApproval.save();

    // The approval itself is a logged audit event — not just the original request
    await AgentActionLog.create({
      userId: pendingApproval.userId,
      action: 'refundApproved',
      orderId: pendingApproval.orderId,
      params: { approvedBy: req.user.id },
      result: {
        amount: pendingApproval.requestedAmount,
        stripeRefundId: updatedPayment.refundTransactionId || null,
      },
      status: 'APPROVED',
      approvedBy: req.user.id,
    });

    res.status(200).json({
      success: true,
      message: 'Refund approved and processed successfully',
      stripeRefundId: updatedPayment.refundTransactionId || null,
    });
  } catch (err) {
    next(err);
  }
});

// ─── PUT /api/admin/pending-approvals/:id/reject ──────────────────────────────
router.put('/pending-approvals/:id/reject', async (req, res, next) => {
  try {
    const pendingApproval = await PendingApproval.findById(req.params.id);
    if (!pendingApproval) {
      return res
        .status(404)
        .json({ success: false, message: 'Pending approval not found' });
    }

    if (pendingApproval.status !== 'pending') {
      return res.status(409).json({
        success: false,
        message: `Already processed (status: ${pendingApproval.status})`,
      });
    }

    pendingApproval.status = 'rejected';
    pendingApproval.processedBy = req.user.id;
    pendingApproval.processedAt = Date.now();
    await pendingApproval.save();

    await AgentActionLog.create({
      userId: pendingApproval.userId,
      action: 'refundRejected',
      orderId: pendingApproval.orderId,
      params: { rejectedBy: req.user.id },
      result: { reason: req.body.reason || 'No reason provided' },
      status: 'REJECTED',
      approvedBy: req.user.id,
    });

    res.status(200).json({
      success: true,
      message: 'Refund request rejected',
    });
  } catch (err) {
    next(err);
  }
});

// ─── GET /api/admin/audit-log ─────────────────────────────────────────────────
router.get('/audit-log', async (req, res, next) => {
  try {
    const logs = await AgentActionLog.find()
      .populate('userId', 'name email')
      .populate('approvedBy', 'name email')
      .sort('-timestamp')
      .limit(200);

    res.status(200).json({
      success: true,
      count: logs.length,
      data: logs,
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
