import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { FaTruck, FaLock, FaStar ,FaHeadset } from 'react-icons/fa';
import api from '../services/api';
import ProductCard from '../components/ProductCard';
import './Home.css';

const Home = () => {
  const [products, setProducts] = useState([]);
  const latestProducts = products.slice(0, 8); // only 8 products

  useEffect(() => {
    loadProducts();
  }, []);

  const loadProducts = async () => {
    try {
      const res = await api.get('/products?limit=6');
      setProducts(res.data.data);
    } catch (err) {
      console.log(err);
    }
  };

  return (
    <>
      {/* ================= HERO SECTION ================= */}
      <section className="hero-section">
        <div className="hero-card">

          {/* LEFT TEXT */}
          <div className="hero-left">
            <h1>
              Elevate Your <br />
              Shopping Experience
            </h1>

            <Link to="/products" className="hero-btn">
              Shop Now
            </Link>
          </div>

          {/* RIGHT IMAGE */}
          <div className="hero-right">
            <img src="/hero-bg.png" alt="Shopping Experience" />
          </div>
        </div>

{/* ===== TOP SERVICE STRIP ===== */}
<div className="service-strip">
  <div className="service-item">
    <FaTruck className="service-icon" />
    <div>
      <p className="service-title">Free Shipping</p>
      <span className="service-subtitle">On all orders above ₹499</span>
    </div>
  </div>

  <div className="service-item">
    <FaLock className="service-icon" />
    <div>
      <p className="service-title">Secure Payment</p>
      <span className="service-subtitle">100% secure payment</span>
    </div>
  </div>

  <div className="service-item">
    <FaStar className="service-icon" />
    <div>
      <p className="service-title">100% Money Back</p>
      <span className="service-subtitle">Easy return policy</span>
    </div>
  </div>

  <div className="service-item">
    <FaHeadset className="service-icon" />
    <div>
      <p className="service-title">Online Support</p>
      <span className="service-subtitle">24/7 customer support</span>
    </div>
  </div>
</div>


      </section>

      

      {/* ================= CATEGORIES ================= */}
      <section className="category-section">
        <div className="section-header">
          <h2>Popular Top Categories</h2>
          <Link to="/products">View all →</Link>
        </div>

        <div className="category-grid">
          {[
            { name: 'Electronics', img: 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8' },
            { name: 'Home & Furniture', img: 'https://images.unsplash.com/photo-1505693416388-ac5ce068fe85' },
            { name: 'Books', img: 'https://images.unsplash.com/photo-1512820790803-83ca734da794' },
            { name: 'Hand Bags', img: 'https://images.unsplash.com/photo-1584917865442-de89df76afd3' },
            { name: 'Accessories', img: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30' }
          ].map((cat, i) => (
            <Link key={i} to={`/products?category=${encodeURIComponent(cat.name)}`} className="category-card">
              <img src={cat.img} alt={cat.name} />
              <p>{cat.name}</p>
            </Link>
          ))}
        </div>
      </section>

      {/* ================= PRODUCTS ================= */}
      <section className="products-section">
        <h2>Latest Products</h2>

        <div className="products-grid">
          {products.map(product => (
            <ProductCard key={product._id} product={product} />
          ))}
        </div>
      </section>
    </>
  );
};

export default Home;
