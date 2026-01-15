const mongoose = require('mongoose');

const PaymentSchema = new mongoose.Schema({
  paymentId: {
    type: String,
    required: true,
    unique: true,
  },
  order: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Order',
    required: true,
  },
  amount: {
    type: Number,
    required: true,
    min: 0,
  },
  paymentDate: {
    type: Date,
    default: Date.now,
  },
  paymentMethod: {
    type: String,
    required: true,
    enum: ['Credit Card', 'Debit Card', 'PayPal', 'Cash on Delivery', 'UPI', 'Net Banking'],
    default: 'Credit Card',
  },
  status: {
    type: String,
    required: true,
    enum: ['Pending', 'Processing', 'Completed', 'Failed', 'Refunded'],
    default: 'Pending',
  },
  transactionId: {
    type: String,
    unique: true,
    sparse: true,
  },
  cardDetails: {
    last4Digits: {
      type: String,
      maxlength: 4,
    },
    cardType: {
      type: String,
      enum: ['Visa', 'Mastercard', 'American Express', 'Discover', 'Other'],
    },
    expiryMonth: {
      type: Number,
      min: 1,
      max: 12,
    },
    expiryYear: {
      type: Number,
    },
  },
  gatewayResponse: {
    type: Map,
    of: String,
  },
  refundAmount: {
    type: Number,
    default: 0,
    min: 0,
  },
  refundDate: {
    type: Date,
  },
  refundReason: {
    type: String,
    maxlength: 500,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

// Methods matching class diagram
PaymentSchema.methods.processPayment = async function() {
  this.status = 'Processing';
  this.updatedAt = Date.now();
  
  // Simulate payment processing
  try {
    // In production, integrate with actual payment gateway
    this.transactionId = `TXN${Date.now()}${Math.floor(Math.random() * 10000)}`;
    this.status = 'Completed';
    this.paymentDate = Date.now();
    return await this.save();
  } catch (error) {
    this.status = 'Failed';
    await this.save();
    throw error;
  }
};

PaymentSchema.methods.refund = async function(amount, reason) {
  if (this.status !== 'Completed') {
    throw new Error('Can only refund completed payments');
  }
  
  if (amount > this.amount) {
    throw new Error('Refund amount cannot exceed payment amount');
  }
  
  this.refundAmount = amount || this.amount;
  this.refundDate = Date.now();
  this.refundReason = reason;
  this.status = 'Refunded';
  this.updatedAt = Date.now();
  
  return await this.save();
};

// Generate payment ID before saving
PaymentSchema.pre('save', function(next) {
  if (!this.paymentId) {
    this.paymentId = `PAY${Date.now()}${Math.floor(Math.random() * 1000)}`;
  }
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('Payment', PaymentSchema);
