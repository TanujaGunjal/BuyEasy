import React from 'react';
import { Link } from 'react-router-dom';
import { FaStar, FaStarHalfAlt, FaRegStar } from 'react-icons/fa';
import './ProductCard.css';

const ProductCard = ({ product }) => {
  const renderStars = (rating) => {
    const stars = [];
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 !== 0;

    for (let i = 0; i < fullStars; i++) {
      stars.push(<FaStar key={i} />);
    }

    if (hasHalfStar) {
      stars.push(<FaStarHalfAlt key="half" />);
    }

    const emptyStars = 5 - Math.ceil(rating);
    for (let i = 0; i < emptyStars; i++) {
      stars.push(<FaRegStar key={`empty-${i}`} />);
    }

    return stars;
  };

  const imageUrl = product.thumbnail.startsWith('http')
    ? product.thumbnail
    : `http://localhost:5000/${product.thumbnail}`;

 return (
  <Link to={`/products/${product._id}`} className="product-card">
    
    <div className="product-image-wrapper">
      <img
        src={imageUrl}
        alt={product.name}
        onError={(e) => {
          e.target.src =
            'https://via.placeholder.com/400x400/4F46E5/ffffff?text=Product';
        }}
      />
    </div>

    <div className="product-content">
      <h3>{product.name}</h3>
      <p className="price">${product.price.toFixed(2)}</p>

      <button className="view-btn">View Product</button>
    </div>

  </Link>
);

};

export default ProductCard;
