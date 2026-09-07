# ☕ Modern Cafe & Bistro Management System
### Complete Enterprise-Grade Full-Stack Restaurant Operating System (POS, QR Ordering, KDS & Analytics)

---

## 📌 Executive Summary

The **Modern Cafe & Bistro Management System** is an end-to-end, multi-role restaurant management platform built with **Django REST Framework** (Backend) and **React 19 + Vite** (Frontend). 

The platform supports the entire cafe operations lifecycle:
1. **Contactless Customer QR Ordering & Dining Portal**: Table-specific tokens, interactive categorized digital menu, OTP verification, essential requests (water/cutlery/bill), digital waiter calling, and star ratings/feedback.
2. **Advance Table Booking & Reservation Engine**: Date/time slot booking, duration management, overlap collision prevention, manager 15-minute alert triggers, and instant check-in.
3. **Staff & Kitchen Operations (KDS)**: Real-time kitchen ticket display, elapsed timers with acoustic audio chimes (Web Audio API) for overdue tickets (>15 mins), and item-level kitchen status updates.
4. **Billing, Thermal Invoicing & Split POS**: GST compliance (CGST/SGST), discount justifications, split payment methods (UPI/Cash/Card), 80mm/58mm thermal receipt rendering, and WhatsApp digital bill dispatches.
5. **Business Intelligence & Food Cost Margins**: Menu engineering, ingredient/packaging cost vs. selling price margin analysis, daily sales summaries, and complete audit logging.
6. **Developer & Multi-Tenant Provisioning Suite**: White-label cafe provisioning, dynamic credential generation, and clean-slate factory reset tools.

---

## 🏗️ System Architecture & Technology Stack

```
                                  +---------------------------------------+
                                  |            CLIENT DEVICES             |
                                  +---------------------------------------+
                                   /                  |                  \
                   Customer Smartphone          Waiter / Cashier POS      Kitchen Display (KDS)
                  (QR / Advance Booking)       (Tablet / PC / Mobile)     (Wall Tablet / Display)
                           \                          |                          /
                            \                         |                         /
                             +------------------------+------------------------+
                                                      |
                                             React 19 + Vite Frontend
                                              (Proxy: /api -> :8000)
                                                      |
                                        REST API / HTTP JSON Interface
                                                      |
                                            Django 6.1.1 + DRF
                                         (CORS, Auth, ORM, Models)
                                                      |
                                               SQLite Database
                                                (db.sqlite3)
```

### Backend Stack
- **Framework**: Django 6.1.1 + Django REST Framework (DRF)
- **Database**: SQLite (Production-ready for single-location cafe, easily migratable to PostgreSQL)
- **Middleware**: `corsheaders` (Cross-Origin Resource Sharing), Django Authentication, Session & CSRF
- **Language**: Python 3.10+
- **Architecture**: Modular Domain-Driven Design (8 distinct Django applications)

### Frontend Stack
- **Framework**: React 19.2.8
- **Build Tool**: Vite 8.2.2 (Fast HMR, ES Modules)
- **Routing**: React Router DOM v7
- **Icons**: Lucide React
- **Visual FX**: Canvas Confetti (celebrations on order placement & reservation confirmations)
- **Audio Alerts**: Native HTML5 Web Audio API synthesizer chimes (no external audio assets required)
- **Styling**: Vanilla CSS Design System (`index.css`), responsive flexbox & grid, dark-mode-ready cards, frosted glassmorphism

---

## 📁 Repository Directory Structure

```
e:/Cafe/
├── backend/
│   ├── manage.py                     # Django CLI management entrypoint
│   ├── db.sqlite3                    # SQLite database with operational tables
│   ├── seed_data.py                  # Database demo seeder (users, menu, orders, tables)
│   ├── cafe_project/                 # Root Django configuration
│   │   ├── settings.py               # Django & DRF configuration, CORS, Installed Apps
│   │   ├── urls.py                   # Global API URL router
│   │   ├── wsgi.py / asgi.py         # Application gateways
│   ├── core/                         # Cafe Profile, Staff Auth, Provisioning & Audit
│   ├── tables/                       # Table Floorplan, QR Tokens, Sessions & Reservations
│   ├── customers/                    # Customer Directory, OTP Auth & Feedback
│   ├── menu/                         # Categories, Menu Items, Variants, Addons & Margins
│   ├── orders/                       # Orders, Order Items, KDS & Status History
│   ├── billing/                      # Invoicing, GST, Split Payments & Receipt Generation
│   ├── reports/                      # Dashboard Analytics, Margin Engine & Sales Reports
│   └── communications/               # WhatsApp dispatch simulation & message logs
│
├── frontend/
│   ├── index.html                    # Single Page Application HTML shell
│   ├── package.json                  # Dependencies & scripts (react 19, vite 8, lucide)
│   ├── vite.config.js                # Vite configuration with `/api` proxy to `:8000`
│   └── src/
│       ├── main.jsx                  # React DOM mount point
│       ├── App.jsx                   # Master routing table & layout wrapper
│       ├── index.css                 # Global modern design system & CSS variables
│       ├── context/
│       │   ├── AuthContext.jsx       # Staff auth state, cafe profile & sound alert toggles
│       │   └── CartContext.jsx       # Customer shopping cart & table session persistence
│       ├── services/
│       │   └── api.js                # Centralized unified REST API client
│       ├── components/
│       │   ├── Navbar.jsx            # Management top navigation bar with live status indicators
│       │   ├── TableCard.jsx         # Visual floorplan table component
│       │   ├── QRModal.jsx           # Printable Dine-In QR code modal
│       │   ├── PreBookQRModal.jsx    # Advance booking pass QR modal
│       │   ├── ThermalReceiptModal.jsx# 80mm & 58mm printable thermal receipt
│       │   ├── DishDetailModal.jsx   # Dish details, variant & addon selector
│       │   ├── CustomerCartDrawer.jsx# Slide-in slide-out mobile checkout drawer
│       │   ├── CustomerOTPModal.jsx  # Phone OTP verification modal
│       │   ├── CustomerFeedbackModal.jsx # Star ratings & comment modal
│       │   └── ReservationsManagementModal.jsx # Admin reservation manager modal
│       └── pages/
│           ├── auth/
│           │   └── LoginPage.jsx     # Multi-role staff login page
│           ├── customer/
│           │   ├── CustomerPortal.jsx   # Dine-in QR scan ordering webpage (/t/:token)
│           │   └── AdvanceBookingPage.jsx # Table reservation booking page (/book-table)
│           └── management/
│               ├── Dashboard.jsx        # Owner/Manager KPI analytics dashboard
│               ├── TableManagement.jsx  # Interactive live floor plan & session controller
│               ├── OrdersManagement.jsx # Live order lifecycle manager
│               ├── KitchenDisplay.jsx   # Kitchen Display System (KDS) with sound chimes
│               ├── BillingPOS.jsx       # Billing, GST calculation & split-payment POS
│               ├── MenuManagement.jsx   # Menu catalog, stock toggle & food cost setup
│               ├── ReportsAnalytics.jsx # Financial reports & gross margin analysis
│               ├── CustomerDirectory.jsx# CRM customer database & feedback review
│               ├── CafeSettings.jsx     # Master suite (Profile, Staff, WhatsApp, Factory Reset)
│               └── DeveloperPortal.jsx  # Developer White-label Cafe Provisioning Portal
```

---

## 🗄️ Database Architecture & Data Models

### 1. `core` App
- **`CafeProfile`**: Cafe Name, Tagline, Address, Phone, Sender Mobile (for WhatsApp/SMS), Email, GSTIN, FSSAI Food License number, Currency symbol, CGST rate, SGST rate, Service Charge rate, Receipt Header/Footer, feature toggles (`auto_accept_orders`, `whatsapp_enabled`, `advance_booking_enabled`, `waiter_call_alerts_enabled`).
- **`StaffProfile`**: 1-to-1 extension of Django `User`. Holds staff role (`OWNER`, `MANAGER`, `CASHIER`, `KITCHEN`), phone, and active status.
- **`AuditLog`**: Centralized security & operations audit trail (`user_name`, `role`, `action`, `entity_type`, `entity_id`, `details`, `created_at`).

### 2. `tables` App
- **`Table`**: Table number, capacity (seats), shape (`SQUARE`, `ROUND`, `RECTANGLE`), floor section (e.g. Indoor Main Floor, Outdoor Patio, Mezzanine Lounge), `public_token` (secure random URL-safe token), status (`AVAILABLE`, `OCCUPIED`, `ORDERING`, `PREPARING`, `SERVED`, `BILL_REQUESTED`, `CLEANING`), waiter call indicator (`waiter_called`, `waiter_called_at`).
- **`TableSession`**: Represents a dining session for a table. Holds `session_code`, customer reference, guest count, status (`ACTIVE`, `BILL_REQUESTED`, `PAID`, `CLOSED`), opened and closed timestamps.
- **`TableReservation`**: Advance table bookings with unique `booking_code` (e.g., `VB-4X9K`), customer contact, guest count, reservation date, time, duration (minutes), notes, reminder flags (`client_reminder_sent`, `manager_15m_alert_sent`), and status (`PENDING`, `CONFIRMED`, `SEATED`, `CANCELLED`).

### 3. `customers` App
- **`Customer`**: Name, phone (indexed unique identifier), whatsapp, visit counts, total spend, and CRM notes.
- **`CustomerOTP`**: 6-digit verification code linked to phone, created timestamp, 5-minute expiry validation, and verification status.
- **`Feedback`**: Session and customer link, multi-attribute ratings (1 to 5 stars for Overall, Food, Service, Ambience) and comments.

### 4. `menu` App
- **`Category`**: Category name (e.g. Coffee, Artisanal Pizza, Desserts), icon name (for Lucide icon mapping), display order, active status.
- **`MenuItem`**: Name, category, description, selling price, food cost (ingredient cost), packaging cost, other cost, veg/non-veg flag, spice level (0=None, 1=Mild, 2=Medium, 3=Hot), preparation time (minutes), availability toggle, badges (`is_bestseller`, `is_recommended`, `is_new`, `is_special`), image URL.
  - *Calculated Properties*: `total_cost`, `gross_margin`, `margin_percentage`.
- **`MenuItemVariant`**: Item variants (e.g., Small, Medium, Large, Double Shot) with custom selling prices and food costs.
- **`MenuAddon`**: Addons (e.g., Extra Mozzarella, Almond Milk, Hazelnut Syrup) with extra price and cost.

### 5. `orders` App
- **`Order`**: Linked to `TableSession` and `Customer`. `order_number`, source (`QR` or `WAITER_MANUAL`), status (`PLACED`, `CONFIRMED`, `PREPARING`, `READY`, `SERVED`, `BILL_REQUESTED`, `BILL_GENERATED`, `PAID`, `COMPLETED`, `CANCELLED`), notes, timestamps.
  - *Calculated Properties*: `subtotal`, `total_food_cost`.
- **`OrderItem`**: Menu item, variant name, quantity, unit price, unit cost, JSON addons list, special instructions, individual item status (`PENDING`, `PREPARING`, `READY`, `SERVED`, `CANCELLED`), cancellation reason.
- **`OrderStatusHistory`**: Immutable log of order transitions (`from_status`, `to_status`, `changed_by`, `notes`, `timestamp`).

### 6. `billing` App
- **`Bill`**: Unique bill number (e.g. `BILL-2026-001`), session link, subtotal, discount amount & reason, CGST amount, SGST amount, service charge, round off, grand total, status (`UNPAID`, `PARTIALLY_PAID`, `PAID`, `REFUNDED`), paid timestamp.
  - *Calculated Properties*: `total_paid`, `amount_remaining`, `is_settled`.
- **`Payment`**: Multi-method split payments (`CASH`, `UPI`, `CARD`, `OTHER`), amount paid, transaction reference ID / UTR, payer name, processed by staff name, and success status.

### 7. `communications` App
- **`WhatsAppMessage`**: Dispatched messages (`INVOICE`, `FEEDBACK_REQUEST`, `ORDER_CONFIRMATION`), phone number, template name, JSON payload, preview text, and status (`QUEUED`, `SENT`, `DELIVERED`, `READ`, `FAILED`).

---

## 🌐 Complete REST API Reference

All endpoints are prefixed with `/api`.

### Core & Staff Authentication
| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/core/cafe/` | Retrieve cafe branding, GST, and configuration |
| `PUT/PATCH` | `/api/core/cafe/` | Update cafe profile and tax rates |
| `POST` | `/api/core/login/` | Staff authentication with username/email & password |
| `GET` | `/api/core/staff/` | List active staff accounts and assigned roles |
| `GET` | `/api/core/audit-logs/` | Fetch recent operational and security audit logs |
| `POST` | `/api/core/provision/` | Developer Portal: Provision new cafe and generate initial credentials |
| `POST` | `/api/core/owner/master-update/` | Atomic update of cafe branding, staff, and messaging configs |
| `POST` | `/api/core/owner/manage-staff/` | Create, update, or reset passwords for staff members |
| `POST` | `/api/core/owner/reset-data/` | Factory reset or purge orders/reservations/customers |

### Table Management & QR Dining
| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/tables/` | List all tables, floor sections, and active sessions |
| `POST` | `/api/tables/` | Add a new dining table to the floor plan |
| `GET` | `/api/tables/<id>/` | Get detailed table information and current orders |
| `PATCH` | `/api/tables/<id>/` | Update table capacity, shape, or floor section |
| `DELETE` | `/api/tables/<id>/` | Delete table from floor plan |
| `POST` | `/api/tables/<id>/regenerate-token/` | Invalidate and generate a new public QR token |
| `POST` | `/api/tables/<id>/update-status/` | Manually update table status (e.g. Cleaning/Available) |
| `POST` | `/api/tables/<id>/open-session/` | Manually seat guests and open a table session |
| `POST` | `/api/tables/<id>/close-session/` | Close table session and mark table available |
| `POST` | `/api/tables/sessions/<id>/close/` | Close session directly by session ID |
| `GET` | `/api/tables/by-token/<token>/` | Public customer lookup for QR dining session |
| `POST` | `/api/tables/by-token/<token>/call-waiter/` | Customer calls waiter to their table |
| `POST` | `/api/tables/<id>/dismiss-waiter/` | Staff acknowledges and dismisses waiter alert |
| `POST` | `/api/tables/dismiss-all-waiters/` | Dismiss all active waiter alerts across the cafe |
| `POST` | `/api/tables/by-token/<token>/request-essentials/` | Request items (water, extra cutlery, tissues, bill) |
| `POST` | `/api/tables/toggle-waiter-alerts/` | Enable or disable waiter call alert popup notifications |

### Advance Table Reservations
| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/tables/reservations/` | Query reservations with date/status filters |
| `POST` | `/api/tables/reservations/` | Create advance reservation with automatic conflict detection |
| `PATCH` | `/api/tables/reservations/<id>/` | Update reservation status, notes, or assigned table |
| `DELETE` | `/api/tables/reservations/<id>/` | Cancel / remove reservation |
| `POST` | `/api/tables/reservations/check-in/` | Check-in customer on arrival and open active table session |
| `POST` | `/api/tables/reservations/dismiss-all-alerts/` | Dismiss all 15-min arrival reminder banners |
| `POST` | `/api/tables/toggle-advance-booking/` | Turn advance booking system on or off globally |

### Menu & Food Cost Catalog
| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/menu/?for_customer=<bool>` | Fetch complete menu categorized with variants & addons |
| `GET` | `/api/menu/categories/` | List categories with display order |
| `POST` | `/api/menu/categories/` | Create new menu category |
| `POST` | `/api/menu/items/` | Add menu item with price and food cost breakdown |
| `PATCH` | `/api/menu/items/<id>/` | Edit menu item details, costs, or badges |
| `DELETE` | `/api/menu/items/<id>/` | Remove menu item |
| `POST` | `/api/menu/items/<id>/toggle-stock/` | Instant toggle for In-Stock / 86 (Out of Stock) |

### Orders & Kitchen Display System (KDS)
| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/orders/` | List orders with status, session, and search filters |
| `POST` | `/api/orders/` | Create new order (customer QR or staff manual) |
| `GET` | `/api/orders/<id>/` | Retrieve order details and items |
| `POST` | `/api/orders/<id>/status/` | Advance order status with audit tracking |
| `POST` | `/api/orders/<id>/add-items/` | Append items to an active existing order |
| `POST` | `/api/orders/items/<id>/cancel/` | Void an order item with recorded cancellation reason |
| `GET` | `/api/orders/kitchen/` | Real-time queue for KDS sorted by urgency and wait time |

### Billing, Taxes & Split Payments
| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/billing/session/<id>/preview/` | Generate live bill preview (subtotal, CGST, SGST, total) |
| `POST` | `/api/billing/session/<id>/generate/` | Finalize and lock bill for payment |
| `POST` | `/api/billing/session/<id>/request-bill/` | Customer or staff bill request notification |
| `POST` | `/api/billing/session/<id>/merge-bills/` | Merge multiple table orders or sessions into single bill |
| `POST` | `/api/billing/<id>/payment/` | Record payment transaction (Cash, UPI, Card) |
| `POST` | `/api/billing/<id>/send-whatsapp/` | Dispatch digital invoice to customer WhatsApp number |

### Customers, OTP & Feedback
| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/customers/` | Search and list customer CRM profiles |
| `GET` | `/api/customers/<id>/` | Customer dining history and spend analytics |
| `POST` | `/api/customers/send-otp/` | Generate and dispatch 6-digit login OTP |
| `POST` | `/api/customers/verify-otp/` | Verify OTP code and link session to customer account |
| `GET` | `/api/customers/feedback/` | List customer feedback and average ratings |
| `POST` | `/api/customers/feedback/` | Submit dining experience rating and comments |

### Business Intelligence & Reports
| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/reports/dashboard/` | High-level metrics (Today's Sales, Open Tables, KDS Load) |
| `GET` | `/api/reports/margins/` | Item-by-item food cost, gross profit margin and volume sold |
| `GET` | `/api/reports/daily/` | Daily sales summaries, payment breakdown and GST collected |

### Communications
| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/communications/whatsapp-logs/` | View dispatched WhatsApp notification history |

---

## 👥 User Roles & Access Control

| Role | Default Username | Default Password | Primary Permissions & Responsibilities |
|---|---|---|---|
| **Owner / Admin** | `owner` | `cafe1234` | Full access: Master Cafe Settings, Tax Rates, Staff Management, Data Resets, Financial Margin Reports, Audit Trail. |
| **Cafe Manager** | `manager` | `cafe1234` | Shift supervision: Floor Plan, Advance Reservations, Order Lifecycle, Discount Approvals, Void/Cancellations, Daily Reports. |
| **Cashier / POS** | `cashier` | `cafe1234` | Front-of-house: Table seating, POS billing, Split Payments, Thermal Receipt Printing, WhatsApp bill dispatches. |
| **Kitchen Staff** | `kitchen` | `cafe1234` | Back-of-house: Kitchen Display System (KDS), ticket timing alerts, marking orders Preparing / Ready. |
| **Customer** | *(No password)* | *(Phone OTP)* | QR Scan ordering, custom instructions, calling waiter, requesting essentials, paying, submitting feedback. |

---

## 🚀 Step-by-Step Setup & Running Locally

### Prerequisites
- **Python 3.10+**
- **Node.js 18+** & **npm**

### Step 1: Clone or Navigate to Project
```bash
cd e:\Cafe
```

### Step 2: Backend Setup & Launch
Open a terminal in `e:\Cafe\backend`:
```bash
# Navigate to backend
cd backend

# (Optional) Create and activate virtual environment
python -m venv venv
# On Windows:
venv\Scripts\activate

# Install required Python packages
pip install django djangorestframework django-cors-headers

# Apply database migrations
python manage.py migrate

# Seed database with demo cafe, staff accounts, menu items, and tables
python seed_data.py

# Start Django backend server
python manage.py runserver 0.0.0.0:8000
```
*The backend API will be live at `http://127.0.0.1:8000/api/`.*

### Step 3: Frontend Setup & Launch
Open a second terminal in `e:\Cafe\frontend`:
```bash
# Navigate to frontend
cd frontend

# Install dependencies
npm install

# Start Vite development server
npm run dev
```
*The web application will be live at `http://localhost:5173/`.*

---

## 🧭 Key User Journeys & Application Workflows

### 1. Dine-In Customer Experience (QR Code Flow)
1. Customer sits at a table (e.g. Table 04) and scans the table QR code (or navigates to `http://localhost:5173/t/<table_token>`).
2. The customer sees the live interactive menu with categories, veg/non-veg dietary filters, spice badges, and chef recommendations.
3. They customize dishes (size variants, addons like extra cheese), add them to cart, and enter their phone number.
4. An OTP verification modal authenticates the guest.
5. The customer submits the order. Confetti bursts on screen, the order status updates to **PLACED**, and the kitchen display immediately receives the ticket.
6. During their meal, the customer can click **"Call Waiter"** or **"Request Essentials"** (Water, Cutlery, Tissues, Bill).
7. Once finished, they request the bill and rate their dining experience.

### 2. Advance Table Reservation Flow
1. Customer navigates to `http://localhost:5173/book-table`.
2. They select a date, time slot, guest count, and duration (e.g. 90 minutes).
3. The system checks table availability against existing reservations to prevent double-booking.
4. On booking submission, a booking code (e.g., `VB-7K9A`) and digital reservation pass QR are generated.
5. When the customer arrives at the cafe, the host enters or scans the booking code in Table Management and clicks **"Check In"**, which automatically marks the table occupied and starts the dining session.

### 3. Kitchen Display System (KDS) Flow
1. Kitchen staff access `http://localhost:5173/admin/kitchen`.
2. Order cards are ordered by wait time.
3. If an order exceeds 15 minutes preparation time, an overdue alert triggers an acoustic chime.
4. Kitchen staff click **"Start Cooking"** (`PREPARING`) and then **"Mark Ready"** (`READY`).
5. When food is picked up, staff mark it **"Served"** (`SERVED`).

### 4. Billing & Split-Payment POS Flow
1. Cashier opens `http://localhost:5173/admin/billing` and selects the table session.
2. The system computes the subtotal, applies configured CGST (2.5%) and SGST (2.5%), allows discretionary discount with a mandatory audit reason, and calculates the grand total.
3. Cashier records payment:
   - Supports single full payment or split payment (e.g., ₹500 via UPI and ₹300 via Cash).
4. Once the bill balance reaches zero, the session is marked **PAID**.
5. Cashier can print an 80mm or 58mm thermal receipt or click **"Send WhatsApp Bill"** to dispatch the digital receipt.

---

## 🔒 Security & Data Hygiene
- **Tokenized Dining**: Tables use random URL-safe tokens rather than sequential integer IDs to prevent unauthorized table spoofing.
- **Audit Logging**: Sensitive actions (role changes, password resets, discounts, item cancellations, and data purges) are permanently recorded in `AuditLog`.
- **Granular Reset Capabilities**: In `CafeSettings -> Master Suite`, the owner can selectively purge:
  - Table Reservations only
  - Operational Orders & Bills only
  - Customer Directory only
  - Full Factory Reset (clean slate for new deployments)

---

## 📄 License & Attribution
Developed with enterprise-grade standards for modern hospitality businesses. Built with Django REST Framework and React.
