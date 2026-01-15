import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import api from '../services/api';

const OrderDetails = () => {
  const { id } = useParams();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadOrder();
  }, [id]);

  const loadOrder = async () => {
    try {
      const response = await api.get(`/orders/${id}`);
      setOrder(response.data.data);
    } catch (error) {
      console.error('Error loading order:', error);
    } finally {
      setLoading(false);
    }
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

  return (
    <div className="order-details-page py-3">
      <div className="container">
        <h1 className="mb-2">Order Details</h1>

        <div className="order-info-grid">
          <div>
            <div className="card mb-2">
              <h3>Order Information</h3>
              <p><strong>Order ID:</strong> {order._id}</p>
              <p><strong>Date:</strong> {new Date(order.createdAt).toLocaleString()}</p>
              <p><strong>Status:</strong> <span className={`badge badge-${getStatusColor(order.orderStatus)}`}>{order.orderStatus}</span></p>
              <p><strong>Payment Method:</strong> {order.paymentMethod}</p>
              <p><strong>Payment Status:</strong> {order.isPaid ? 'Paid' : 'Pending'}</p>
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
    case 'Pending':
      return 'warning';
    case 'Processing':
      return 'info';
    case 'Shipped':
      return 'primary';
    case 'Delivered':
      return 'success';
    case 'Cancelled':
      return 'danger';
    default:
      return 'secondary';
  }
};

export default OrderDetails;
