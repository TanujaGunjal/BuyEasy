const express = require('express');
const {
  createPayment,
  processPayment,
  getPayments,
  getPaymentById,
  getPaymentByOrder,
  refundPayment,
  getMyPayments,
} = require('../controllers/paymentController');

const router = express.Router();

const { protect, authorize } = require('../middleware/auth');

// All routes are protected
router.use(protect);

router.post('/', createPayment);
router.post('/:id/process', processPayment);
router.get('/my', getMyPayments);
router.get('/order/:orderId', getPaymentByOrder);
router.get('/:id', getPaymentById);

// Admin only routes
router.get('/', authorize('admin'), getPayments);
router.post('/:id/refund', authorize('admin'), refundPayment);

module.exports = router;
