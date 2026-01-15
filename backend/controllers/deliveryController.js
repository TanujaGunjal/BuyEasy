const Delivery = require('../models/Delivery');
const Order = require('../models/Order');

// @desc    Create new delivery
// @route   POST /api/deliveries
// @access  Private/Admin
exports.createDelivery = async (req, res, next) => {
  try {
    const { orderId, estimatedDate, carrier, shippingAddress } = req.body;

    // Check if order exists
    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found',
      });
    }

    // Check if delivery already exists for this order
    const existingDelivery = await Delivery.findOne({ order: orderId });
    if (existingDelivery) {
      return res.status(400).json({
        success: false,
        message: 'Delivery already exists for this order',
      });
    }

    const delivery = await Delivery.create({
      deliveryId: `DEL${Date.now()}`,
      order: orderId,
      estimatedDate,
      carrier: carrier || 'Standard Shipping',
      shippingAddress: shippingAddress || order.shippingAddress,
    });

    res.status(201).json({
      success: true,
      data: delivery,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Get all deliveries
// @route   GET /api/deliveries
// @access  Private/Admin
exports.getDeliveries = async (req, res, next) => {
  try {
    const deliveries = await Delivery.find()
      .populate('order')
      .sort('-createdAt');

    res.status(200).json({
      success: true,
      count: deliveries.length,
      data: deliveries,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Get delivery by ID
// @route   GET /api/deliveries/:id
// @access  Private
exports.getDeliveryById = async (req, res, next) => {
  try {
    const delivery = await Delivery.findById(req.params.id)
      .populate({
        path: 'order',
        populate: { path: 'user' },
      });

    if (!delivery) {
      return res.status(404).json({
        success: false,
        message: 'Delivery not found',
      });
    }

    res.status(200).json({
      success: true,
      data: delivery,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Get delivery by order ID
// @route   GET /api/deliveries/order/:orderId
// @access  Private
exports.getDeliveryByOrder = async (req, res, next) => {
  try {
    const delivery = await Delivery.findOne({ order: req.params.orderId })
      .populate('order');

    if (!delivery) {
      return res.status(404).json({
        success: false,
        message: 'Delivery not found for this order',
      });
    }

    res.status(200).json({
      success: true,
      data: delivery,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Update delivery status
// @route   PUT /api/deliveries/:id/status
// @access  Private/Admin
exports.updateDeliveryStatus = async (req, res, next) => {
  try {
    const { status } = req.body;

    const delivery = await Delivery.findById(req.params.id);

    if (!delivery) {
      return res.status(404).json({
        success: false,
        message: 'Delivery not found',
      });
    }

    await delivery.updateStatus(status);

    // Update order status based on delivery status
    if (status === 'Delivered') {
      const order = await Order.findById(delivery.order);
      order.isDelivered = true;
      order.deliveredAt = Date.now();
      order.orderStatus = 'Delivered';
      await order.save();
    }

    res.status(200).json({
      success: true,
      data: delivery,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Confirm delivery
// @route   PUT /api/deliveries/:id/confirm
// @access  Private
exports.confirmDelivery = async (req, res, next) => {
  try {
    const { signature } = req.body;

    const delivery = await Delivery.findById(req.params.id);

    if (!delivery) {
      return res.status(404).json({
        success: false,
        message: 'Delivery not found',
      });
    }

    await delivery.confirmDelivery(signature);

    // Update order
    const order = await Order.findById(delivery.order);
    order.isDelivered = true;
    order.deliveredAt = Date.now();
    order.orderStatus = 'Delivered';
    await order.save();

    res.status(200).json({
      success: true,
      data: delivery,
      message: 'Delivery confirmed successfully',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Track delivery by tracking number
// @route   GET /api/deliveries/track/:trackingNumber
// @access  Public
exports.trackDelivery = async (req, res, next) => {
  try {
    const delivery = await Delivery.findOne({ 
      trackingNumber: req.params.trackingNumber 
    }).populate('order');

    if (!delivery) {
      return res.status(404).json({
        success: false,
        message: 'Delivery not found with this tracking number',
      });
    }

    res.status(200).json({
      success: true,
      data: {
        trackingNumber: delivery.trackingNumber,
        status: delivery.status,
        estimatedDate: delivery.estimatedDate,
        actualDeliveryDate: delivery.actualDeliveryDate,
        carrier: delivery.carrier,
        shippingAddress: delivery.shippingAddress,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
