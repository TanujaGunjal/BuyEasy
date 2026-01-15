const express = require('express');
const {
  getProducts,
  getProduct,
  createProduct,
  updateProduct,
  deleteProduct,
  getCategories,
  getBrands,
} = require('../controllers/productController');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

// Review routes
const reviewRouter = require('./reviews');
router.use('/:productId/reviews', reviewRouter);

router.route('/')
  .get(getProducts)
  .post(protect, authorize('admin'), createProduct);

router.get('/categories', getCategories);
router.get('/brands', getBrands);

router.route('/:id')
  .get(getProduct)
  .put(protect, authorize('admin'), updateProduct)
  .delete(protect, authorize('admin'), deleteProduct);

module.exports = router;
