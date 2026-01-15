const mongoose = require('mongoose');

const ProductSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Please add a product name'],
    trim: true,
    maxlength: [100, 'Name cannot be more than 100 characters'],
  },
  description: {
    type: String,
    required: [true, 'Please add a description'],
    maxlength: [2000, 'Description cannot be more than 2000 characters'],
  },
  price: {
    type: Number,
    required: [true, 'Please add a price'],
    min: [0, 'Price cannot be negative'],
  },
  comparePrice: {
    type: Number,
    default: 0,
  },
category: {
  type: String,
  enum: [
    'Electronics',
    'Clothing',
    'Sports',
    'Home & Furniture',
    'Home & Garden',
    'Accessories',
    'Books',
    'Food',
    'Hand Bags',
    'Other'
  ],
  required: true,
},


  brand: {
    type: String,
    required: [true, 'Please add a brand'],
  },
  stock: {
    type: Number,
    required: [true, 'Please add stock quantity'],
    min: [0, 'Stock cannot be negative'],
    default: 0,
  },
  images: [{
    url: {
      type: String,
      required: true,
    },
    alt: {
      type: String,
      default: 'Product image',
    },
  }],
  thumbnail: {
    type: String,
    default: 'default-product.jpg',
  },
  specifications: {
    type: Map,
    of: String,
  },
  tags: [String],
  rating: {
    type: Number,
    min: 0,
    max: 5,
    default: 0,
  },
  numReviews: {
    type: Number,
    default: 0,
  },
  isFeatured: {
    type: Boolean,
    default: false,
  },
  isActive: {
    type: Boolean,
    default: true,
  },
  discount: {
    type: Number,
    min: 0,
    max: 100,
    default: 0,
  },
  soldCount: {
    type: Number,
    default: 0,
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
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

// Update the updatedAt field on save
ProductSchema.pre('save', function (next) {
  this.updatedAt = Date.now();
  next();
});

// Create index for text search
ProductSchema.index({ name: 'text', description: 'text', tags: 'text' });

module.exports = mongoose.model('Product', ProductSchema);
