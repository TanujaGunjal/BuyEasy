import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { FaShoppingCart, FaUser, FaStore, FaChevronDown } from 'react-icons/fa';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import './navbar.css';

const Navbar = () => {
  const { isAuthenticated, user, logout, isAdmin } = useAuth();
  const { cart } = useCart();
  const [adminOpen, setAdminOpen] = useState(false);

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
                <li
                  className="admin-dropdown-wrap"
                  onMouseEnter={() => setAdminOpen(true)}
                  onMouseLeave={() => setAdminOpen(false)}
                >
                  <span className="admin-dropdown-trigger">
                    Admin <FaChevronDown size={10} style={{ marginLeft: 4 }} />
                  </span>
                  {adminOpen && (
                    <ul className="admin-dropdown-menu">
                      <li><Link to="/admin" onClick={() => setAdminOpen(false)}>Dashboard</Link></li>
                      <li><Link to="/admin/orders" onClick={() => setAdminOpen(false)}>Manage Orders</Link></li>
                      <li><Link to="/admin/products" onClick={() => setAdminOpen(false)}>Manage Products</Link></li>
                      <li><Link to="/admin/users" onClick={() => setAdminOpen(false)}>Manage Users</Link></li>
                      <li><Link to="/admin/audit-log" onClick={() => setAdminOpen(false)}>Audit Log</Link></li>
                      <li className="dropdown-divider" />
                      <li><Link to="/admin/pending-approvals" onClick={() => setAdminOpen(false)} style={{ color: '#dc2626', fontWeight: 600 }}>⚠ Pending Approvals</Link></li>
                    </ul>
                  )}
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
