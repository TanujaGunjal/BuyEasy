const mongoose = require('mongoose');

const AgentActionLogSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  action: {
    type: String,
    required: true,
    enum: [
      'getOrderStatus',
      'checkReturnEligibility',
      'initiateRefund',
      'getDeliveryEstimate',
      'refundApproved',
      'refundRejected',
    ],
  },
  // String not ObjectId — the order may not exist (bad user input)
  orderId: {
    type: String,
    default: null,
  },
  // Tool input params — userId is NEVER stored here
  params: {
    type: mongoose.Schema.Types.Mixed,
    default: {},
  },
  // Shaped tool output — never the raw Mongoose document
  result: {
    type: mongoose.Schema.Types.Mixed,
    default: {},
  },
  status: {
    type: String,
    required: true,
    enum: ['SUCCESS', 'FAILED', 'PENDING_APPROVAL', 'APPROVED', 'REJECTED'],
    default: 'SUCCESS',
  },
  requiresApproval: {
    type: Boolean,
    default: false,
  },
  // Admin who approved or rejected — null for standard tool calls
  approvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null,
  },
  timestamp: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model('AgentActionLog', AgentActionLogSchema);
