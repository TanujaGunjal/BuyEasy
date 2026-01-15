import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { FaStar, FaShoppingCart } from 'react-icons/fa';
import api from '../services/api';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';

const ProductDetails = () => {
  const { id } = useParams();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [quantity, setQuantity] = useState(1);
  const [message, setMessage] = useState({ type: '', text: '' });
  const { addToCart } = useCart();
  const { isAuthenticated } = useAuth();

  useEffect(() => {
    loadProduct();
  }, [id]);

  const loadProduct = async () => {
    try {
      const response = await api.get(`/products/${id}`);
      setProduct(response.data.data);
    } catch (error) {
      console.error('Error loading product:', error);
      setMessage({ type: 'danger', text: 'Product not found' });
    } finally {
      setLoading(false);
    }
  };

  const handleAddToCart = async () => {
    if (!isAuthenticated) {
      setMessage({ type: 'warning', text: 'Please login to add items to cart' });
      return;
    }

    const result = await addToCart(product._id, quantity);
    setMessage({
      type: result.success ? 'success' : 'danger',
      text: result.message,
    });

    if (result.success) {
      setQuantity(1);
    }
  };

  if (loading) {
    return <div className="loading">Loading product...</div>;
  }

  if (!product) {
    return (
      <div className="container py-3">
        <div className="alert alert-danger">Product not found</div>
      </div>
    );
  }

  const imageUrl = product.thumbnail.startsWith('http')
    ? product.thumbnail
    : `http://localhost:5000/${product.thumbnail}`;

  return (
    <div className="product-details-page py-3">
      <div className="container">
        {message.text && (
          <div className={`alert alert-${message.type}`}>{message.text}</div>
        )}

        <div className="product-details-grid">
          <div className="product-image-section">
            <img
              src={imageUrl}
              alt={product.name}
              style={{ width: '100%', borderRadius: '10px' }}
              onError={(e) => {
                e.target.src = 'https://via.placeholder.com/500x500/4F46E5/ffffff?text=Product';
              }}
            />
          </div>

          <div className="product-info-section card">
            <h1>{product.name}</h1>
            
            <div className="product-rating mb-1">
              {[...Array(5)].map((_, i) => (
                <FaStar
                  key={i}
                  color={i < Math.floor(product.rating) ? '#F59E0B' : '#D1D5DB'}
                />
              ))}
              <span className="ml-1">
                ({product.numReviews} reviews)
              </span>
            </div>

            <h2 className="product-price" style={{ fontSize: '2.5rem', marginBottom: '20px' }}>
              ${product.price.toFixed(2)}
            </h2>

            <p className="mb-2">{product.description}</p>

            <div className="product-meta mb-2">
              <p><strong>Category:</strong> {product.category}</p>
              <p><strong>Brand:</strong> {product.brand}</p>
              <p><strong>Stock:</strong> {product.stock > 0 ? `${product.stock} available` : 'Out of Stock'}</p>
            </div>

            {product.stock > 0 && (
              <div className="add-to-cart-section">
                <div className="form-group">
                  <label>Quantity:</label>
                  <input
                    type="number"
                    min="1"
                    max={product.stock}
                    value={quantity}
                    onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
                    className="form-control"
                    style={{ width: '100px' }}
                  />
                </div>
                <button
                  onClick={handleAddToCart}
                  className="btn btn-primary"
                  style={{ width: '100%', marginTop: '10px' }}
                >
                  <FaShoppingCart /> Add to Cart
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Additional Details */}
        {product.specifications && Object.keys(product.specifications).length > 0 && (
          <div className="card mt-3">
            <h3>Specifications</h3>
            <table style={{ width: '100%' }}>
              <tbody>
                {Object.entries(product.specifications).map(([key, value]) => (
                  <tr key={key} style={{ borderBottom: '1px solid var(--border-color)' }}>
                    <td style={{ padding: '10px', fontWeight: 'bold' }}>{key}</td>
                    <td style={{ padding: '10px' }}>{value}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <style jsx>{`
        .product-details-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 30px;
          margin-bottom: 30px;
        }

        @media (max-width: 768px) {
          .product-details-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
};

export default ProductDetails;
