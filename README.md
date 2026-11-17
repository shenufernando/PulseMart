# PulseMart

A full-stack e-commerce web application built with an Angular frontend and a .NET Core / SQL Server backend, designed with a modern glassmorphic UI and real-time synchronization between the Admin Dashboard and User Storefront.

## Tech Stack
- **Frontend:** Angular (Standalone Components, Signals, Reactive UI state)
- **Backend:** .NET Core API, Entity Framework Core
- **Database:** SQL Server (`PulseMartDb`)
- **Client Persistence & Sync:** `localStorage` for session persistence, authentication tokens, and stock overrides during synchronization

## Data Flow & Architecture
- **Single Source of Truth:** SQL Server (`PulseMartDb`) stores Users, Orders, and Product Inventory.
- **Client State & Sync:** Angular signals manage live UI state while `localStorage` handles session tokens, active session persistence, and stock synchronization overrides across views.

## Key Features
- **User Storefront & Dashboard:**
  - Product browsing with search and category filters, quick view modals, and stock status indicators.
  - Cart drawer and modal-based checkout flows (Buy Now and Cart checkout with Cash/Card options and delivery fee calculation).
  - **My Orders** view with automated order status tracking (`Pending`, `Confirmed`, `Shipped`, `Delivered`), delivery metadata, item thumbnails, and product review submission.
  - Navbar **Active Orders** counter that dynamically reflects non-delivered orders (`Delivered` status excluded).
- **Admin Dashboard:**
  - Real-time item post creation, editing, deletion, and inventory tracking (stock units, catalog value, low-stock alerts).
  - Real-time order status updates, order deletion with stock restoration, and deleted-orders tracking.
  - User management with role control (`Admin` / `Customer`) and live user listing.
  - Product review management synced with SQL Server.
- **UI/UX:**
  - Modern glassmorphic styling, responsive layouts, refined spacing, image displays, and hero section positioning.

## Project Structure
- `PulseMart.API/` — .NET Core Web API, EF Core models/DbContext, migrations, and controllers (`Users`, `Orders`, `Reviews`, `Products`).
- `pulsemart-ui/` — Angular standalone frontend application (`user-dashboard`, `admin-dashboard`, services, and routing).
