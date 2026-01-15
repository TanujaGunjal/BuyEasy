const mongoose = require('mongoose');

const DeliverySchema = new mongoose.Schema({
  deliveryId: {
    type: String,
    required: true,
    unique: true,
  },
  order: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Order',
    required: true,
  },
  status: {
    type: String,
    required: true,
    enum: ['Pending', 'In Transit', 'Out for Delivery', 'Delivered', 'Failed'],
    default: 'Pending',
  },
  trackingNumber: {
    type: String,
    required: true,
    unique: true,
  },
  estimatedDate: {
    type: Date,
    required: true,
  },
  actualDeliveryDate: {
    type: Date,
  },
  carrier: {
    type: String,
    required: true,
    default: 'Standard Shipping',
  },
  shippingAddress: {
    street: {
      type: String,
      required: true,
    },
    city: {
      type: String,
      required: true,
    },
    state: {
      type: String,
      required: true,
    },
    zipCode: {
      type: String,
      required: true,
    },
    country: {
      type: String,
      required: true,
    },
    phone: {
      type: String,
      required: true,
    },
  },
  deliveryNotes: {
    type: String,
    maxlength: 500,
  },
  signature: {
    type: String,
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
DeliverySchema.methods.updateStatus = async function(newStatus) {
  this.status = newStatus;
  this.updatedAt = Date.now();
  if (newStatus === 'Delivered') {
    this.actualDeliveryDate = Date.now();
  }
  return await this.save();
};

DeliverySchema.methods.confirmDelivery = async function(signature) {
  this.status = 'Delivered';
  this.actualDeliveryDate = Date.now();
  this.signature = signature || 'Digital Signature';
  this.updatedAt = Date.now();
  return await this.save();
};

// Generate tracking number before saving
DeliverySchema.pre('save', function(next) {
  if (!this.trackingNumber) {
    this.trackingNumber = `TRK${Date.now()}${Math.floor(Math.random() * 1000)}`;
  }
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('Delivery', DeliverySchema);
