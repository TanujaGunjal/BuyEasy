import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';

const Checkout = () => {
  const { cart } = useCart();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [shippingInfo, setShippingInfo] = useState({
    street: user?.address?.street || '',
    city: user?.address?.city || '',
    state: user?.address?.state || '',
    zipCode: user?.address?.zipCode || '',
    country: user?.address?.country || '',
    phone: user?.phone || '',
  });

  const [paymentMethod, setPaymentMethod] = useState('Card');

  const subtotal = cart.totalPrice;
  const shippingPrice = subtotal > 50 ? 0 : 9.99;
  const taxPrice = subtotal * 0.1;
  const totalPrice = subtotal + shippingPrice + taxPrice;

  const handleChange = (e) => {
    setShippingInfo({ ...shippingInfo, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const orderData = {
        orderItems: cart.items.map(item => ({
          product: item.product._id,
          name: item.product.name,
          quantity: item.quantity,
          price: item.price,
          image: item.product.thumbnail,
        })),
        shippingAddress: shippingInfo,
        paymentMethod,
        itemsPrice: subtotal,
        taxPrice,
        shippingPrice,
        totalPrice,
      };

      const response = await api.post('/orders', orderData);
      navigate(`/orders/${response.data.data._id}`);
    } catch (err) {
      setError(err.response?.data?.message || 'Order failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="checkout-page py-3">
      <div className="container">
        <h1 className="mb-2">Checkout</h1>

        {error && <div className="alert alert-danger">{error}</div>}

        <div className="checkout-grid">
          <div>
            <form onSubmit={handleSubmit}>
              <div className="card mb-2">
                <h3>Shipping Information</h3>
                <div className="form-group">
                  <label>Street Address</label>
                  <input
                    type="text"
                    name="street"
                    className="form-control"
                    value={shippingInfo.street}
                    onChange={handleChange}
                    required
                  />
                </div>
                <div className="grid grid-2">
                  <div className="form-group">
                    <label>City</label>
                    <input
                      type="text"
                      name="city"
                      className="form-control"
                      value={shippingInfo.city}
                      onChange={handleChange}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>State</label>
                    <input
                      type="text"
                      name="state"
                      className="form-control"
                      value={shippingInfo.state}
                      onChange={handleChange}
                      required
                    />
                  </div>
                </div>
                <div className="grid grid-2">
                  <div className="form-group">
                    <label>ZIP Code</label>
                    <input
                      type="text"
                      name="zipCode"
                      className="form-control"
                      value={shippingInfo.zipCode}
                      onChange={handleChange}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>Country</label>
                    <input
                      type="text"
                      name="country"
                      className="form-control"
                      value={shippingInfo.country}
                      onChange={handleChange}
                      required
                    />
                  </div>
                </div>
                <div className="form-group">
                  <label>Phone Number</label>
                  <input
                    type="tel"
                    name="phone"
                    className="form-control"
                    value={shippingInfo.phone}
                    onChange={handleChange}
                    required
                  />
                </div>
              </div>

              <div className="card mb-2">
                <h3>Payment Method</h3>
                <div className="form-group">
                  <label>
                    <input
                      type="radio"
                      name="paymentMethod"
                      value="Card"
                      checked={paymentMethod === 'Card'}
                      onChange={(e) => setPaymentMethod(e.target.value)}
                    />
                    Credit/Debit Card
                  </label>
                </div>
                <div className="form-group">
                  <label>
                    <input
                      type="radio"
                      name="paymentMethod"
                      value="PayPal"
                      checked={paymentMethod === 'PayPal'}
                      onChange={(e) => setPaymentMethod(e.target.value)}
                    />
                    PayPal
                  </label>
                </div>
                <div className="form-group">
                  <label>
                    <input
                      type="radio"
                      name="paymentMethod"
                      value="Cash on Delivery"
                      checked={paymentMethod === 'Cash on Delivery'}
                      onChange={(e) => setPaymentMethod(e.target.value)}
                    />
                    Cash on Delivery
                  </label>
                </div>
              </div>

              <button
                type="submit"
                className="btn btn-primary"
                style={{ width: '100%' }}
                disabled={loading}
              >
                {loading ? 'Processing...' : 'Place Order'}
              </button>
            </form>
          </div>

          <div>
            <div className="card">
              <h3>Order Summary</h3>
              <div className="order-items mb-2">
                {cart.items.map((item) => (
                  <div key={item._id} className="order-item">
                    <span>{item.product.name} x {item.quantity}</span>
                    <span>${(item.price * item.quantity).toFixed(2)}</span>
                  </div>
                ))}
              </div>
              <div className="summary-row">
                <span>Subtotal:</span>
                <span>${subtotal.toFixed(2)}</span>
              </div>
              <div className="summary-row">
                <span>Shipping:</span>
                <span>${shippingPrice.toFixed(2)}</span>
              </div>
              <div className="summary-row">
                <span>Tax:</span>
                <span>${taxPrice.toFixed(2)}</span>
              </div>
              <hr />
              <div className="summary-row total">
                <strong>Total:</strong>
                <strong>${totalPrice.toFixed(2)}</strong>
              </div>
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        .checkout-grid {
          display: grid;
          grid-template-columns: 2fr 1fr;
          gap: 20px;
        }

        .order-item {
          display: flex;
          justify-content: space-between;
          padding: 10px 0;
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

        @media (max-width: 768px) {
          .checkout-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
};

export default Checkout;
