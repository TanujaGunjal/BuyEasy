const mongoose = require('mongoose');

const PendingApprovalSchema = new mongoose.Schema({
  orderId: {
    type: String,
    required: true,
  },
  // The user who submitted the refund request
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  action: {
    type: String,
    default: 'initiateRefund',
  },
  // Reason text from user — the ONLY thing that comes from the LLM
  reason: {
    type: String,
    required: true,
    maxlength: 1000,
  },
  // Computed server-side from order.totalPrice — NEVER from LLM output
  requestedAmount: {
    type: Number,
    required: true,
    min: 0,
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending',
  },
  // Link back to the initiating log entry
  actionLogId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'AgentActionLog',
    default: null,
  },
  // Admin who processed this approval
  processedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null,
  },
  processedAt: {
    type: Date,
    default: null,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model('PendingApproval', PendingApprovalSchema);
