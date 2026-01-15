const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const connectDB = require('./config/db');
const errorHandler = require('./middleware/error');
const path = require('path');

// Load env vars
dotenv.config();

// Connect to database
connectDB();

const app = express();

// Body parser
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Enable CORS
app.use(cors({
  origin: [
    "http://localhost:3000",
    "https://buyeasy-six.vercel.app"
  ],
  credentials: true
}));

// Serve static files (uploads)
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Route files
const auth = require('./routes/auth');
const products = require('./routes/products');
const cart = require('./routes/cart');
const orders = require('./routes/orders');
const users = require('./routes/users');
const deliveries = require('./routes/deliveries');
const payments = require('./routes/payments');

// Mount routers
app.use('/api/auth', auth);
app.use('/api/products', products);
app.use('/api/cart', cart);
app.use('/api/orders', orders);
app.use('/api/users', users);
app.use('/api/deliveries', deliveries);
app.use('/api/payments', payments);

// Welcome route
app.get('/', (req, res) => {
  res.json({
    message: 'Welcome to BuyEasy API',
    version: '1.0.0',
    endpoints: {
      auth: '/api/auth',
      products: '/api/products',
      cart: '/api/cart',
      orders: '/api/orders',
      users: '/api/users (admin)',
      deliveries: '/api/deliveries',
      payments: '/api/payments',
    },
  });
});

// Error handler (must be last)
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

const server = app.listen(PORT, () => {
  console.log(`
  ╔═══════════════════════════════════════════╗
  ║    BuyEasy API Server Running         ║
  ║                                           ║
  ║  Environment: ${process.env.NODE_ENV || 'development'}                     ║
  ║  Port: ${PORT}                               ║
  ║  URL: http://localhost:${PORT}              ║
  ╚═══════════════════════════════════════════╝
  `);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err, promise) => {
  console.log(`Error: ${err.message}`);
  server.close(() => process.exit(1));
});
