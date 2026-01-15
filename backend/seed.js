const mongoose = require('mongoose');
const dotenv = require('dotenv');
const User = require('./models/User');
const Product = require('./models/Product');

dotenv.config();


const seedData = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    console.log('MongoDB Connected...');

    // Clear existing data
    await User.deleteMany();
    await Product.deleteMany();

    console.log('Cleared existing data...');

    // Create admin user
    const admin = await User.create({
      name: 'Admin User',
      email: 'admin@BuyEasy.com',
      password: 'admin123',
      role: 'admin',
    });

    console.log('Admin user created');

    // Create sample products with real images
    const sampleProducts = [
      {
        name: 'Wireless Bluetooth Headphones',
        description: 'Premium noise-canceling wireless headphones with 30-hour battery life. Features active noise cancellation, premium sound quality, and comfortable over-ear design.',
        price: 199.99,
        comparePrice: 249.99,
        category: 'Electronics',
        brand: 'AudioTech',
        stock: 50,
        thumbnail: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=500',
        images: [
          { url: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800', alt: 'Wireless Headphones' }
        ],
        rating: 4.5,
        numReviews: 128,
        isFeatured: true,
        createdBy: admin._id,
      },
      {
        name: 'Smart Fitness Watch',
        description: 'Track your fitness goals with heart rate monitoring, GPS, sleep tracking, and waterproof design. Compatible with iOS and Android.',
        price: 149.99,
        category: 'Electronics',
        brand: 'FitTech',
        stock: 75,
        thumbnail: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=500',
        images: [
          { url: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800', alt: 'Smart Watch' }
        ],
        rating: 4.3,
        numReviews: 89,
        isFeatured: true,
        createdBy: admin._id,
      },
      {
        name: 'Organic Cotton T-Shirt',
        description: 'Comfortable and sustainable 100% organic cotton t-shirt. Available in multiple colors. Perfect for everyday wear with a modern fit.',
        price: 29.99,
        category: 'Clothing',
        brand: 'EcoWear',
        stock: 200,
        thumbnail: 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=500',
        images: [
          { url: 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=800', alt: 'Cotton T-Shirt' }
        ],
        rating: 4.7,
        numReviews: 256,
        isFeatured: false,
        createdBy: admin._id,
      },
      {
        name: 'Stainless Steel Water Bottle',
        description: 'Insulated stainless steel water bottle that keeps drinks cold for 24 hours. BPA-free and leak-proof design.',
        price: 24.99,
        category: 'Sports',
        brand: 'HydroLife',
        stock: 200,
        thumbnail: 'https://images.unsplash.com/photo-1602143407151-7111542de6e8?w=500',
        images: [
          { url: 'https://images.unsplash.com/photo-1602143407151-7111542de6e8?w=800', alt: 'Water Bottle' }
        ],
        rating: 4.7,
        numReviews: 143,
        isFeatured: false,
        createdBy: admin._id,
      },
      {
        name: 'Wireless Gaming Mouse',
        description: 'High-precision optical sensor with 16,000 DPI, customizable RGB lighting, and programmable buttons. Perfect for competitive gaming.',
        price: 79.99,
        category: 'Electronics',
        brand: 'GamePro',
        stock: 100,
        thumbnail: 'https://images.unsplash.com/photo-1527814050087-3793815479db?w=500',
        images: [
          { url: 'https://images.unsplash.com/photo-1527814050087-3793815479db?w=800', alt: 'Gaming Mouse' }
        ],
        rating: 4.8,
        numReviews: 312,
        isFeatured: true,
        createdBy: admin._id,
      },
      {
        name: 'Leather Laptop Backpack',
        description: 'Premium genuine leather backpack with padded laptop compartment (fits up to 15.6"). Multiple pockets for organization and water-resistant.',
        price: 89.99,
        category: 'Other',
        brand: 'UrbanCarry',
        stock: 60,
        thumbnail: 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=500',
        images: [
          { url: 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=800', alt: 'Leather Backpack' }
        ],
        rating: 4.4,
        numReviews: 94,
        isFeatured: false,
        createdBy: admin._id,
      },
      {
        name: 'Smart Home Security Camera',
        description: '1080p Full HD security camera with color night vision, two-way audio, motion detection alerts, and cloud storage. Easy setup with mobile app.',
        price: 129.99,
        category: 'Electronics',
        brand: 'SecureHome',
        stock: 45,
        thumbnail: 'https://images.unsplash.com/photo-1558002038-1055907df827?w=500',
        images: [
          { url: 'https://images.unsplash.com/photo-1558002038-1055907df827?w=800', alt: 'Security Camera' }
        ],
        rating: 4.2,
        numReviews: 67,
        isFeatured: true,
        createdBy: admin._id,
      },
      {
        name: 'Yoga Mat with Carrying Strap',
        description: 'Premium non-slip eco-friendly TPE yoga mat with excellent cushioning. Includes carrying strap and alignment marks. Perfect for all yoga styles.',
        price: 39.99,
        category: 'Sports',
        brand: 'ZenFit',
        stock: 120,
        thumbnail: 'https://images.unsplash.com/photo-1601925260368-ae2f83cf8b7f?w=500',
        images: [
          { url: 'https://images.unsplash.com/photo-1601925260368-ae2f83cf8b7f?w=800', alt: 'Yoga Mat' }
        ],
        rating: 4.5,
        numReviews: 203,
        isFeatured: false,
        createdBy: admin._id,
      },
      {
        name: 'Wireless Mechanical Keyboard',
        description: 'RGB mechanical keyboard with hot-swappable switches, wireless connectivity, and 80-hour battery life. Perfect for gaming and productivity.',
        price: 159.99,
        category: 'Electronics',
        brand: 'TechKeys',
        stock: 35,
        thumbnail: 'https://images.unsplash.com/photo-1587829741301-dc798b83add3?w=500',
        images: [
          { url: 'https://images.unsplash.com/photo-1587829741301-dc798b83add3?w=800', alt: 'Mechanical Keyboard' }
        ],
        rating: 4.7,
        numReviews: 156,
        isFeatured: true,
        createdBy: admin._id,
      },
      {
        name: 'Minimalist Desk Lamp',
        description: 'Modern LED desk lamp with adjustable brightness, USB charging port, and eye-caring technology. Perfect for home office or bedroom.',
        price: 49.99,
        category: 'Home & Garden',
        brand: 'LightSpace',
        stock: 110,
        thumbnail: 'https://images.unsplash.com/photo-1507473885765-e6ed057f782c?w=500',
        images: [
          { url: 'https://images.unsplash.com/photo-1507473885765-e6ed057f782c?w=800', alt: 'Desk Lamp' }
        ],
        rating: 4.4,
        numReviews: 98,
        isFeatured: false,
        createdBy: admin._id,
      },
      {
        name: 'Portable Bluetooth Speaker',
        description: '360-degree sound, waterproof design (IPX7), 20-hour battery life. Perfect for outdoor adventures and home entertainment.',
        price: 89.99,
        category: 'Electronics',
        brand: 'SoundWave',
        stock: 65,
        thumbnail: 'https://images.unsplash.com/photo-1608043152269-423dbba4e7e1?w=500',
        images: [
          { url: 'https://images.unsplash.com/photo-1608043152269-423dbba4e7e1?w=800', alt: 'Bluetooth Speaker' }
        ],
        rating: 4.5,
        numReviews: 187,
        isFeatured: false,
        createdBy: admin._id,
      },
      {
        name: 'Classic Denim Jacket',
        description: 'Timeless denim jacket made from premium cotton. Classic fit with button closure. Available in multiple washes.',
        price: 79.99,
        category: 'Clothing',
        brand: 'UrbanStyle',
        stock: 95,
        thumbnail: 'https://images.unsplash.com/photo-1551028719-00167b16eac5?w=500',
        images: [
          { url: 'https://images.unsplash.com/photo-1551028719-00167b16eac5?w=800', alt: 'Denim Jacket' }
        ],
        rating: 4.6,
        numReviews: 142,
        isFeatured: false,
        createdBy: admin._id,
      },
     

      {
        name: 'Plant-Based Protein Powder',
        description: 'Organic vegan protein powder with 25g protein per serving. Available in chocolate and vanilla flavors. Non-GMO and gluten-free.',
        price: 44.99,
        category: 'Food',
        brand: 'GreenLife',
        stock: 200,
        thumbnail: 'https://images.unsplash.com/photo-1593095948071-474c5cc2989d?w=500',
        images: [
          { url: 'https://images.unsplash.com/photo-1593095948071-474c5cc2989d?w=800', alt: 'Protein Powder' }
        ],
        rating: 4.3,
        numReviews: 312,
        isFeatured: false,
        createdBy: admin._id,
      },

      // ================= EXTRA PRODUCTS =================


// MEN FASHION

{
  name: 'Men Running Sneakers',
  description: 'Lightweight sneakers with breathable mesh and cushioned sole for everyday comfort.',
  price: 99.99,
  category: 'Sports',
  brand: 'RunFlex',
  stock: 90,
  thumbnail: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=500',
  images: [
    { url: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=800', alt: 'Sneakers' }
  ],
  rating: 4.4,
  numReviews: 160,
  isFeatured: false,
  createdBy: admin._id,
},

// HOME & FURNITURE

{
  name: 'Luxury Fabric Sofa',
  description: 'Comfortable 3-seater luxury sofa with premium cushioning and modern design.',
  price: 549.99,
  comparePrice: 699.99,
  category: 'Home & Furniture',
  brand: 'ComfortZone',
  stock: 18,
  thumbnail: 'https://images.unsplash.com/photo-1549187774-b4e9b0445b41?w=500',
  images: [
    { url: 'https://images.unsplash.com/photo-1549187774-b4e9b0445b41?w=800', alt: 'Luxury Sofa' }
  ],
  rating: 4.7,
  numReviews: 120,
  isFeatured: true,
  createdBy: admin._id,
},

// ACCESSORIES
{
  name: 'Luxury Analog Wrist Watch',
  description: 'Premium stainless steel analog watch with water resistance.',
  price: 229.99,
  category: 'Accessories',
  brand: 'TimeX',
  stock: 35,
  thumbnail: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=500',
  images: [
    { url: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800', alt: 'Watch' }
  ],
  rating: 4.6,
  numReviews: 145,
  isFeatured: false,
  createdBy: admin._id,
},

{
  name: 'Designer Sunglasses',
  description: 'UV-protected polarized sunglasses with premium frame.',
  price: 79.99,
  category: 'Accessories',
  brand: 'SunPeak',
  stock: 110,
  thumbnail: 'https://images.unsplash.com/photo-1511499767150-a48a237f0083?w=500',
  images: [
    { url: 'https://images.unsplash.com/photo-1511499767150-a48a237f0083?w=800', alt: 'Sunglasses' }
  ],
  rating: 4.5,
  numReviews: 190,
  isFeatured: false,
  createdBy: admin._id,
},


// ================= ADDITIONAL PRODUCTS =================

// ELECTRONICS
{
  name: 'Noise Cancelling Wireless Earbuds',
  description: 'Compact wireless earbuds with active noise cancellation, crystal clear sound, and 24-hour battery life.',
  price: 129.99,
  category: 'Electronics',
  brand: 'SoundCore',
  stock: 70,
  thumbnail: 'https://images.unsplash.com/photo-1590658268037-6bf12165a8df?auto=format&fit=crop&w=800&q=80',
  images: [
    { url: 'https://images.unsplash.com/photo-1590658268037-6bf12165a8df?auto=format&fit=crop&w=1200&q=80', alt: 'Wireless Earbuds' },
    { url: 'https://images.unsplash.com/photo-1606220838315-056192d5e927?auto=format&fit=crop&w=1200&q=80', alt: 'Earbuds Case' }
  ],
  rating: 4.5,
  numReviews: 210,
  isFeatured: true,
  createdBy: admin._id,
},

// CLOTHING
{
  name: 'Unisex Oversized Tshirt',
  description: 'Soft fleece oversized Tshirt for everyday comfort. Warm, stylish, and perfect for all seasons.',
  price: 49.99,
  category: 'Clothing',
  brand: 'StreetWear',
  stock: 150,
  thumbnail: 'https://images.unsplash.com/photo-1618354691373-d851c5c3a990?auto=format&fit=crop&w=800&q=80',
  images: [
    { url: 'https://images.unsplash.com/photo-1618354691373-d851c5c3a990?auto=format&fit=crop&w=1200&q=80', alt: 'Oversized Tshirt' },
    { url: 'https://images.unsplash.com/photo-1602810319428-019690571b5b?auto=format&fit=crop&w=1200&q=80', alt: 'Tshir tBack View' }
  ],
  rating: 4.7,
  numReviews: 325,
  isFeatured: false,
  createdBy: admin._id,
},


// ACCESSORIES
{
  name: 'Travel Duffel Bag',
  description: 'Spacious and durable travel duffel bag.',
  price: 89.99,
  category: 'Accessories',
  brand: 'GoTravel',
  stock: 55,
  thumbnail: 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=800',
  images: [],
  rating: 4.5,
  numReviews: 118,
  isFeatured: false,
  createdBy: admin._id,
},

// BOOKS
{
  name: 'The Psychology of Money',
  description: 'Timeless lessons on wealth, greed, and happiness by Morgan Housel.',
  price: 16.99,
  category: 'Books',
  brand: 'Harriman House',
  stock: 150,
  thumbnail: 'https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=800',
  images: [],
  rating: 4.8,
  numReviews: 450,
  isFeatured: true,
  createdBy: admin._id,
},



// HAND BAGS



{
  name: 'Vintage Leather Clutch',
  description: 'Classic vintage-style leather clutch with magnetic closure.',
  price: 119.99,
  category: 'Hand Bags',
  brand: 'RetroCarry',
  stock: 60,
  thumbnail: 'https://images.unsplash.com/photo-1584917865442-de89df76afd3?w=800',
  images: [],
  rating: 4.6,
  numReviews: 95,
  isFeatured: false,
  createdBy: admin._id,
},

{
  name: 'Canvas Beach Tote',
  description: 'Durable canvas tote bag perfect for beach trips and casual outings.',
  price: 34.99,
  category: 'Hand Bags',
  brand: 'BeachLife',
  stock: 100,
  thumbnail: 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=800',
  images: [],
  rating: 4.4,
  numReviews: 78,
  isFeatured: false,
  createdBy: admin._id,
},

// HOME & FURNITURE
{
  name: 'Ergonomic Office Chair',
  description: 'Adjustable ergonomic office chair with lumbar support and breathable mesh back.',
  price: 249.99,
  category: 'Home & Furniture',
  brand: 'ComfortSeat',
  stock: 30,
  thumbnail: 'https://images.unsplash.com/photo-1580480055273-228ff5388ef8?auto=format&fit=crop&w=800&q=80',
  images: [
    { url: 'https://images.unsplash.com/photo-1580480055273-228ff5388ef8?auto=format&fit=crop&w=1200&q=80', alt: 'Office Chair Front' },
    { url: 'https://images.unsplash.com/photo-1598300056393-4aac492f4344?auto=format&fit=crop&w=1200&q=80', alt: 'Office Chair Side' }
  ],
  rating: 4.6,
  numReviews: 112,
  isFeatured: true,
  createdBy: admin._id,
},
{
  name: 'Bedside Night Lamp',
  description: 'Warm LED bedside lamp with touch control.',
  price: 29.99,
  category: 'Home & Furniture',
  brand: 'GlowLite',
  stock: 150,
  thumbnail: 'https://images.unsplash.com/photo-1519710164239-da123dc03ef4?w=800',
  images: [],
  rating: 4.3,
  numReviews: 64,
  isFeatured: false,
  createdBy: admin._id,
},


// ============ MORE PRODUCTS ============

// ELECTRONICS
{
  name: '4K Smart LED TV 43-inch',
  description: 'Ultra HD Smart TV with HDR, Dolby Audio and built-in streaming apps.',
  price: 399.99,
  category: 'Electronics',
  brand: 'ViewPlus',
  stock: 25,
  thumbnail: 'https://images.unsplash.com/photo-1593359677879-a4bb92f829d1?w=800',
  images: [],
  rating: 4.6,
  numReviews: 180,
  isFeatured: true,
  createdBy: admin._id,
},

// CLOTHING
{
  name: 'Men Slim Fit Formal Shirt',
  description: 'Premium cotton slim-fit formal shirt for office and occasions.',
  price: 39.99,
  category: 'Clothing',
  brand: 'OfficeWear',
  stock: 120,
  thumbnail: 'https://images.unsplash.com/photo-1602810318383-e386cc2a3ccf?w=800',
  images: [],
  rating: 4.4,
  numReviews: 95,
  isFeatured: false,
  createdBy: admin._id,
},

{
  name: 'Women Casual Sneakers',
  description: 'Lightweight casual sneakers for daily wear.',
  price: 69.99,
  category: 'Sports',
  brand: 'StepFit',
  stock: 80,
  thumbnail: 'https://images.unsplash.com/photo-1549298916-b41d501d3772?w=800',
  images: [],
  rating: 4.5,
  numReviews: 132,
  isFeatured: false,
  createdBy: admin._id,
},

// HOME & FURNITURE
{
  name: 'Wooden Coffee Table',
  description: 'Modern wooden coffee table with sturdy legs.',
  price: 149.99,
  category: 'Home & Furniture',
  brand: 'HomeStyle',
  stock: 40,
  thumbnail: 'https://images.unsplash.com/photo-1505691938895-1758d7feb511?w=800',
  images: [],
  rating: 4.6,
  numReviews: 78,
  isFeatured: true,
  createdBy: admin._id,
},



    ];

    await Product.insertMany(sampleProducts);

    console.log('Sample products created');
    console.log('\n=================================');
    console.log('Database seeded successfully!');
    console.log('=================================');
    console.log('\nAdmin Login Credentials:');
    console.log('Email: admin@BuyEasy.com');
    console.log('Password: admin123');
    console.log('=================================\n');

    process.exit(0);
  } catch (error) {
    console.error('Error seeding database:', error);
    process.exit(1);
  }
};

seedData();
