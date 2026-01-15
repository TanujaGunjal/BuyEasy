const mongoose = require('mongoose');

const ReviewSchema = new mongoose.Schema({
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true,
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  rating: {
    type: Number,
    required: [true, 'Please add a rating'],
    min: 1,
    max: 5,
  },
  title: {
    type: String,
    required: [true, 'Please add a review title'],
    maxlength: 100,
  },
  comment: {
    type: String,
    required: [true, 'Please add a comment'],
    maxlength: 1000,
  },
  images: [{
    type: String,
  }],
  helpful: {
    type: Number,
    default: 0,
  },
  verified: {
    type: Boolean,
    default: false,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

// Prevent user from submitting more than one review per product
ReviewSchema.index({ product: 1, user: 1 }, { unique: true });

module.exports = mongoose.model('Review', ReviewSchema);
