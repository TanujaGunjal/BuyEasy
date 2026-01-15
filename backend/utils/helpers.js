// Helper functions for various operations

// Calculate pagination
exports.getPagination = (page, limit) => {
  const pageNumber = parseInt(page) || 1;
  const limitNumber = parseInt(limit) || 10;
  const skip = (pageNumber - 1) * limitNumber;
  
  return { page: pageNumber, limit: limitNumber, skip };
};

// Format price
exports.formatPrice = (price) => {
  return parseFloat(price).toFixed(2);
};

// Generate random string
exports.generateRandomString = (length) => {
  return Math.random().toString(36).substring(2, length + 2);
};

// Slugify text
exports.slugify = (text) => {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^\w\-]+/g, '')
    .replace(/\-\-+/g, '-');
};

// Calculate discount price
exports.calculateDiscountPrice = (price, discount) => {
  return price - (price * discount) / 100;
};

// Validate email
exports.isValidEmail = (email) => {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email);
};
