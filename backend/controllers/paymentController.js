const Payment = require('../models/Payment');
const Order = require('../models/Order');

// @desc    Create new payment
// @route   POST /api/payments
// @access  Private
exports.createPayment = async (req, res, next) => {
  try {
    const { orderId, amount, paymentMethod, cardDetails } = req.body;

    // Check if order exists
    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found',
      });
    }

    // Check if payment already exists for this order
    const existingPayment = await Payment.findOne({ order: orderId });
    if (existingPayment) {
      return res.status(400).json({
        success: false,
        message: 'Payment already exists for this order',
      });
    }

    // Verify amount matches order total
    if (amount !== order.totalPrice) {
      return res.status(400).json({
        success: false,
        message: 'Payment amount does not match order total',
      });
    }

    const payment = await Payment.create({
      paymentId: `PAY${Date.now()}`,
      order: orderId,
      amount,
      paymentMethod,
      cardDetails,
    });

    res.status(201).json({
      success: true,
      data: payment,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Process payment
// @route   POST /api/payments/:id/process
// @access  Private
exports.processPayment = async (req, res, next) => {
  try {
    const payment = await Payment.findById(req.params.id);

    if (!payment) {
      return res.status(404).json({
        success: false,
        message: 'Payment not found',
      });
    }

    if (payment.status === 'Completed') {
      return res.status(400).json({
        success: false,
        message: 'Payment already processed',
      });
    }

    await payment.processPayment();

    // Update order payment status
    const order = await Order.findById(payment.order);
    order.isPaid = true;
    order.paidAt = Date.now();
    order.paymentResult = {
      id: payment.transactionId,
      status: payment.status,
      updateTime: payment.updatedAt,
    };
    await order.save();

    res.status(200).json({
      success: true,
      data: payment,
      message: 'Payment processed successfully',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Get all payments
// @route   GET /api/payments
// @access  Private/Admin
exports.getPayments = async (req, res, next) => {
  try {
    const payments = await Payment.find()
      .populate({
        path: 'order',
        populate: { path: 'user' },
      })
      .sort('-createdAt');

    res.status(200).json({
      success: true,
      count: payments.length,
      data: payments,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Get payment by ID
// @route   GET /api/payments/:id
// @access  Private
exports.getPaymentById = async (req, res, next) => {
  try {
    const payment = await Payment.findById(req.params.id)
      .populate({
        path: 'order',
        populate: { path: 'user' },
      });

    if (!payment) {
      return res.status(404).json({
        success: false,
        message: 'Payment not found',
      });
    }

    res.status(200).json({
      success: true,
      data: payment,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Get payment by order ID
// @route   GET /api/payments/order/:orderId
// @access  Private
exports.getPaymentByOrder = async (req, res, next) => {
  try {
    const payment = await Payment.findOne({ order: req.params.orderId })
      .populate('order');

    if (!payment) {
      return res.status(404).json({
        success: false,
        message: 'Payment not found for this order',
      });
    }

    res.status(200).json({
      success: true,
      data: payment,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Refund payment
// @route   POST /api/payments/:id/refund
// @access  Private/Admin
exports.refundPayment = async (req, res, next) => {
  try {
    const { amount, reason } = req.body;

    const payment = await Payment.findById(req.params.id);

    if (!payment) {
      return res.status(404).json({
        success: false,
        message: 'Payment not found',
      });
    }

    await payment.refund(amount, reason);

    // Update order status
    const order = await Order.findById(payment.order);
    order.orderStatus = 'Cancelled';
    await order.save();

    res.status(200).json({
      success: true,
      data: payment,
      message: 'Payment refunded successfully',
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Get my payments (user's payments)
// @route   GET /api/payments/my
// @access  Private
exports.getMyPayments = async (req, res, next) => {
  try {
    const orders = await Order.find({ user: req.user.id });
    const orderIds = orders.map(order => order._id);

    const payments = await Payment.find({ order: { $in: orderIds } })
      .populate('order')
      .sort('-createdAt');

    res.status(200).json({
      success: true,
      count: payments.length,
      data: payments,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
