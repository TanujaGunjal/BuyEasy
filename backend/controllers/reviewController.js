const Review = require('../models/Review');
const Product = require('../models/Product');

// @desc    Get reviews for a product
// @route   GET /api/products/:productId/reviews
// @access  Public
exports.getReviews = async (req, res, next) => {
  try {
    const reviews = await Review.find({ product: req.params.productId })
      .populate('user', 'name avatar')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: reviews.length,
      data: reviews,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Add review
// @route   POST /api/products/:productId/reviews
// @access  Private
exports.addReview = async (req, res, next) => {
  try {
    const { rating, title, comment } = req.body;

    // Check if product exists
    const product = await Product.findById(req.params.productId);
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found',
      });
    }

    // Check if user already reviewed
    const existingReview = await Review.findOne({
      product: req.params.productId,
      user: req.user.id,
    });

    if (existingReview) {
      return res.status(400).json({
        success: false,
        message: 'You have already reviewed this product',
      });
    }

    const review = await Review.create({
      product: req.params.productId,
      user: req.user.id,
      rating,
      title,
      comment,
    });

    // Update product rating
    const reviews = await Review.find({ product: req.params.productId });
    const avgRating = reviews.reduce((acc, item) => item.rating + acc, 0) / reviews.length;

    product.rating = avgRating;
    product.numReviews = reviews.length;
    await product.save();

    res.status(201).json({
      success: true,
      data: review,
    });
  } catch (error) {
    next(error);
  }
};
