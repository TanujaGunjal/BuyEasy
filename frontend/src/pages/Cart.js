import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FaTrash, FaShoppingCart } from 'react-icons/fa';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';

const Cart = () => {
  const { cart, updateCartItem, removeFromCart, loading } = useCart();
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();

  const handleQuantityChange = async (itemId, newQuantity) => {
    if (newQuantity < 1) return;
    await updateCartItem(itemId, newQuantity);
  };

  const handleRemove = async (itemId) => {
    if (window.confirm('Remove this item from cart?')) {
      await removeFromCart(itemId);
    }
  };

  const handleCheckout = () => {
    if (!isAuthenticated) {
      navigate('/login');
    } else {
      navigate('/checkout');
    }
  };

  if (loading) {
    return <div className="loading">Loading cart...</div>;
  }

  if (!cart.items || cart.items.length === 0) {
    return (
      <div className="container py-3">
        <div className="card text-center py-3">
          <FaShoppingCart size={64} color="#ccc" />
          <h2 className="mt-2">Your cart is empty</h2>
          <p>Start shopping to add items to your cart</p>
          <Link to="/products" className="btn btn-primary mt-2">
            Browse Products
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="cart-page py-3">
      <div className="container">
        <h1 className="mb-2">Shopping Cart</h1>

        <div className="cart-grid">
          <div className="cart-items">
            {cart.items.map((item) => (
              <div key={item._id} className="card cart-item">
                <div className="cart-item-content">
                  <img
                    src={item.product.thumbnail?.startsWith('http')
                      ? item.product.thumbnail
                      : `http://localhost:5000/${item.product.thumbnail}`
                    }
                    alt={item.product.name}
                    className="cart-item-image"
                    onError={(e) => {
                      e.target.src = 'https://via.placeholder.com/100x100/4F46E5/ffffff?text=Product';
                    }}
                  />
                  <div className="cart-item-details">
                    <h3>{item.product.name}</h3>
                    <p className="product-price">${item.price.toFixed(2)}</p>
                    <div className="quantity-controls">
                      <button
                        className="btn btn-sm btn-secondary"
                        onClick={() => handleQuantityChange(item._id, item.quantity - 1)}
                      >
                        -
                      </button>
                      <span className="quantity">{item.quantity}</span>
                      <button
                        className="btn btn-sm btn-secondary"
                        onClick={() => handleQuantityChange(item._id, item.quantity + 1)}
                        disabled={item.quantity >= item.product.stock}
                      >
                        +
                      </button>
                    </div>
                  </div>
                  <div className="cart-item-actions">
                    <p className="item-total">
                      ${(item.price * item.quantity).toFixed(2)}
                    </p>
                    <button
                      className="btn btn-danger btn-sm"
                      onClick={() => handleRemove(item._id)}
                    >
                      <FaTrash /> Remove
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="cart-summary card">
            <h3>Order Summary</h3>
            <div className="summary-row">
              <span>Items ({cart.totalItems}):</span>
              <span>${cart.totalPrice.toFixed(2)}</span>
            </div>
            <div className="summary-row">
              <span>Shipping:</span>
              <span>${cart.totalPrice > 50 ? '0.00' : '9.99'}</span>
            </div>
            <div className="summary-row">
              <span>Tax (10%):</span>
              <span>${(cart.totalPrice * 0.1).toFixed(2)}</span>
            </div>
            <hr />
            <div className="summary-row total">
              <strong>Total:</strong>
              <strong>
                ${(cart.totalPrice + (cart.totalPrice > 50 ? 0 : 9.99) + cart.totalPrice * 0.1).toFixed(2)}
              </strong>
            </div>
            <button
              className="btn btn-primary"
              style={{ width: '100%', marginTop: '20px' }}
              onClick={handleCheckout}
            >
              Proceed to Checkout
            </button>
            <Link
              to="/products"
              className="btn btn-secondary"
              style={{ width: '100%', marginTop: '10px' }}
            >
              Continue Shopping
            </Link>
          </div>
        </div>
      </div>

      <style jsx>{`
        .cart-grid {
          display: grid;
          grid-template-columns: 2fr 1fr;
          gap: 20px;
        }

        .cart-item-content {
          display: flex;
          gap: 20px;
          align-items: center;
        }

        .cart-item-image {
          width: 100px;
          height: 100px;
          object-fit: cover;
          border-radius: 8px;
        }

        .cart-item-details {
          flex: 1;
        }

        .cart-item-details h3 {
          margin-bottom: 10px;
        }

        .quantity-controls {
          display: flex;
          align-items: center;
          gap: 10px;
          margin-top: 10px;
        }

        .quantity {
          padding: 5px 15px;
          border: 1px solid var(--border-color);
          border-radius: 5px;
          min-width: 50px;
          text-align: center;
        }

        .cart-item-actions {
          text-align: right;
        }

        .item-total {
          font-size: 1.3rem;
          font-weight: bold;
          color: var(--primary-color);
          margin-bottom: 10px;
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
          .cart-grid {
            grid-template-columns: 1fr;
          }

          .cart-item-content {
            flex-direction: column;
            text-align: center;
          }
        }
      `}</style>
    </div>
  );
};

export default Cart;
