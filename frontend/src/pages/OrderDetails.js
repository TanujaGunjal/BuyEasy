import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import api from '../services/api';
import StripeCheckout from '../components/StripeCheckout';

const OrderDetails = () => {
  const { id } = useParams();
  const [order, setOrder] = useState(null);
  const [payment, setPayment] = useState(null);
  const [loading, setLoading] = useState(true);
  const [paid, setPaid] = useState(false);

  useEffect(() => {
    loadOrder();
  }, [id]);

  const loadOrder = async () => {
    try {
      const [orderRes, paymentRes] = await Promise.all([
        api.get(`/orders/${id}`),
        api.get(`/payments/order/${id}`).catch(() => null),
      ]);
      setOrder(orderRes.data.data);
      if (paymentRes) {
        setPayment(paymentRes.data.data);
      }
    } catch (error) {
      console.error('Error loading order:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePaymentSuccess = async () => {
    // Reload order to reflect paid status
    setPaid(true);
    await loadOrder();
  };

  if (loading) {
    return <div className="loading">Loading order...</div>;
  }

  if (!order) {
    return (
      <div className="container py-3">
        <div className="alert alert-danger">Order not found</div>
      </div>
    );
  }

  const isPaid = order.isPaid || paid;

  return (
    <div className="order-details-page py-3">
      <div className="container">
        <h1 className="mb-2">Order Details</h1>

        {isPaid && (
          <div className="alert alert-success" style={{ marginBottom: '16px' }}>
            ✅ Payment successful! Your order is confirmed.
          </div>
        )}

        <div className="order-info-grid">
          <div>
            <div className="card mb-2">
              <h3>Order Information</h3>
              <p><strong>Order ID:</strong> {order._id}</p>
              <p><strong>Date:</strong> {new Date(order.createdAt).toLocaleString()}</p>
              <p><strong>Status:</strong> <span className={`badge badge-${getStatusColor(order.orderStatus)}`}>{order.orderStatus}</span></p>
              <p><strong>Payment Method:</strong> {order.paymentMethod}</p>
              <p>
                <strong>Payment Status:</strong>{' '}
                <span className={`badge badge-${isPaid ? 'success' : 'warning'}`}>
                  {isPaid ? '✓ Paid' : 'Pending Payment'}
                </span>
                {payment?.transactionId && payment.transactionId.startsWith('pi_') && (
                  <span style={{ marginLeft: '8px', fontSize: '12px', color: '#6b7280' }}>
                    (Stripe: {payment.transactionId})
                  </span>
                )}
              </p>
              {payment?.refundTransactionId && (
                <p>
                  <strong>Refund ID:</strong>{' '}
                  <span style={{ fontSize: '12px', color: '#6b7280' }}>
                    {payment.refundTransactionId}
                  </span>
                </p>
              )}
            </div>

            <div className="card mb-2">
              <h3>Shipping Address</h3>
              <p>{order.shippingAddress.street}</p>
              <p>{order.shippingAddress.city}, {order.shippingAddress.state} {order.shippingAddress.zipCode}</p>
              <p>{order.shippingAddress.country}</p>
              <p><strong>Phone:</strong> {order.shippingAddress.phone}</p>
            </div>

            <div className="card">
              <h3>Order Items</h3>
              {order.orderItems.map((item, index) => (
                <div key={index} className="order-item">
                  <div>
                    <strong>{item.name}</strong>
                    <p>Quantity: {item.quantity}</p>
                  </div>
                  <div>
                    <strong>${(item.price * item.quantity).toFixed(2)}</strong>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div>
            <div className="card">
              <h3>Order Summary</h3>
              <div className="summary-row">
                <span>Items Price:</span>
                <span>${order.itemsPrice.toFixed(2)}</span>
              </div>
              <div className="summary-row">
                <span>Shipping:</span>
                <span>${order.shippingPrice.toFixed(2)}</span>
              </div>
              <div className="summary-row">
                <span>Tax:</span>
                <span>${order.taxPrice.toFixed(2)}</span>
              </div>
              <hr />
              <div className="summary-row total">
                <strong>Total:</strong>
                <strong>${order.totalPrice.toFixed(2)}</strong>
              </div>
            </div>

            {/* Show Stripe payment UI only if order is unpaid AND is Card payment method */}
            {!isPaid && order.paymentMethod === 'Card' && payment && (
              <StripeCheckout
                orderId={order._id}
                paymentId={payment._id}
                onSuccess={handlePaymentSuccess}
              />
            )}

            {/* For cash on delivery */}
            {!isPaid && order.paymentMethod === 'Cash on Delivery' && (
              <div className="card" style={{ marginTop: '20px', background: '#f0fdf4' }}>
                <p style={{ color: '#065f46', fontWeight: '600' }}>
                  💵 Payment on Delivery
                </p>
                <p style={{ fontSize: '14px', color: '#374151' }}>
                  Please have the exact amount ready when your order arrives.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      <style jsx>{`
        .order-info-grid {
          display: grid;
          grid-template-columns: 2fr 1fr;
          gap: 20px;
        }

        .order-item {
          display: flex;
          justify-content: space-between;
          padding: 15px 0;
          border-bottom: 1px solid var(--border-color);
        }

        .summary-row {
          display: flex;
          justify-content: space-between;
          margin-bottom: 15px;
        }

        .summary-row.total {
          font-size: 1.3rem;
          color: var(--primary-color);
        }

        .badge {
          padding: 5px 15px;
          border-radius: 20px;
          font-weight: 600;
        }

        .badge-warning { background-color: #FEF3C7; color: #92400E; }
        .badge-info { background-color: #DBEAFE; color: #1E40AF; }
        .badge-primary { background-color: #E0E7FF; color: #3730A3; }
        .badge-success { background-color: #D1FAE5; color: #065F46; }
        .badge-danger { background-color: #FEE2E2; color: #991B1B; }

        @media (max-width: 768px) {
          .order-info-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
};

const getStatusColor = (status) => {
  switch (status) {
    case 'Pending': return 'warning';
    case 'Processing': return 'info';
    case 'Shipped': return 'primary';
    case 'Delivered': return 'success';
    case 'Cancelled': return 'danger';
    default: return 'secondary';
  }
};

export default OrderDetails;
