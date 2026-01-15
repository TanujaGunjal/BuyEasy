import React, { createContext, useState, useContext, useEffect } from 'react';
import api from '../services/api';
import { useAuth } from './AuthContext';

const CartContext = createContext();

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
};

export const CartProvider = ({ children }) => {
  const [cart, setCart] = useState({ items: [], totalItems: 0, totalPrice: 0 });
  const [loading, setLoading] = useState(false);
  const { isAuthenticated } = useAuth();

  useEffect(() => {
    if (isAuthenticated) {
      loadCart();
    } else {
      setCart({ items: [], totalItems: 0, totalPrice: 0 });
    }
  }, [isAuthenticated]);

  const loadCart = async () => {
    try {
      setLoading(true);
      const response = await api.get('/cart');
      setCart(response.data.data);
    } catch (error) {
      console.error('Error loading cart:', error);
    } finally {
      setLoading(false);
    }
  };

  const addToCart = async (productId, quantity = 1) => {
    try {
      const response = await api.post('/cart', { productId, quantity });
      setCart(response.data.data);
      return { success: true, message: 'Added to cart' };
    } catch (error) {
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to add to cart',
      };
    }
  };

  const updateCartItem = async (itemId, quantity) => {
    try {
      const response = await api.put(`/cart/${itemId}`, { quantity });
      setCart(response.data.data);
      return { success: true };
    } catch (error) {
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to update cart',
      };
    }
  };

  const removeFromCart = async (itemId) => {
    try {
      const response = await api.delete(`/cart/${itemId}`);
      setCart(response.data.data);
      return { success: true, message: 'Removed from cart' };
    } catch (error) {
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to remove from cart',
      };
    }
  };

  const clearCart = async () => {
    try {
      const response = await api.delete('/cart');
      setCart(response.data.data);
      return { success: true };
    } catch (error) {
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to clear cart',
      };
    }
  };

  const value = {
    cart,
    loading,
    addToCart,
    updateCartItem,
    removeFromCart,
    clearCart,
    refreshCart: loadCart,
  };

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
};
