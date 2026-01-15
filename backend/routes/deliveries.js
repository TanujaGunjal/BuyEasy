const express = require('express');
const {
  createDelivery,
  getDeliveries,
  getDeliveryById,
  getDeliveryByOrder,
  updateDeliveryStatus,
  confirmDelivery,
  trackDelivery,
} = require('../controllers/deliveryController');

const router = express.Router();

const { protect, authorize } = require('../middleware/auth');

// Public routes
router.get('/track/:trackingNumber', trackDelivery);

// Protected routes
router.use(protect);

router.get('/order/:orderId', getDeliveryByOrder);
router.get('/:id', getDeliveryById);
router.put('/:id/confirm', confirmDelivery);

// Admin only routes
router.post('/', authorize('admin'), createDelivery);
router.get('/', authorize('admin'), getDeliveries);
router.put('/:id/status', authorize('admin'), updateDeliveryStatus);

module.exports = router;
