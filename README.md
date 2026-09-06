# BuyEasy — Full-Stack E-Commerce with AI Support Agent

> MERN stack e-commerce platform featuring a **Gemini AI support agent** with function-calling, **Stripe payment & refund integration**, and a **human-in-the-loop admin approval workflow** — built on Node.js, Express, React, and MongoDB.

[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)
[![Tests](https://img.shields.io/badge/tests-43%20passed-brightgreen)](#-test-suite)
[![Node](https://img.shields.io/badge/Node.js-v18+-339933?logo=node.js&logoColor=white)](https://nodejs.org)
[![React](https://img.shields.io/badge/React-v18-61DAFB?logo=react&logoColor=black)](https://reactjs.org)

**Live Demo:** 🖥️ Frontend: [buyeasy-six.vercel.app](https://buyeasy-six.vercel.app) | ⚙️ Backend API: [shopagent-6qrh.onrender.com](https://shopagent-6qrh.onrender.com)

---

## 📖 Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [Features](#2-features)
3. [Tech Stack](#3-tech-stack)
4. [Project Structure](#4-project-structure)
5. [Data Models](#5-data-models)
6. [API Reference](#6-api-reference)
7. [AI Agent Design](#7-ai-agent-design)
8. [Stripe Integration](#8-stripe-integration)
9. [Authentication & Authorization](#9-authentication--authorization)
10. [Security Boundaries](#10-security-boundaries)
11. [Test Suite](#11-test-suite)
12. [Environment Variables](#12-environment-variables)
13. [Getting Started](#13-getting-started)
14. [Scripts](#14-scripts)
15. [Deployment](#15-deployment)

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

## 2. Features

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
| 🤖 AI Support Chat | Floating chat agent powered by Gemini for order help & refunds |
| 📱 Responsive Design | Fully responsive on all screen sizes |

### 🛠️ Admin Features
| Feature | Description |
|---|---|
| 📊 Dashboard | Overview stats for orders, users, and products |
| 📦 Product Management | Create, update, and delete products with image uploads |
| 👥 User Management | View and manage registered users |
| 🧾 Order Management | View all orders and update order statuses |
| 🚚 Delivery Management | Manage delivery details and tracking information |
| ✅ Pending Approvals | Approve or reject AI-initiated refund requests |
| 📋 Audit Log | View immutable log of all AI agent tool calls |

---

## 3. Tech Stack

### Frontend
| Technology | Purpose |
|---|---|
| **React.js 18** | UI framework |
| **React Router DOM v6** | Client-side routing & navigation |
| **Axios** | HTTP client for API calls |
| **@stripe/react-stripe-js** | PaymentElement + Stripe.js integration |
| **React Icons** | Icon library |
| **Context API** | Global state management (Auth & Cart) |

### Backend
| Technology | Purpose |
|---|---|
| **Node.js** | JavaScript runtime |
| **Express.js 4** | Web application framework |
| **MongoDB + Mongoose 7** | NoSQL database & ODM |
| **JSON Web Tokens (JWT)** | Stateless authentication |
| **bcryptjs** | Password hashing |
| **Stripe 13** | Payment gateway SDK |
| **@google/generative-ai** | Gemini function-calling API |
| **Multer** | File/image upload handling (5 MB) |
| **Nodemailer** | Transactional email sending |
| **express-validator** | Request input validation |
| **dotenv** | Environment variable management |

### Tooling & Deployment
| Tool | Purpose |
|---|---|
| **Jest** | Unit test runner (43 tests) |
| **Nodemon** | Hot-reload dev server |
| **Concurrently** | Run frontend & backend simultaneously |
| **Vercel** | Frontend hosting |
| **Render** | Backend hosting |
| **MongoDB Atlas** | Cloud database |

---

## 4. Project Structure

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
│   │   ├── Cart.js
│   │   ├── Delivery.js
│   │   ├── Order.js
│   │   ├── Payment.js
│   │   ├── PendingApproval.js            # Staged refunds awaiting admin sign-off
│   │   ├── Product.js
│   │   ├── Review.js
│   │   └── User.js
│   ├── routes/
│   │   ├── adminApprovals.js             # /api/admin (approve/reject, audit log)
│   │   ├── agent.js                      # /api/agent/chat
│   │   ├── auth.js
│   │   ├── cart.js
│   │   ├── deliveries.js
│   │   ├── orders.js
│   │   ├── payments.js
│   │   ├── products.js
│   │   ├── reviews.js
│   │   └── users.js
│   ├── services/
│   │   ├── agentTools.js                 # 4 tools the LLM can invoke
│   │   ├── policyEngine.js               # Deterministic return eligibility rules
│   │   ├── refundService.js              # Shared refund executor
│   │   └── stripe.js                     # Stripe SDK singleton (backend-only)
│   ├── tests/
│   │   ├── agentSecurity.test.js
│   │   ├── policyEngine.test.js
│   │   ├── refundWorkflow.test.js
│   │   └── stripePayments.test.js
│   ├── utils/email.js                    # Nodemailer transporter & templates
│   └── server.js                         # Express entry point
│
├── frontend/src/
│   ├── components/
│   │   ├── AdminRoute.js                 # Admin-only route guard
│   │   ├── ChatWidget.js                 # Floating AI support chat
│   │   ├── Footer.js
│   │   ├── Navbar.js
│   │   ├── PrivateRoute.js               # Auth-only route guard
│   │   ├── ProductCard.js
│   │   └── StripeCheckout.js             # PaymentElement + intent flow
│   ├── context/
│   │   ├── AuthContext.js                # Global auth state (user, token)
│   │   └── CartContext.js                # Global cart state
│   ├── pages/
│   │   ├── admin/
│   │   │   ├── AuditLog.js               # View agent action log
│   │   │   ├── Dashboard.js
│   │   │   ├── Orders.js
│   │   │   ├── PendingApprovals.js       # Approve/reject refunds
│   │   │   ├── Products.js
│   │   │   └── Users.js
│   │   ├── Cart.js
│   │   ├── Checkout.js
│   │   ├── Home.js
│   │   ├── Login.js
│   │   ├── OrderDetails.js
│   │   ├── Orders.js
│   │   ├── ProductDetails.js
│   │   ├── Products.js
│   │   ├── Profile.js
│   │   └── Register.js
│   ├── services/api.js                   # Axios instance (Bearer token)
│   └── App.js                            # Root router & ChatWidget mount
│
├── backend/seed.js                       # DB seeding (products + admin user)
├── package.json                          # Concurrently scripts + Jest config
├── .env.example
└── .gitignore
```

---

## 5. Data Models

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

### Cart
```
user (1-to-1), items[{ product, quantity, price, addedAt }],
totalItems, totalPrice
```
> Cart totals are auto-computed via a pre-save hook.

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

## 6. API Reference

Base URL (local): `http://localhost:5000/api`  
Base URL (production): `https://shopagent-6qrh.onrender.com/api`

### 🔐 Auth — `/api/auth`
| Method | Endpoint | Access | Description |
|---|---|---|---|
| POST | `/register` | Public | Register a new user |
| POST | `/login` | Public | Login, returns JWT |
| POST | `/forgotpassword` | Public | Send password reset email |
| PUT | `/resetpassword/:token` | Public | Reset password via token |
| GET | `/me` | Private | Get current user |
| PUT | `/updatedetails` | Private | Update name, email, phone, address |
| PUT | `/updatepassword` | Private | Change account password |

### 🛍️ Products — `/api/products`
| Method | Endpoint | Access | Description |
|---|---|---|---|
| GET | `/` | Public | List products (filters, search, pagination) |
| GET | `/:id` | Public | Single product |
| GET | `/categories` | Public | All categories |
| GET | `/brands` | Public | All brands |
| POST | `/` | Admin | Create product |
| PUT | `/:id` | Admin | Update product |
| DELETE | `/:id` | Admin | Delete product |

### ⭐ Reviews — `/api/products/:productId/reviews`
| Method | Endpoint | Access | Description |
|---|---|---|---|
| GET | `/` | Public | All reviews for a product |
| POST | `/` | Private | Add review (one per user per product) |

### 🛒 Cart — `/api/cart`
| Method | Endpoint | Access | Description |
|---|---|---|---|
| GET | `/` | Private | Get current user's cart |
| POST | `/` | Private | Add item to cart |
| DELETE | `/` | Private | Clear entire cart |
| PUT | `/:itemId` | Private | Update cart item quantity |
| DELETE | `/:itemId` | Private | Remove a single item from cart |

### 📦 Orders — `/api/orders`
| Method | Endpoint | Access | Description |
|---|---|---|---|
| GET | `/` | Admin | All orders |
| GET | `/myorders` | Private | User's orders |
| GET | `/:id` | Private | Single order |
| POST | `/` | Private | Place a new order |
| PUT | `/:id/pay` | Private | Mark order as paid |
| PUT | `/:id/status` | Admin | Update order status |
| PUT | `/:id/cancel` | Private | Cancel an order |

### 💳 Payments — `/api/payments`
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

### 🤖 AI Agent — `/api/agent`
| Method | Endpoint | Access | Description |
|---|---|---|---|
| POST | `/chat` | Private | Gemini function-calling chat |

Request: `{ "message": "...", "lastOrderId": "..." }`  
Response: `{ "reply": "...", "lastOrderId": "..." }`

### ✅ Admin Approvals — `/api/admin`
| Method | Endpoint | Access | Description |
|---|---|---|---|
| GET | `/pending-approvals` | Admin | List pending refund requests |
| PUT | `/pending-approvals/:id/approve` | Admin | Approve → triggers Stripe refund |
| PUT | `/pending-approvals/:id/reject` | Admin | Reject request |
| GET | `/audit-log` | Admin | Last 200 agent action log entries |

### 🚚 Deliveries — `/api/deliveries`
| Method | Endpoint | Access | Description |
|---|---|---|---|
| GET | `/track/:trackingNumber` | Public | Track delivery by tracking number |
| GET | `/order/:orderId` | Private | Delivery for an order |
| GET | `/:id` | Private | Delivery by ID |
| PUT | `/:id/confirm` | Private | Confirm delivery |
| POST | `/` | Admin | Create delivery record |
| GET | `/` | Admin | All deliveries |
| PUT | `/:id/status` | Admin | Update delivery status |

### 👥 Users — `/api/users`
| Method | Endpoint | Access | Description |
|---|---|---|---|
| GET | `/` | Admin | All users |
| GET | `/:id` | Admin | Single user |
| PUT | `/:id` | Admin | Update user |
| DELETE | `/:id` | Admin | Delete user |

---

## 7. AI Agent Design

**Model:** `gemini-2.0-flash` via `@google/generative-ai` (function-calling mode).

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
- Thinking `parts` with `thought_signature` echoed back verbatim
- 429 quota exhaustion caught and returned as a plain-language user message
- Unknown tool names rejected before any dispatch

---

## 8. Stripe Integration

**Test mode only.** No real money moves.

### Frontend Payment Flow

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

| Identifier | Prefix | Example |
|---|---|---|
| PaymentIntent | `pi_` | `pi_3abc123...` |
| Refund | `re_` | `re_3def456...` |
| Demo/legacy | `TXN-` | `TXN-DEMO-001` |

**Test card:** `4242 4242 4242 4242` · any future expiry (e.g. `12/34`) · any CVC (e.g. `123`)

### How to Test Checkout

1. Register or login as a user.
2. Add items to your cart and proceed to checkout.
3. Select **Credit/Debit Card** as the payment method.
4. Place the order — you'll be redirected to the Order Details page.
5. Enter the Stripe test card details above and click **Pay Now**.
6. The payment succeeds and your order is marked **Paid**.

### How to Request a Refund via the AI Agent

1. Login as the customer and click the **🤖 chat bubble** (bottom-right).
2. Ask: *"I want a refund for my order because it arrived damaged."*
3. The agent calls `checkReturnEligibility` (deterministic policy — 30-day window, category rules).
4. If eligible, it calls `initiateRefund` → creates a **PendingApproval** record. **Stripe is NOT called at this stage.**

### How Admin Approves the Refund

1. Login as admin (`admin@buyeasy.com`) and navigate to **Admin Panel → Pending Approvals**.
2. Click **Approve**. The backend:
   - Verifies admin authorization
   - Checks `PendingApproval.status === 'pending'` (idempotency guard)
   - Calls `stripe.refunds.create({ payment_intent: pi_..., amount: <cents> })`
   - Stores the Stripe refund ID (`re_...`) in `Payment.refundTransactionId`
   - Sets `Payment.status = 'Refunded'` and writes `refundApproved` to the **AgentActionLog**
3. Click **Approve** again → `409: Already processed` — no duplicate refund is ever created.

---

## 9. Authentication & Authorization

1. `POST /api/auth/login` returns signed JWT (`JWT_SECRET`, `JWT_EXPIRE`)
2. Frontend attaches `Authorization: Bearer <token>` via Axios in `services/api.js`
3. `protect()`: verifies JWT + live DB lookup (`req.user = await User.findById(...)`)
4. `authorize('admin')`: checks `req.user.role === 'admin'`

| Role | Access |
|---|---|
| `user` | Own cart, orders, payments, reviews; AI chat agent |
| `admin` | All of the above + user/product/order management, pending approvals, audit log |

---

## 10. Security Boundaries

| Boundary | Implementation |
|---|---|
| Stripe secret backend-only | `stripe.js` reads env only; frontend receives scoped `clientSecret` |
| Refund amount from DB only | `agentTools.initiateRefund` reads `order.totalPrice`; `reason` is the only LLM string accepted |
| Agent cannot call Stripe | `agentTools.js` has no Stripe import; Stripe only reachable via admin-auth `refundService` |
| Order ownership at query | `Order.findOne({ _id, user: authenticatedUserId })` — 404 and 403 are indistinguishable |
| Primary idempotency | `pendingApproval.status !== 'pending'` → 409 before any Stripe call |
| Secondary idempotency | `payment.status === 'Refunded'` → early return in `refundService.js` |
| Admin-only Stripe trigger | Router-level `protect` + `authorize('admin')` on all `/api/admin` routes |
| Tool call cap | `MAX_TOOL_CALLS = 5` |
| `userId` absent from schemas | LLM cannot construct or influence the authenticated user ID |

---

## 11. Test Suite

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
| `refundWorkflow.test.js` | Full eligibility → pending → approve, idempotency (409 on double-click), `pi_` vs `TXN-` branching |

---

## 12. Environment Variables

### Root `.env` (backend)

```env
# Server
NODE_ENV=development
PORT=5000

# MongoDB
MONGO_URI=mongodb+srv://<username>:<password>@cluster.mongodb.net/buyeasy

# JWT
JWT_SECRET=your_super_secret_jwt_key
JWT_EXPIRE=30d

# Stripe  --  NEVER expose STRIPE_SECRET_KEY to the frontend
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...

# Google Gemini AI
# Get your key at: https://aistudio.google.com/app/apikey
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

> ⚠️ **Never commit `.env` files** — both are listed in `.gitignore`.

---

## 13. Getting Started

### Prerequisites
- [Node.js](https://nodejs.org/) v18 or higher
- [MongoDB](https://www.mongodb.com/) (local or [MongoDB Atlas](https://www.mongodb.com/cloud/atlas))
- npm v9 or higher

### 1. Clone the Repository

```bash
git clone https://github.com/TanujaGunjal/BuyEasy.git
cd BuyEasy
```

### 2. Install All Dependencies

```bash
npm run install:all
```

Or manually:

```bash
npm install
cd frontend && npm install && cd ..
```

### 3. Configure Environment Variables

```bash
cp .env.example .env
# Fill in: MONGO_URI, JWT_SECRET, STRIPE_SECRET_KEY, GEMINI_API_KEY
# Create frontend/.env with REACT_APP_STRIPE_PUBLISHABLE_KEY
```

### 4. Seed the Database *(Optional)*

Populate the database with sample products and an admin user:

```bash
node backend/seed.js
```

### 5. Run the Application

```bash
# Run both frontend and backend simultaneously
npm run dev:all

# Backend:  http://localhost:5000
# Frontend: http://localhost:3000
```

---

## 14. Scripts

| Command | Description |
|---|---|
| `npm start` | Start backend in production mode |
| `npm run dev` | Start backend with Nodemon (hot-reload) |
| `npm run client` | Start React frontend dev server |
| `npm run dev:all` | Run both frontend and backend concurrently |
| `npm run install:all` | Install dependencies for root and frontend |
| `npm test` | Run Jest test suite (43 tests) |
| `node backend/seed.js` | Seed DB with sample products + admin user |

**Upload formats:** `jpeg`, `jpg`, `png`, `gif`, `webp` — max **5 MB** per file.

---

## 15. Deployment

### Frontend — Vercel

1. Connect your GitHub repo to [Vercel](https://vercel.com).
2. Set **Root Directory** to `frontend`.
3. Add env var: `REACT_APP_STRIPE_PUBLISHABLE_KEY=pk_test_...`

> Vercel auto-detects Create React App — no extra build config needed.

### Backend — Render

1. Create a new **Web Service** on [Render](https://render.com).
2. **Build Command:** `npm install`
3. **Start Command:** `node backend/server.js`
4. Add all root `.env` variables in the Render dashboard.

> **CORS:** `server.js` whitelists `localhost:3000` and `buyeasy-six.vercel.app`. Update when deploying to a custom domain.

### Database — MongoDB Atlas

1. Create a free cluster at [mongodb.com/cloud/atlas](https://www.mongodb.com/cloud/atlas).
2. Whitelist your Render IP (or `0.0.0.0/0` for development).
3. Copy the connection string into `MONGO_URI`.

---

## 📄 License

This project is licensed under the **MIT License** — see the [LICENSE](LICENSE) file for details.

---

## 👩‍💻 Author

**Tanuja Gunjal** — [@TanujaGunjal](https://github.com/TanujaGunjal)

---

<p align="center">Made with ❤️ using the MERN Stack</p>
