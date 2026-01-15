import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';

const Orders = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadOrders();
  }, []);

  const loadOrders = async () => {
    try {
      const response = await api.get('/orders/myorders');
      setOrders(response.data.data);
    } catch (error) {
      console.error('Error loading orders:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="loading">Loading orders...</div>;
  }

  return (
    <div className="orders-page py-3">
      <div className="container">
        <h1 className="mb-2">My Orders</h1>

        {orders.length === 0 ? (
          <div className="card text-center py-3">
            <h3>No orders yet</h3>
            <p>Start shopping to see your orders here</p>
            <Link to="/products" className="btn btn-primary mt-2">
              Browse Products
            </Link>
          </div>
        ) : (
          <div className="orders-list">
            {orders.map((order) => (
              <div key={order._id} className="card order-card">
                <div className="order-header">
                  <div>
                    <h3>Order #{order._id.slice(-8)}</h3>
                    <p>Placed on {new Date(order.createdAt).toLocaleDateString()}</p>
                  </div>
                  <div>
                    <span className={`badge badge-${getStatusColor(order.orderStatus)}`}>
                      {order.orderStatus}
                    </span>
                  </div>
                </div>
                <div className="order-items">
                  {order.orderItems.map((item, index) => (
                    <div key={index} className="order-item">
                      <span>{item.name} x {item.quantity}</span>
                      <span>${(item.price * item.quantity).toFixed(2)}</span>
                    </div>
                  ))}
                </div>
                <div className="order-footer">
                  <div className="order-total">
                    <strong>Total: ${order.totalPrice.toFixed(2)}</strong>
                  </div>
                  <Link to={`/orders/${order._id}`} className="btn btn-primary btn-sm">
                    View Details
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <style jsx>{`
        .order-card {
          margin-bottom: 20px;
        }

        .order-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 15px;
          padding-bottom: 15px;
          border-bottom: 1px solid var(--border-color);
        }

        .order-items {
          margin-bottom: 15px;
        }

        .order-item {
          display: flex;
          justify-content: space-between;
          padding: 8px 0;
        }

        .order-footer {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding-top: 15px;
          border-top: 1px solid var(--border-color);
        }

        .order-total {
          font-size: 1.2rem;
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

export default Orders;
