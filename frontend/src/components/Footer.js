import React from 'react';
import { Link } from 'react-router-dom';
import { FaFacebook, FaTwitter, FaInstagram, FaLinkedin } from 'react-icons/fa';

const Footer = () => {
  return (
    <footer className="footer">
      <div className="footer-container">
        <div className="footer-section">
          <h3>About BuyEasy</h3>
          <p>
            Your trusted e-commerce platform for quality products. We deliver
            excellence in every order.
          </p>
          <div className="social-icons">
            <a href="#" aria-label="Facebook">
              <FaFacebook size={20} />
            </a>
            <a href="#" aria-label="Twitter">
              <FaTwitter size={20} />
            </a>
            <a href="#" aria-label="Instagram">
              <FaInstagram size={20} />
            </a>
            <a href="#" aria-label="LinkedIn">
              <FaLinkedin size={20} />
            </a>
          </div>
        </div>
        
        <div className="footer-section">
          <h3>Quick Links</h3>
          <ul>
            <li><Link to="/products">Shop Now</Link></li>
            <li><Link to="/about">About Us</Link></li>
            <li><Link to="/contact">Contact</Link></li>
            <li><Link to="/faq">FAQ</Link></li>
          </ul>
        </div>
        
        <div className="footer-section">
          <h3>Customer Service</h3>
          <ul>
            <li><Link to="/shipping">Shipping Info</Link></li>
            <li><Link to="/returns">Returns</Link></li>
            <li><Link to="/privacy">Privacy Policy</Link></li>
            <li><Link to="/terms">Terms of Service</Link></li>
          </ul>
        </div>
        
        <div className="footer-section">
          <h3>Contact Us</h3>
          <ul>
            <li>Email: support@BuyEasy.com</li>
            <li>Phone: +1 (555) 123-4567</li>
            <li>Address: 123 Commerce St, City, State 12345</li>
          </ul>
        </div>
      </div>
      
      <div className="footer-bottom">
        <p>&copy; {new Date().getFullYear()} BuyEasy. All rights reserved.</p>
      </div>
    </footer>
  );
};

export default Footer;
