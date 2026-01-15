const express = require('express');
const {
  createOrder,
  getOrderById,
  getMyOrders,
  getOrders,
  updateOrderToPaid,
  updateOrderStatus,
  cancelOrder,
} = require('../controllers/orderController');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

router.route('/')
  .post(protect, createOrder)
  .get(protect, authorize('admin'), getOrders);

router.get('/myorders', protect, getMyOrders);

router.route('/:id')
  .get(protect, getOrderById);

router.put('/:id/pay', protect, updateOrderToPaid);
router.put('/:id/status', protect, authorize('admin'), updateOrderStatus);
router.put('/:id/cancel', protect, cancelOrder);

module.exports = router;
