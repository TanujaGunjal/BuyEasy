

# BuyEasy — Technical Reference

> Full-stack MERN e-commerce platform with a Stripe payment gateway, a Gemini-powered AI support agent, and a human-in-the-loop refund approval workflow.

[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)
[![Tests](https://img.shields.io/badge/tests-43%20passed-brightgreen)](#10-test-suite)
[![Node](https://img.shields.io/badge/Node.js-v18+-339933?logo=node.js&logoColor=white)](https://nodejs.org)
[![React](https://img.shields.io/badge/React-v18-61DAFB?logo=react&logoColor=black)](https://reactjs.org)

---

## Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [Project Structure](#2-project-structure)
3. [Tech Stack](#3-tech-stack)
4. [Data Models](#4-data-models)
5. [API Reference](#5-api-reference)
6. [AI Agent Design](#6-ai-agent-design)
7. [Stripe Integration](#7-stripe-integration)
8. [Authentication & Authorization](#8-authentication--authorization)
9. [Security Boundaries](#9-security-boundaries)
10. [Test Suite](#10-test-suite)
11. [Environment Variables](#11-environment-variables)
12. [Local Development](#12-local-development)
13. [Deployment](#13-deployment)

---

## 1. Architecture Overview

```
+-------------------------------------------------------------+
|                     React Frontend (CRA)                    |
|  ChatWidget -> /api/agent/chat   StripeCheckout -> Stripe.js|
+---------------------------+---------------------------------+
                            | HTTP / REST (Axios)
+---------------------------v---------------------------------+
|                   Express.js Backend (Node 18)             |
|                                                            |
|  +-------------+  +-------------+  +-----------------+    |
|  | Auth (JWT)  |  |  REST APIs  |  | Agent Controller|    |
|  +-------------+  +-------------+  +--------+--------+    |
|                                             |              |
|  +-----------------------------------------v----------+   |
|  |              services/agentTools.js                 |   |
|  |  getOrderStatus  checkReturnEligibility             |   |
|  |  initiateRefund  getDeliveryEstimate                |   |
|  +----------------------------+------------------------+   |
|                               |                            |
|  +----------------------------v------------------------+   |
|  |        services/policyEngine.js (deterministic)     |   |
|  +-----------------------------------------------------+   |
|                                                            |
|  +------------------------------------------------------+  |
|  | routes/adminApprovals.js -> services/refundService.js|  |
|  | (Admin only -- calls Stripe AFTER human approval)    |  |
|  +------------------------------------------------------+  |
+----------+-----------------------------------+--------------+
           |                                   |
    +------v------+                   +--------v------+
    |  MongoDB    |                   |  Stripe API   |
    |  (Atlas)    |                   |  (test mode)  |
    +-------------+                   +---------------+
           |
    +------v------+
    | Google AI   |
    | Gemini API  |
    +-------------+
```

**Key design decisions:**
- The Gemini model **never determines** eligibility, amounts, or user identity — all resolved server-side.
- Stripe is **never called** by the AI agent. It is called exclusively after an authenticated admin approves a `PendingApproval` record.
- `STRIPE_SECRET_KEY` **never leaves the backend process**. The frontend only receives a `client_secret` scoped to one PaymentIntent.

---

## 2. Project Structure

```
BuyEasy/
├── backend/
│   ├── config/db.js                      # Mongoose connection
│   ├── controllers/
│   │   ├── agentController.js            # Gemini function-calling loop + audit log
│   │   ├── authController.js             # Register, login, forgot/reset password
│   │   ├── cartController.js             # Cart CRUD
│   │   ├── deliveryController.js         # Delivery lifecycle
│   │   ├── orderController.js            # Order placement & status updates
│   │   ├── paymentController.js          # PaymentIntent creation + process/verify
│   │   ├── productController.js          # Product CRUD + MongoDB text search
│   │   ├── reviewController.js           # Reviews (one per user per product)
│   │   └── userController.js             # Admin user management
│   ├── middleware/
│   │   ├── auth.js                       # JWT protect + role authorize
│   │   ├── error.js                      # Global error handler
│   │   └── upload.js                     # Multer (5 MB image uploads)
│   ├── models/
│   │   ├── AgentActionLog.js             # Immutable AI tool call audit trail
│   │   ├── Cart.js / Delivery.js / Order.js / Payment.js / Product.js
│   │   ├── PendingApproval.js            # Staged refunds awaiting admin sign-off
│   │   ├── Review.js / User.js
│   ├── routes/
│   │   ├── adminApprovals.js             # /api/admin (approve/reject, audit log)
│   │   ├── agent.js                      # /api/agent/chat
│   │   └── auth, cart, deliveries, orders, payments, products, reviews, users
│   ├── services/
│   │   ├── agentTools.js                 # 4 tools the LLM can invoke
│   │   ├── policyEngine.js               # Deterministic return eligibility rules
│   │   ├── refundService.js              # Shared refund executor
│   │   └── stripe.js                     # Stripe SDK singleton (backend-only)
│   ├── tests/
│   │   ├── agentSecurity.test.js / policyEngine.test.js
│   │   └── refundWorkflow.test.js / stripePayments.test.js
│   ├── utils/email.js                    # Nodemailer transporter & templates
│   └── server.js                         # Express entry point
│
├── frontend/src/
│   ├── components/
│   │   ├── AdminRoute.js / PrivateRoute.js   # Route guards
│   │   ├── ChatWidget.js                     # Floating AI support chat
│   │   └── StripeCheckout.js                 # PaymentElement + intent flow
│   ├── context/AuthContext.js / CartContext.js
│   ├── pages/
│   │   ├── admin/
│   │   │   ├── AuditLog.js               # View agent action log
│   │   │   ├── PendingApprovals.js       # Approve/reject refunds
│   │   │   └── Dashboard, Orders, Products, Users
│   │   └── Cart, Checkout, Home, Login, Register, OrderDetails,
│   │       Orders, ProductDetails, Products, Profile
│   ├── services/api.js                   # Axios instance (Bearer token)
│   └── App.js                            # Root router & ChatWidget mount
│
├── seed.js                               # DB seeding (products + admin user)
├── package.json                          # Concurrently scripts + Jest config
└── .env.example
```

---

## 3. Tech Stack

### Backend

| Package | Purpose |
|---|---|
| `express` 4.x | Web framework |
| `mongoose` 7.x | MongoDB ODM |
| `jsonwebtoken` 9.x | Stateless JWT auth |
| `bcryptjs` 2.x | Password hashing |
| `stripe` 14.x | Payment gateway SDK |
| `@google/generative-ai` | Gemini function-calling API |
| `multer` 1.x | Multipart file upload |
| `nodemailer` 6.x | Transactional email |
| `express-validator` 7.x | Request input validation |
| `dotenv` 16.x | Environment variable management |

### Frontend

| Package | Purpose |
|---|---|
| `react` 18 | UI framework |
| `react-router-dom` 6 | Client-side routing |
| `axios` | HTTP client |
| `@stripe/stripe-js` + `@stripe/react-stripe-js` | Client-side Stripe.js + PaymentElement |
| `react-icons` | Icon library |

### Tooling

| Tool | Purpose |
|---|---|
| `jest` | Unit test runner (43 tests) |
| `nodemon` | Hot-reload dev server |
| `concurrently` | Run frontend + backend simultaneously |

---

## 4. Data Models

### User
```
name, email (unique, lowercase), password (bcrypt, select:false),
role ('user'|'admin', default 'user'), phone,
address { street, city, state, zipCode, country },
avatar, isEmailVerified, resetPasswordToken, resetPasswordExpire
```

### Product
```
name (text-indexed), description (text-indexed), price, comparePrice,
category: 'Electronics'|'Clothing'|'Sports'|'Home & Furniture'|
          'Home & Garden'|'Accessories'|'Books'|'Food'|'Hand Bags'|'Other',
brand, stock, images[], thumbnail, specifications (Map<String,String>),
tags[] (text-indexed), rating, numReviews, isFeatured, isActive, discount (%), soldCount
```

### Order
```
user (->User), orderItems [{ product, name, quantity, price, image }],
shippingAddress { street, city, state, zipCode, country, phone },
paymentMethod: 'Card'|'PayPal'|'Cash on Delivery',
paymentResult { id, status, updateTime, emailAddress },
itemsPrice, taxPrice, shippingPrice, totalPrice,
orderStatus: 'Pending'|'Processing'|'Shipped'|'Delivered'|'Cancelled',
isPaid, paidAt, isDelivered, deliveredAt, orderNotes, trackingNumber
```

### Payment
```
paymentId (PAY+timestamp), order (->Order), amount,
paymentMethod: 'Credit Card'|'Debit Card'|'PayPal'|'Cash on Delivery'|'UPI'|'Net Banking',
status: 'Pending'|'Processing'|'Completed'|'Failed'|'Refunded',
transactionId (Stripe pi_... or legacy TXN-),
cardDetails { last4Digits, cardType, expiryMonth, expiryYear },
gatewayResponse (Map), refundAmount, refundDate, refundReason,
refundTransactionId (Stripe re_..., stored after admin approval)
```

### PendingApproval *(AI refund staging)*
```
orderId (String, required), userId (->User),
action (default 'initiateRefund'),
reason (String, max 1000 chars -- ONLY LLM-supplied value stored),
requestedAmount (Number, from order.totalPrice -- NEVER from LLM),
status: 'pending'|'approved'|'rejected',
processedBy (->User admin), processedAt
```

### AgentActionLog *(immutable audit trail)*
```
userId (->User, required),
action: 'getOrderStatus'|'checkReturnEligibility'|'initiateRefund'
       |'getDeliveryEstimate'|'refundApproved'|'refundRejected',
orderId (String, nullable),
params (Mixed -- userId NEVER stored here),
result (Mixed -- shaped output, never raw Mongoose doc),
status: 'SUCCESS'|'FAILED'|'PENDING_APPROVAL'|'APPROVED'|'REJECTED',
requiresApproval (Boolean), approvedBy (->User, null for standard calls), timestamp
```

### Delivery
```
deliveryId (auto), order (->Order), trackingNumber (auto),
status: 'Pending'|'In Transit'|'Out for Delivery'|'Delivered'|'Failed',
estimatedDate, actualDeliveryDate, carrier,
shippingAddress { street, city, state, zipCode, country, phone },
deliveryNotes, signature
```

### Review
```
product (->Product), user (->User), rating (1-5, required),
title, comment, images[], helpful (count), verified (Boolean)
```
> Unique compound index on `{ product, user }` — one review per user per product.

---

## 5. API Reference

Base URL: `http://localhost:5000/api`

### Auth `/api/auth`

| Method | Endpoint | Access | Description |
|---|---|---|---|
| POST | `/register` | Public | Register |
| POST | `/login` | Public | Login, returns JWT |
| POST | `/forgotpassword` | Public | Send reset email |
| PUT | `/resetpassword/:token` | Public | Reset via token |
| GET | `/me` | Private | Current user |
| PUT | `/updatedetails` | Private | Update profile |
| PUT | `/updatepassword` | Private | Change password |

### Products `/api/products`

| Method | Endpoint | Access | Description |
|---|---|---|---|
| GET | `/` | Public | List (filters, search, pagination) |
| GET | `/:id` | Public | Single product |
| GET | `/categories` | Public | All categories |
| GET | `/brands` | Public | All brands |
| POST | `/` | Admin | Create product |
| PUT | `/:id` | Admin | Update product |
| DELETE | `/:id` | Admin | Delete product |

### Reviews `/api/products/:productId/reviews`

| Method | Endpoint | Access | Description |
|---|---|---|---|
| GET | `/` | Public | All reviews for product |
| POST | `/` | Private | Add review (one per user) |

### Cart `/api/cart`

| Method | Endpoint | Access | Description |
|---|---|---|---|
| GET | `/` | Private | Get cart |
| POST | `/` | Private | Add item |
| DELETE | `/` | Private | Clear cart |
| PUT | `/:itemId` | Private | Update quantity |
| DELETE | `/:itemId` | Private | Remove item |

### Orders `/api/orders`

| Method | Endpoint | Access | Description |
|---|---|---|---|
| GET | `/` | Admin | All orders |
| GET | `/myorders` | Private | User's orders |
| GET | `/:id` | Private | Single order |
| POST | `/` | Private | Place order |
| PUT | `/:id/pay` | Private | Mark paid |
| PUT | `/:id/status` | Admin | Update status |
| PUT | `/:id/cancel` | Private | Cancel order |

### Payments `/api/payments`

| Method | Endpoint | Access | Description |
|---|---|---|---|
| POST | `/create-intent` | Private | Create Stripe PaymentIntent, returns `clientSecret` |
| POST | `/` | Private | Create payment record |
| POST | `/:id/process` | Private | Verify Stripe intent, mark order paid |
| GET | `/my` | Private | User's payments |
| GET | `/order/:orderId` | Private | Payment by order |
| GET | `/:id` | Private | Payment by ID |
| GET | `/` | Admin | All payments |
| POST | `/:id/refund` | Admin | Manual direct refund |

### AI Agent `/api/agent`

| Method | Endpoint | Access | Description |
|---|---|---|---|
| POST | `/chat` | Private | Gemini function-calling chat |

Request: `{ "message": "...", "lastOrderId": "..." }`
Response: `{ "reply": "...", "lastOrderId": "..." }`

### Admin Approvals `/api/admin`

| Method | Endpoint | Access | Description |
|---|---|---|---|
| GET | `/pending-approvals` | Admin | List pending refund requests |
| PUT | `/pending-approvals/:id/approve` | Admin | Approve -> triggers Stripe refund |
| PUT | `/pending-approvals/:id/reject` | Admin | Reject request |
| GET | `/audit-log` | Admin | Last 200 agent action log entries |

### Deliveries `/api/deliveries`

| Method | Endpoint | Access | Description |
|---|---|---|---|
| GET | `/track/:trackingNumber` | Public | Track delivery |
| GET | `/order/:orderId` | Private | Delivery for order |
| GET | `/:id` | Private | Delivery by ID |
| PUT | `/:id/confirm` | Private | Confirm delivery |
| POST | `/` | Admin | Create delivery record |
| GET | `/` | Admin | All deliveries |
| PUT | `/:id/status` | Admin | Update status |

### Users `/api/users`

| Method | Endpoint | Access | Description |
|---|---|---|---|
| GET | `/` | Admin | All users |
| GET | `/:id` | Admin | Single user |
| PUT | `/:id` | Admin | Update user |
| DELETE | `/:id` | Admin | Delete user |

---

## 6. AI Agent Design

**Model:** `gemini-3.6-flash` via `@google/generative-ai` (function-calling mode).

### Tool Schemas

`userId` is deliberately absent from all tool schemas — the LLM cannot supply or influence who the query runs as.

| Tool | LLM provides | Server injects |
|---|---|---|
| `getOrderStatus` | `orderId` | `req.user.id` |
| `checkReturnEligibility` | `orderId` | `req.user.id` |
| `initiateRefund` | `orderId`, `reason` | `req.user.id` |
| `getDeliveryEstimate` | `orderId` | `req.user.id` |

### Deterministic Policy Engine (`policyEngine.js`)

Four hard-coded rules — no AI involved. The LLM only narrates the result; it cannot override the verdict.

1. `orderStatus === 'Delivered'`
2. `deliveredAt` must be present (no fallback to `updatedAt` — deliberate financial policy)
3. Within **30 calendar days** of `deliveredAt`
4. No `category === 'Food'` items (non-returnable)

### Refund Flow

```
User: "I want a refund"
    |
    v Agent: checkReturnEligibility(orderId)
        |-- eligible: false -> agent explains, does NOT call initiateRefund
        |
        +-- eligible: true
              |
              v Agent: initiateRefund(orderId, reason)
                  |
                  v agentTools.js:
                    1. Re-runs eligibility check server-side
                    2. Checks for existing pending approval (duplicate guard)
                    3. refundAmount = order.totalPrice  [DB only, never LLM]
                    4. Creates PendingApproval record
                  |
                  v "Submitted for admin review"
                       |
                       v Admin: PUT /api/admin/pending-approvals/:id/approve
                           1. status !== 'pending' -> 409 (primary idempotency)
                           2. processRefund(payment._id, requestedAmount, reason)
                           3. stripe.refunds.create({ payment_intent: pi_..., amount: cents })
                           4. Payment.refundTransactionId = re_...
                           5. PendingApproval.status = 'approved'
                           6. AgentActionLog: refundApproved event written
```

### Safety

- Tool call cap: **5 per request** (`MAX_TOOL_CALLS = 5`)
- Thinking `parts` with `thought_signature` echoed back verbatim (required by `gemini-3.6-flash`)
- 429 quota exhaustion caught and returned as a plain-language user message
- Unknown tool names rejected before any dispatch

---

## 7. Stripe Integration

**Test mode only.** No real money moves.

### Frontend Payment Flow (`StripeCheckout.js`)

```
1. POST /api/payments/create-intent { orderId }
   Backend: verifies order.user === req.user.id
            stripe.paymentIntents.create({ amount: cents, currency: 'usd' })
   Returns: { clientSecret }

2. <PaymentElement> renders Stripe's hosted iframe
   BuyEasy never touches raw card data (PCI via Stripe)

3. stripe.confirmPayment() runs client-side on form submit

4. On succeeded:
   POST /api/payments/:id/process { paymentIntentId: "pi_..." }
   Backend: stripe.paymentIntents.retrieve(id) confirms status === 'succeeded'
            Payment.status = 'Completed', Order.isPaid = true
```

### Refund Execution (`refundService.js`)

```javascript
// Called ONLY after admin approval
if (payment.transactionId.startsWith('pi_')) {
  const refund = await stripe.refunds.create({
    payment_intent: payment.transactionId,
    amount: Math.round(amount * 100), // USD dollars -> cents
  });
  payment.refundTransactionId = refund.id; // re_...
}
// TXN- records skip Stripe (internal legacy records only)
```

**Currency: USD | Unit: cents (`Math.round(dollars * 100)`)**

### Stripe Key IDs

| Identifier | Prefix |
|---|---|
| PaymentIntent | `pi_` |
| Refund | `re_` |
| Legacy/demo | `TXN-` |

**Test card:** `4242 4242 4242 4242` · any future expiry · any CVC

---

## 8. Authentication & Authorization

1. `POST /api/auth/login` returns signed JWT (`JWT_SECRET`, `JWT_EXPIRE`)
2. Frontend attaches `Authorization: Bearer <token>` via Axios in `services/api.js`
3. `protect()`: verifies JWT + live DB lookup (`req.user = await User.findById(...)`)
4. `authorize('admin')`: checks `req.user.role === 'admin'`

| Role | Access |
|---|---|
| `user` | Own cart, orders, payments, reviews; AI chat agent |
| `admin` | All of the above + user/product/order management, pending approvals, audit log |

---

## 9. Security Boundaries

| Boundary | Implementation |
|---|---|
| Stripe secret backend-only | `stripe.js` reads env only; frontend receives scoped `clientSecret` |
| Refund amount from DB only | `agentTools.initiateRefund` reads `order.totalPrice`; `reason` is only LLM string accepted |
| Agent cannot call Stripe | `agentTools.js` has no Stripe import; Stripe only reachable via admin-auth `refundService` |
| Order ownership at query | `Order.findOne({ _id, user: authenticatedUserId })` -- 404 and 403 are indistinguishable |
| Primary idempotency | `pendingApproval.status !== 'pending'` -> 409 before any Stripe call |
| Secondary idempotency | `payment.status === 'Refunded'` -> early return in `refundService.js` |
| Admin-only Stripe trigger | Router-level `protect` + `authorize('admin')` on all `/api/admin` routes |
| Tool call cap | `MAX_TOOL_CALLS = 5` |
| `userId` absent from schemas | LLM cannot construct or influence the authenticated user ID |

---

## 10. Test Suite

```bash
npm test
```

```
PASS backend/tests/stripePayments.test.js
PASS backend/tests/policyEngine.test.js
PASS backend/tests/agentSecurity.test.js
PASS backend/tests/refundWorkflow.test.js

Test Suites: 4 passed, 4 total
Tests:       43 passed, 43 total
Time:        ~0.4 s
```

| Test File | Coverage |
|---|---|
| `stripePayments.test.js` | PaymentIntent creation, USD/cents conversion, amount verification, mock Stripe SDK |
| `policyEngine.test.js` | All 4 return eligibility rules: delivered status, 30-day window, Food category, missing `deliveredAt` |
| `agentSecurity.test.js` | `userId` absent from schemas, ownership enforcement, unknown tool rejection, MAX_TOOL_CALLS cap |
| `refundWorkflow.test.js` | Full eligibility -> pending -> approve, idempotency (409 on double-click), `pi_` vs `TXN-` branching |

---

## 11. Environment Variables

### Root `.env` (backend)

```env
# Server
NODE_ENV=development
PORT=5000

# MongoDB
MONGO_URI=mongodb+srv://<user>:<pass>@cluster.mongodb.net/buyeasy

# JWT
JWT_SECRET=your_super_secret_jwt_key
JWT_EXPIRE=30d

# Stripe  --  NEVER expose STRIPE_SECRET_KEY to the frontend
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...

# Google Gemini AI
# Get key at: https://aistudio.google.com/app/apikey
GEMINI_API_KEY=your_gemini_api_key_here

# Email (Nodemailer)
EMAIL_HOST=smtp.mailtrap.io
EMAIL_PORT=2525
EMAIL_USER=your_email_user
EMAIL_PASS=your_email_password
FROM_NAME=BuyEasy
FROM_EMAIL=noreply@buyeasy.com

# File Upload
FILE_UPLOAD_PATH=./uploads
MAX_FILE_SIZE=5242880
```

### `frontend/.env`

```env
REACT_APP_STRIPE_PUBLISHABLE_KEY=pk_test_...
REACT_APP_API_URL=http://localhost:5000/api
```

> Never commit `.env` files — both are in `.gitignore`.

---

## 12. Local Development

```bash
# 1. Clone
git clone https://github.com/TanujaGunjal/BuyEasy.git
cd BuyEasy

# 2. Install all dependencies
npm run install:all

# 3. Configure environment
cp .env.example .env
# Fill: MONGO_URI, JWT_SECRET, STRIPE_SECRET_KEY, GEMINI_API_KEY
# Create frontend/.env with REACT_APP_STRIPE_PUBLISHABLE_KEY

# 4. (Optional) Seed database
node seed.js

# 5. Run both servers
npm run dev:all
# Backend:  http://localhost:5000
# Frontend: http://localhost:3000
```

### Scripts

| Command | Description |
|---|---|
| `npm run dev` | Backend only (Nodemon) |
| `npm run client` | Frontend only (CRA dev server) |
| `npm run dev:all` | Both concurrently |
| `npm run install:all` | Install root + frontend deps |
| `npm test` | Jest test suite (43 tests) |
| `node seed.js` | Seed DB with sample products + admin user |

**Upload formats:** `jpeg`, `jpg`, `png`, `gif`, `webp` — max **5 MB** per file.

---

## 13. Deployment

### Frontend — Vercel

1. Connect GitHub repo to [Vercel](https://vercel.com)
2. Set **Root Directory** to `frontend`
3. Add env var: `REACT_APP_STRIPE_PUBLISHABLE_KEY=pk_test_...`

### Backend — Render

1. Create Web Service on [Render](https://render.com)
2. **Build Command:** `npm install`
3. **Start Command:** `node backend/server.js`
4. Add all root `.env` vars in the Render dashboard

> **CORS:** `server.js` whitelists `localhost:3000` and `buyeasy-six.vercel.app`. Update when deploying to a custom domain.

### Database — MongoDB Atlas

1. Free cluster at [mongodb.com/cloud/atlas](https://www.mongodb.com/cloud/atlas)
2. Whitelist Render IP (or `0.0.0.0/0`)
3. Copy connection string to `MONGO_URI`

---

## Author

**Tanuja Gunjal** — [@TanujaGunjal](https://github.com/TanujaGunjal)

---

*Made with ❤️ using the MERN Stack*


---

## 📖 Table of Contents

- [Overview](#-overview)
- [Features](#-features)
- [Tech Stack](#-tech-stack)
- [Project Structure](#-project-structure)
- [API Endpoints](#-api-endpoints)
- [Data Models](#-data-models)
- [Getting Started](#-getting-started)
- [Environment Variables](#-environment-variables)
- [Scripts](#-scripts)
- [Deployment](#-deployment)

---

## 🌐 Overview

BuyEasy is a fully functional, full-stack e-commerce web application that provides a smooth and secure online shopping experience. It supports user authentication, product browsing and search, cart management, order placement with multiple payment options, delivery tracking, and a complete admin dashboard — all powered by a RESTful API backend.

**Live Demo:**
- 🖥️ Frontend: [buyeasy-six.vercel.app](https://buyeasy-six.vercel.app)

---

## ✨ Features

### 👤 User Features
| Feature | Description |
|---|---|
| 🔐 Authentication | Register & login with JWT-based authentication |
| 🛍️ Product Browsing | Browse products with filters by category, brand, and price |
| 🔍 Product Search | Full-text search powered by MongoDB text indexes |
| 📄 Product Details | View detailed product info, images, specs, ratings & reviews |
| 🛒 Cart Management | Add/remove items, update quantities |
| 💳 Checkout & Payment | Multi-step checkout with Card, PayPal, or Cash on Delivery |
| 📦 Order Tracking | View order history and status (Pending → Shipped → Delivered) |
| 👤 User Profile | Manage personal info and saved address |
| ⭐ Reviews | Leave ratings and reviews on purchased products |
| 📧 Email Notifications | Automated order confirmation emails via Nodemailer |
| 📱 Responsive Design | Fully responsive on all screen sizes |

### 🛠️ Admin Features
| Feature | Description |
|---|---|
| 📊 Dashboard | Overview stats for orders, users, and products |
| 📦 Product Management | Create, update, and delete products with image uploads |
| 👥 User Management | View and manage registered users |
| 🧾 Order Management | View all orders and update order statuses |
| 🚚 Delivery Management | Manage delivery details and tracking information |

---

## 🧰 Tech Stack

### Frontend
| Technology | Purpose |
|---|---|
| **React.js 18** | UI framework |
| **React Router DOM v6** | Client-side routing & navigation |
| **Axios** | HTTP client for API calls |
| **React Icons** | UI icon library |
| **Context API** | Global state management (Auth & Cart) |
| **CSS** | Custom styling |

### Backend
| Technology | Purpose |
|---|---|
| **Node.js** | JavaScript runtime |
| **Express.js 4** | Web application framework |
| **MongoDB + Mongoose** | NoSQL database & ODM |
| **JSON Web Tokens (JWT)** | Stateless authentication |
| **bcryptjs** | Password hashing |
| **Multer** | File/image upload handling |
| **Nodemailer** | Transactional email sending |
| **Stripe** | Payment gateway integration |
| **express-validator** | Request input validation |

### Dev & Tooling
| Tool | Purpose |
|---|---|
| **Nodemon** | Auto-reloading dev server |
| **Concurrently** | Run frontend & backend simultaneously |
| **Jest** | Unit testing |
| **dotenv** | Environment variable management |

### Deployment
| Service | Purpose |
|---|---|
| **Vercel** | Frontend hosting |
| **Render** | Backend hosting |
| **MongoDB Atlas** | Cloud database |

---

## 📁 Project Structure

```
BuyEasy/
├── backend/
│   ├── config/
│   │   └── db.js                   # MongoDB connection setup
│   ├── controllers/
│   │   ├── authController.js       # Register, login, password reset
│   │   ├── cartController.js       # Cart CRUD operations
│   │   ├── deliveryController.js   # Delivery management
│   │   ├── orderController.js      # Order creation & management
│   │   ├── paymentController.js    # Payment processing & refunds
│   │   ├── productController.js    # Product CRUD & search
│   │   ├── reviewController.js     # Product reviews
│   │   └── userController.js       # User profile management
│   ├── middleware/
│   │   ├── auth.js                 # JWT protect & role-based authorize
│   │   ├── error.js                # Global error handler
│   │   └── upload.js               # Multer file upload config
│   ├── models/
│   │   ├── Cart.js
│   │   ├── Delivery.js
│   │   ├── Order.js
│   │   ├── Payment.js
│   │   ├── Product.js
│   │   ├── Review.js
│   │   └── User.js
│   ├── routes/
│   │   ├── auth.js
│   │   ├── cart.js
│   │   ├── deliveries.js
│   │   ├── orders.js
│   │   ├── payments.js
│   │   ├── products.js
│   │   ├── reviews.js
│   │   └── users.js
│   ├── utils/
│   │   ├── email.js                # Nodemailer transporter & templates
│   │   └── helpers.js              # Utility/helper functions
│   ├── seed.js                     # Database seeding script
│   └── server.js                   # Express app entry point
│
├── frontend/
│   ├── public/
│   └── src/
│       ├── components/
│       │   ├── AdminRoute.js       # Admin-only route guard
│       │   ├── Footer.js
│       │   ├── Navbar.js
│       │   ├── PrivateRoute.js     # Auth-only route guard
│       │   └── ProductCard.js
│       ├── context/
│       │   ├── AuthContext.js      # Global auth state (user, token)
│       │   └── CartContext.js      # Global cart state
│       ├── pages/
│       │   ├── admin/
│       │   │   ├── Dashboard.js
│       │   │   ├── Orders.js
│       │   │   ├── Products.js
│       │   │   └── Users.js
│       │   ├── Cart.js
│       │   ├── Checkout.js
│       │   ├── Home.js
│       │   ├── Login.js
│       │   ├── OrderDetails.js
│       │   ├── Orders.js
│       │   ├── ProductDetails.js
│       │   ├── Products.js
│       │   ├── Profile.js
│       │   └── Register.js
│       ├── services/               # Axios API service wrappers
│       ├── App.js                  # Root component & route definitions
│       └── index.js
│
├── package.json                    # Root scripts (run both servers)
└── .gitignore
```

---

## 🔌 API Endpoints

Base URL: `http://localhost:5000/api`

### 🔐 Auth — `/api/auth`
| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/register` | Register a new user | Public |
| POST | `/login` | Login and receive JWT token | Public |
| POST | `/forgotpassword` | Send password reset email | Public |
| PUT | `/resetpassword/:resettoken` | Reset password using token | Public |
| GET | `/me` | Get currently logged-in user | Private |
| PUT | `/updatedetails` | Update name, email, phone, address | Private |
| PUT | `/updatepassword` | Change account password | Private |

### 🛍️ Products — `/api/products`
| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/` | Get all products (filter, search, paginate) | Public |
| GET | `/:id` | Get single product by ID | Public |
| GET | `/categories` | Get all product categories | Public |
| GET | `/brands` | Get all product brands | Public |
| POST | `/` | Create a new product | Admin |
| PUT | `/:id` | Update a product | Admin |
| DELETE | `/:id` | Delete a product | Admin |

### ⭐ Reviews — `/api/products/:productId/reviews`
| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/` | Get all reviews for a product | Public |
| POST | `/` | Add a review for a product | Private |

### 🛒 Cart — `/api/cart`
| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/` | Get current user's cart | Private |
| POST | `/` | Add item to cart | Private |
| DELETE | `/` | Clear entire cart | Private |
| PUT | `/:itemId` | Update cart item quantity | Private |
| DELETE | `/:itemId` | Remove a single item from cart | Private |

### 📦 Orders — `/api/orders`
| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/` | Get all orders | Admin |
| GET | `/myorders` | Get current user's orders | Private |
| GET | `/:id` | Get single order by ID | Private |
| POST | `/` | Place a new order | Private |
| PUT | `/:id/pay` | Mark order as paid | Private |
| PUT | `/:id/status` | Update order status | Admin |
| PUT | `/:id/cancel` | Cancel an order | Private |

### 💳 Payments — `/api/payments`
| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/` | Create a payment record | Private |
| POST | `/:id/process` | Process (execute) a payment | Private |
| GET | `/my` | Get current user's payments | Private |
| GET | `/order/:orderId` | Get payment by order ID | Private |
| GET | `/:id` | Get payment details by ID | Private |
| GET | `/` | Get all payments | Admin |
| POST | `/:id/refund` | Initiate a refund | Admin |

### 🚚 Deliveries — `/api/deliveries`
| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/track/:trackingNumber` | Track delivery by tracking number | Public |
| GET | `/order/:orderId` | Get delivery details by order | Private |
| GET | `/:id` | Get delivery details by ID | Private |
| PUT | `/:id/confirm` | Confirm delivery (with signature) | Private |
| POST | `/` | Create a new delivery record | Admin |
| GET | `/` | Get all deliveries | Admin |
| PUT | `/:id/status` | Update delivery status | Admin |

### 👥 Users — `/api/users`
| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/` | Get all users | Admin |
| GET | `/:id` | Get single user by ID | Admin |
| PUT | `/:id` | Update user details | Admin |
| DELETE | `/:id` | Delete a user | Admin |

---

## 🗄️ Data Models

### User
```
name, email, password (hashed), role (user|admin),
phone, address {street, city, state, zipCode, country},
avatar, isEmailVerified, resetPasswordToken
```

### Product
```
name, description, price, comparePrice, category, brand,
stock, images[], thumbnail, specifications (Map), tags[],
rating, numReviews, isFeatured, isActive, discount, soldCount
```
**Categories:** Electronics, Clothing, Sports, Home & Furniture, Home & Garden, Accessories, Books, Food, Hand Bags, Other

### Cart
```
user (1-to-1), items[{product, quantity, price, addedAt}],
totalItems, totalPrice
```
> Cart totals are auto-computed via a pre-save hook.

### Order
```
user, orderItems[{product, name, quantity, price, image}],
shippingAddress {street, city, state, zipCode, country, phone},
paymentMethod (Card|PayPal|Cash on Delivery),
paymentResult {id, status, updateTime, emailAddress},
itemsPrice, taxPrice, shippingPrice, totalPrice,
orderStatus (Pending|Processing|Shipped|Delivered|Cancelled),
isPaid, paidAt, isDelivered, deliveredAt,
orderNotes, trackingNumber
```

### Payment
```
paymentId (auto-generated), order, amount,
paymentMethod (Credit Card|Debit Card|PayPal|Cash on Delivery|UPI|Net Banking),
status (Pending|Processing|Completed|Failed|Refunded),
transactionId, cardDetails {last4Digits, cardType, expiryMonth, expiryYear},
gatewayResponse (Map), refundAmount, refundDate, refundReason
```

### Delivery
```
deliveryId (auto-generated), order, trackingNumber (auto-generated),
status (Pending|In Transit|Out for Delivery|Delivered|Failed),
estimatedDate, actualDeliveryDate, carrier,
shippingAddress {street, city, state, zipCode, country, phone},
deliveryNotes, signature
```

### Review
```
product, user, rating (1–5, required), title, comment,
images[], helpful (count), verified (boolean)
```
> One review per user per product enforced via a unique compound index.

---

## 🚀 Getting Started

### Prerequisites
- [Node.js](https://nodejs.org/) v18 or higher
- [MongoDB](https://www.mongodb.com/) (local installation or [MongoDB Atlas](https://www.mongodb.com/cloud/atlas) account)
- npm v9 or higher

### 1. Clone the Repository

```bash
git clone https://github.com/TanujaGunjal/BuyEasy.git
cd BuyEasy
```

### 2. Install All Dependencies

Install root, backend, and frontend dependencies in one command:

```bash
npm run install:all
```

Or manually:

```bash
# Root dependencies
npm install

# Frontend dependencies
cd frontend && npm install && cd ..
```

### 3. Configure Environment Variables

Create a `.env` file in the root directory and fill in the required values (see [Environment Variables](#-environment-variables) below).

### 4. Seed the Database (Optional)

Populate the database with sample products and an admin user:

```bash
node backend/seed.js
```

### 5. Run the Application

**Run both frontend and backend simultaneously:**

```bash
npm run dev:all
```

**Or run them separately:**

```bash
# Terminal 1 – Backend (http://localhost:5000)
npm run dev

# Terminal 2 – Frontend (http://localhost:3000)
npm run client
```

---

## ⚙️ Environment Variables

Create a `.env` file in the project root with the following variables:

```env
# Server
NODE_ENV=development
PORT=5000

# MongoDB
MONGO_URI=mongodb+srv://<username>:<password>@cluster.mongodb.net/buyeasy

# JWT
JWT_SECRET=your_super_secret_jwt_key
JWT_EXPIRE=30d

# Email (Nodemailer)
EMAIL_HOST=smtp.mailtrap.io
EMAIL_PORT=2525
EMAIL_USER=your_email_user
EMAIL_PASS=your_email_password
FROM_NAME=BuyEasy
FROM_EMAIL=noreply@buyeasy.com

# Stripe Payment Gateway
STRIPE_SECRET_KEY=sk_test_your_stripe_secret_key
STRIPE_PUBLISHABLE_KEY=pk_test_your_stripe_publishable_key

# File Upload
FILE_UPLOAD_PATH=./uploads
MAX_FILE_SIZE=5242880
```

> ⚠️ **Never commit your `.env` file to version control.** It is already listed in `.gitignore`.

**Supported image formats for uploads:** `jpeg`, `jpg`, `png`, `gif`, `webp` (max **5 MB** per file).

---

## 📜 Scripts

| Command | Description |
|---------|-------------|
| `npm start` | Start the backend server in production mode |
| `npm run dev` | Start backend with Nodemon (hot-reload) |
| `npm run client` | Start the React frontend dev server |
| `npm run dev:all` | Run both frontend and backend concurrently |
| `npm run install:all` | Install dependencies for root and frontend |
| `npm test` | Run Jest test suite |
| `node backend/seed.js` | Seed database with sample data |

---

## 🌍 Deployment

### Frontend (Vercel)

1. Connect your GitHub repository to [Vercel](https://vercel.com).
2. Set the **Root Directory** to `frontend`.
3. Vercel auto-detects Create React App — no extra config needed.
4. Add environment variables if needed (e.g., `REACT_APP_API_URL`).

### Backend (Render)

1. Create a new **Web Service** on [Render](https://render.com).
2. Connect your GitHub repository.
3. Set **Build Command**: `npm install`
4. Set **Start Command**: `node backend/server.js`
5. Add all required environment variables from the section above.

### Database (MongoDB Atlas)

1. Create a free cluster on [MongoDB Atlas](https://www.mongodb.com/cloud/atlas).
2. Whitelist your Render server's IP address (or use `0.0.0.0/0` for all IPs).
3. Copy your **Connection String** and set it as `MONGO_URI` in your environment variables.

---

## 📄 License

This project is licensed under the **MIT License** — see the [LICENSE](LICENSE) file for details.

---

## 💳 Stripe Test Mode

BuyEasy uses **Stripe in TEST MODE only**. No real money is ever moved.

### Configuration

Add your Stripe test keys to `.env` (backend):

```env
STRIPE_SECRET_KEY=sk_test_...   # Secret key — NEVER expose this to the browser
STRIPE_PUBLISHABLE_KEY=pk_test_... # Publishable key — safe for frontend
```

Add to `frontend/.env`:

```env
REACT_APP_STRIPE_PUBLISHABLE_KEY=pk_test_...
```

> ⚠️ **Never commit real Stripe keys.** `.env` is in `.gitignore`.

### How to Test Checkout

1. Register or login as a user.
2. Add items to your cart and proceed to checkout.
3. Select **Credit/Debit Card** as payment method.
4. Place the order — you'll be redirected to the Order Details page.
5. Enter Stripe's test card:
   - **Card number:** `4242 4242 4242 4242`
   - **Expiry:** any future date (e.g. `12/34`)
   - **CVC:** any 3 digits (e.g. `123`)
6. Click **Pay Now**.
7. The payment succeeds, and your order is marked **Paid**.
8. The `Payment` record in MongoDB now contains a `transactionId` that starts with `pi_...`.

### How to Request a Refund via the AI Agent

1. Login as the customer.
2. Click the **🤖 chat bubble** (bottom-right).
3. Ask: *"I want a refund for my order because it arrived damaged."*
4. The agent will:
   - Call `checkReturnEligibility` (deterministic policy — 30-day window, category rules)
   - If eligible, call `initiateRefund` → creates a **PendingApproval** record
   - **Stripe is NOT called at this stage**

### How Admin Approves the Refund

1. Login as admin (`admin@buyeasy.com`).
2. Navigate to the **Admin Panel → Pending Approvals**.
3. Click **Approve**.
4. The backend:
   - Verifies admin authorization
   - Checks `PendingApproval.status === 'pending'` (idempotency guard)
   - Calls `stripe.refunds.create({ payment_intent: pi_..., amount: <cents> })`
   - Stores the Stripe refund ID (`re_...`) in `Payment.refundTransactionId`
   - Sets `Payment.status = 'Refunded'`
   - Writes `refundApproved` to the **AgentActionLog**
5. Click **Approve** again → you get `409: Already processed` — no duplicate refund is created.

### Verifying in Stripe Dashboard

1. Go to [dashboard.stripe.com](https://dashboard.stripe.com) → switch to **Test mode**.
2. **Payments** → find your PaymentIntent (`pi_...`) → status: Succeeded.
3. **Refunds** → find your Refund (`re_...`) → status: Succeeded.

### Key IDs

| Identifier | Prefix | Example |
|---|---|---|
| Stripe PaymentIntent | `pi_` | `pi_3abc123...` |
| Stripe Refund | `re_` | `re_3def456...` |
| Demo/legacy (non-Stripe) | `TXN-` | `TXN-DEMO-001` |

> Legacy demo records with `TXN-` IDs skip the Stripe Refund API call and are processed as internal-only refunds. Only `pi_`-backed payments trigger a live Stripe refund.

---

## 👩‍💻 Author

**BuyEasy Team**
GitHub: [@TanujaGunjal](https://github.com/TanujaGunjal)

---

<p align="center">Made with ❤️ using the MERN Stack</p>
