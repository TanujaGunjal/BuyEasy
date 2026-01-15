import React from 'react';
import { Link } from 'react-router-dom';
import { FaShoppingCart, FaUser, FaStore } from 'react-icons/fa';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import './navbar.css';

const Navbar = () => {
  const { isAuthenticated, user, logout, isAdmin } = useAuth();
  const { cart } = useCart();

  return (
    <nav className="navbar">
      <div className="navbar-container">

        {/* LOGO */}
        <Link to="/" className="navbar-logo">
          <FaStore size={22} />
          BuyEasy
        </Link>

        {/* MENU */}
        <ul className="navbar-menu">
          <li>
            <Link to="/">Home</Link>
          </li>

          <li>
            <Link to="/products">Products</Link>
          </li>

          {/* CART */}
          <li className="cart-link">
            <Link to="/cart">
              <FaShoppingCart />
              <span style={{ marginLeft: '6px' }}>Cart</span>

              {cart?.totalItems > 0 && (
                <span className="cart-badge">{cart.totalItems}</span>
              )}
            </Link>
          </li>

          {/* AUTHENTICATED USER */}
          {isAuthenticated ? (
            <>
              <li>
                <Link to="/orders">Orders</Link>
              </li>

              {isAdmin && (
                <li>
                  <Link to="/admin">Admin</Link>
                </li>
              )}

              <li className="user">
                <FaUser />
                <span>{user?.name || 'User'}</span>
              </li>

              <li>
                <button onClick={logout} className="logout-btn">
                  Logout
                </button>
              </li>
            </>
          ) : (
            /* NOT LOGGED IN */
            <li>
              <Link to="/login">
                <FaUser />
                <span style={{ marginLeft: '6px' }}>Login</span>
              </Link>
            </li>
          )}
        </ul>
      </div>
    </nav>
  );
};

export default Navbar;
