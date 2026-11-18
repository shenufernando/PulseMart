# PulseMart — Full-Stack E-Commerce Platform

**PulseMart** is a full-stack e-commerce web application built with an **Angular (Standalone Components + Signals)** frontend and an **ASP.NET Core Web API + Entity Framework Core + SQL Server** backend. It features a modern, responsive UI with real-time state synchronization between the **Admin Workspace** and **Customer Storefront**.

---

## Tech Stack

- **Frontend:** Angular (Standalone Components, Signals, Reactive UI State, Custom CSS)
- **Backend:** .NET Core Web API (`PulseMart.API`), Entity Framework Core
- **Database:** SQL Server (`PulseMartDb`)
- **Authentication & State Sync:** JWT / Token-based session persistence via `localStorage`, real-time stock overrides, and signal-driven state updates

---

## Architecture & Data Flow

- **Single Source of Truth:** SQL Server (`PulseMartDb`) persistently stores Users (`dbo.Users`), Products (`dbo.Products`), Orders (`dbo.Orders`, `dbo.OrderItems`), and Product Reviews (`dbo.ProductReviews`).
- **Client-Side Synchronization:** Angular signals drive instant UI updates across the Storefront, Cart, Navbar badges, and Admin Dashboard while `localStorage` preserves active user sessions, authentication tokens, and shopping cart items across page reloads.
- **Image Upload Pipeline:** Admin product uploads use `multipart/form-data` stored in the API's static `wwwroot/images` directory and served directly to the storefront.

---

## Core Modules & Features

### 1. Public Storefront & Landing Page (`Home`)
- **Animated Hero Slideshow:** Multi-image smooth fade/zoom hero banner with dark gradient overlays and call-to-action navigation (`Shop Now`, `Join Free`).
- **Smooth Section Navigation:** Navbar links (`Home`, `Shop`, `Categories`, `About`) smoothly scroll to corresponding landing page sections.
- **Featured Previews:** Highlights product categories and brand story before user login.

### 2. Authentication & Role-Based Access (`Login` & `Register`)
- **Account Registration & Sign-In:** Full SQL Server persistence for user accounts and credentials.
- **Role-Based Routing:** Automatically routes `Admin` accounts to the **Admin Workspace** and `Customer` accounts to the **User Storefront** (with quick storefront switching for Admins).

### 3. Customer Shopping & Checkout (`User Dashboard`)
- **Live Search & Category Filtering:** Instant product search by title/description and filtering across `All`, `Electronics`, `Fashion`, `Home & Living`, `Accessories`, and `General`.
- **Product Quick View & Customer Reviews:** Modal inspection displaying product details, live stock counts, and verified buyer star ratings and reviews.
- **Persistent Shopping Cart:** Cart drawer with quantity controls (`+` / `-`), item removal, and `localStorage` persistence.
- **Dual Checkout Flows & Validation:**
  - Supports both **Buy Now** (single-item checkout) and **Cart Checkout** (multi-item checkout).
  - **Smart Delivery Calculation:** Free delivery on orders above `Rs. 10,000`, otherwise `Rs. 450`.
  - **Payment Methods & Input Validation:** Supports **Cash on Delivery** (`Pending` status) and **Card Payment** (`Confirmed` status with 16-digit card number, `MM/YY` expiry, and CVV validation) alongside Sri Lankan phone format (`0XXXXXXXXX`) checks.
  - **Instant Order Receipt:** Generates an `Order ID` (`PM-XXXX`) and displays a complete itemized receipt upon saving to SQL Server.

### 4. Order Tracking & Verified Reviews (`My Orders`)
- **Real-Time Status Tracking:** Displays live admin status updates (`Pending`, `Confirmed`, `Shipped`, `Delivered`) with glassmorphic order cards, item thumbnails, customer details, and delivery metadata.
- **Smart Navbar Active Orders Badge:** Dynamically counts active non-delivered orders (`Pending`, `Confirmed`, `Shipped`) and automatically clears delivered orders from the badge count while preserving full order history.
- **Verified Product Reviews:** Customers can submit 1–5 star ratings and comments directly from their ordered items, immediately updating product reviews on the storefront.

### 5. Admin Studio & Operations (`Admin Dashboard`)
- **Item Post Studio & Inventory Management:** Create, edit, and delete products with live image upload previews, category selection, pricing, and stock tracking.
- **Inventory & Sales KPIs:** Live metrics for Published Items, Total Stock Units, Catalog Value (`Rs.`), Low Stock alerts (`< 10`), Active Orders, Confirmed/Delivered Orders, Total Sales Revenue, and Deleted Orders.
- **Order Lifecycle & Stock Restoration:** Update order statuses in real time or delete orders with automatic inventory stock restoration.
- **User & Role Management:** View registered users, edit user names/emails, toggle roles between `Admin` and `Customer`, and remove accounts.

---

## Project Structure

```text
PulseMart/
├── PulseMart.API/                  # ASP.NET Core Web API & EF Core Backend
│   ├── Controllers/                # Products, Orders, Users, Reviews, Auth endpoints
│   ├── Data/                       # ApplicationDbContext & SQL Server configuration
│   ├── Migrations/                 # EF Core database migrations
│   ├── Models/                     # Product, Order, OrderItem, User, ProductReview entities
│   └── wwwroot/images/             # Uploaded product images
│
└── pulsemart-ui/                   # Angular Standalone Frontend
    └── src/app/
        ├── components/
        │   ├── home/               # Landing page, hero slideshow, categories, about
        │   ├── login/              # User authentication
        │   ├── register/           # User registration
        │   ├── user-dashboard/     # Storefront, cart drawer, checkout, My Orders, reviews
        │   └── admin-dashboard/    # Inventory studio, orders tracking, user management
        └── services/               # ProductService, AuthService, PulseMartStoreService
