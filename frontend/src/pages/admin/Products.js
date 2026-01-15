import React, { useState, useEffect } from 'react';
import api from '../../services/api';

const AdminProducts = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadProducts();
  }, []);

  const loadProducts = async () => {
    try {
      const response = await api.get('/products?limit=100');
      setProducts(response.data.data);
    } catch (error) {
      console.error('Error loading products:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this product?')) {
      try {
        await api.delete(`/products/${id}`);
        loadProducts();
      } catch (error) {
        alert('Error deleting product');
      }
    }
  };

  if (loading) {
    return <div className="loading">Loading products...</div>;
  }

  return (
    <div className="admin-products py-3">
      <div className="container">
        <div className="flex-between mb-2">
          <h1>Manage Products</h1>
          <button className="btn btn-primary">Add New Product</button>
        </div>

        <div className="card">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Category</th>
                <th>Price</th>
                <th>Stock</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {products.map((product) => (
                <tr key={product._id}>
                  <td>{product.name}</td>
                  <td>{product.category}</td>
                  <td>${product.price.toFixed(2)}</td>
                  <td>{product.stock}</td>
                  <td>
                    <button className="btn btn-sm btn-secondary mr-1">Edit</button>
                    <button
                      className="btn btn-sm btn-danger"
                      onClick={() => handleDelete(product._id)}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <style jsx>{`
        .admin-table {
          width: 100%;
          border-collapse: collapse;
        }

        .admin-table th,
        .admin-table td {
          padding: 12px;
          text-align: left;
          border-bottom: 1px solid var(--border-color);
        }

        .admin-table th {
          background-color: var(--light-color);
          font-weight: 600;
        }

        .mr-1 {
          margin-right: 10px;
        }
      `}</style>
    </div>
  );
};

export default AdminProducts;
