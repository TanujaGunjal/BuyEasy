import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { FaBox, FaShoppingBag, FaUsers, FaDollarSign } from 'react-icons/fa';
import api from '../../services/api';

const AdminDashboard = () => {
  const [stats, setStats] = useState({
    totalProducts: 0,
    totalOrders: 0,
    totalUsers: 0,
    totalRevenue: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      // Load statistics from different endpoints
      const [productsRes, ordersRes, usersRes] = await Promise.all([
        api.get('/products?limit=1'),
        api.get('/orders?limit=1'),
        api.get('/users'),
      ]);

      setStats({
        totalProducts: productsRes.data.total || 0,
        totalOrders: ordersRes.data.total || 0,
        totalUsers: usersRes.data.count || 0,
        totalRevenue: 0, // Calculate from orders if needed
      });
    } catch (error) {
      console.error('Error loading stats:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="loading">Loading dashboard...</div>;
  }

  return (
    <div className="admin-dashboard py-3">
      <div className="container">
        <h1 className="mb-2">Admin Dashboard</h1>

        <div className="grid grid-4 mb-3">
          <div className="card stat-card">
            <FaBox size={40} color="#4F46E5" />
            <h3>{stats.totalProducts}</h3>
            <p>Total Products</p>
          </div>
          <div className="card stat-card">
            <FaShoppingBag size={40} color="#10B981" />
            <h3>{stats.totalOrders}</h3>
            <p>Total Orders</p>
          </div>
          <div className="card stat-card">
            <FaUsers size={40} color="#F59E0B" />
            <h3>{stats.totalUsers}</h3>
            <p>Total Users</p>
          </div>
          <div className="card stat-card">
            <FaDollarSign size={40} color="#EF4444" />
            <h3>${stats.totalRevenue.toFixed(2)}</h3>
            <p>Total Revenue</p>
          </div>
        </div>

        <div className="grid grid-3">
          <Link to="/admin/products" className="card admin-link">
            <FaBox size={32} />
            <h3>Manage Products</h3>
            <p>Add, edit, or remove products</p>
          </Link>
          <Link to="/admin/orders" className="card admin-link">
            <FaShoppingBag size={32} />
            <h3>Manage Orders</h3>
            <p>View and update order status</p>
          </Link>
          <Link to="/admin/users" className="card admin-link">
            <FaUsers size={32} />
            <h3>Manage Users</h3>
            <p>View and manage user accounts</p>
          </Link>
        </div>
      </div>

      <style jsx>{`
        .stat-card {
          text-align: center;
        }

        .stat-card h3 {
          font-size: 2rem;
          margin: 10px 0;
          color: var(--primary-color);
        }

        .admin-link {
          text-decoration: none;
          color: var(--text-color);
          text-align: center;
          transition: all 0.3s ease;
        }

        .admin-link:hover {
          transform: translateY(-5px);
          box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
        }
      `}</style>
    </div>
  );
};

export default AdminDashboard;
