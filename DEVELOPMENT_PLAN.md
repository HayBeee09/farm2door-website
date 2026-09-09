# Farm2Door — Master Development Plan & Execution Tracker

> **Document Version:** 1.0.0  
> **PRD Source:** [prd.md](file:///c:/Users/PC/Desktop/farm2door-website/prd.md)  
> **Platform Organization:** Farm2Door Agricultural Initiative  
> **Market Deployment:** Ekiti State Commercial Corridor, Nigeria  
> **Primary Directive:** **Always refer to this file (`DEVELOPMENT_PLAN.md`) before and during the execution of any feature, task, or bugfix.** Update the status checkboxes as stages progress.

---

## Brand & UI Design System Directives (Strict)
* **Core Palette:** 
  - **Phthalo Green:** `#0D2E1C` (Primary Dark & Identity)
  - **Pear Green:** `#CFE73B` (High-Conversion Accent & Badges)
  - **Asparagus Green:** `#6A9B48` (Organic Midtone & Verification)
  - **Acid Green:** `#B5BA3E` (Sunlit Field Tone, Prices & Ratings)
  - **Organic Cream Scale:** `#FAF8F2` (Canvas), `#FFFDF9` (Cards), `#F2ECE0` (Subtle), `#E5DBC7` (Borders), `#F7E9BC` (Gold)
* **Zero Gradients Rule:** All visual elements must strictly use clean, solid color blocking. No CSS gradients (`bg-gradient-*`, `linear-gradient`, `radial-gradient`).
* **Design Aesthetic:** Premium, modern agricultural marketplace, high typographic hierarchy, tactile card surfaces, responsive mobile-first UI.

---

## Development Stages & Work Breakdown Structure```
Stage 0: Foundation & Design System (Complete)
   │
   ▼
Stage 1: Database Architecture & Prepared Statements (Complete)
   │
   ▼
Stage 2: Authentication & RBAC (Complete)
   │
   ▼
Stage 3: Agricultural Catalog, Search & Unit Filtering (Complete)
   │
   ▼
Stage 4: Farmer / Vendor Portal & Produce Management (Complete)
   │
   ▼
Stage 5: Cart, Order State Machine & ACID Concurrency Locking (Complete)
   │
   ▼
Stage 6: Paystack Payment Gateway & Settlement Webhooks (Complete)
   │
   ▼
Stage 7: Trust, Reputation & Verified Reviews (Complete)
   │
   ▼
Stage 8: Platform Administration & Escrow Auditing (Complete)
   │
   ▼
Stage 9: Security Hardening, Performance (<1.5MB) & Production Verification (Complete)
```

---

### [STAGE 0] Project Initialization, Design System & Landing Page
- [x] Next.js 16 + React 19 + TypeScript + Tailwind CSS v4 setup.
- [x] Extract exact brand palette from reference image: Phthalo Green (`#0D2E1C`), Pear Green (`#CFE73B`), Asparagus Green (`#6A9B48`), Acid Green (`#B5BA3E`), and Cream scale (`#FAF8F2`, `#FFFDF9`, `#F2ECE0`, `#E5DBC7`).
- [x] Configure design system tokens in `app/globals.css` and `lib/design-system.ts`.
- [x] Implement professional landing page adhering to PRD requirements with **zero gradients**.
- [x] Integrate interactive preview of the 6 PRD produce categories and 5 local harvest packaging units.
- [x] Build interactive cart drawer and simulated Paystack modal preview.
- [x] Configure Progressive Web App (PWA) manifest (`app/manifest.ts`) and mobile install prompt (`components/pwa/PwaInstallPrompt.tsx`) conforming to PRD Section 3.2.
- [x] Generate vector brand icons (`icon-192.svg`, `icon-512.svg`, apple-touch-icon) with standalone mobile display.
- [x] Verify production build passes cleanly (`npm run build` exit code 0).

---

### [STAGE 1] Database Architecture, Models & Prepared Statements
* **PRD Requirement:** Section 5.2 (NFR-2.1), Section 6 (Data Persistence Layer: Supabase PostgreSQL 15+).
* **Objective:** Establish schema migrations, typed database client, parameterized prepared statements preventing SQL injection, and ACID concurrency locking.

- [x] **1.1 Supabase Configuration & Client Helpers:**
  - Installed `@supabase/supabase-js` and `@supabase/ssr`.
  - Configured Next.js App Router SSR helpers (`utils/supabase/server.ts`, `utils/supabase/client.ts`, `utils/supabase/middleware.ts`) and root `middleware.ts` for automatic cookie session refreshing.
  - Configured typed client layer (`lib/supabase/client.ts`, `lib/supabase/server.ts`, `lib/supabase/admin.ts`).
  - Configured active project credentials in `.env.local` with `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`.
  - Created test connection page at `app/supabase-test/page.tsx` for verifying server-side data fetching.
- [x] **1.2 Core Schema Definition & ACID Concurrency Locking (`supabase/migrations/001_initial_schema.sql`):**
  - Implemented 7 relational tables: `users`, `categories`, `products`, `orders`, `order_items`, `payments`, `reviews`.
  - Added strict check constraints for agricultural units (`'tuber', 'basket', 'crate', 'bundle', '50kg bag'`), user roles, order statuses, and review ratings (1-5).
  - Added composite indexes for sub-300ms queries: `idx_products_category_avail`, `idx_products_unit_avail`, `idx_orders_ref`, etc.
  - Implemented PostgreSQL stored procedure `execute_atomic_checkout` executing row-level locks (`SELECT ... FOR UPDATE`) to guarantee ACID concurrency inventory deduction (PRD FR-3.2).
  - Configured Row Level Security (RLS) policies for public catalog reads and authenticated user isolation.
  - Added trigger `on_auth_user_created` syncing Supabase Auth accounts to `public.users`.
  - **Deployed & Verified:** Executed on live Supabase instance (`ppunjfspvspnkdlrfhbp`). All tables, indexes, and stored functions verified active.
- [x] **1.3 Seed Migrations (`supabase/seed.sql`):**
  - Seeded the 6 mandatory PRD categories (*Tubers & Roots, Vegetables, Fruits, Grains & Cereals, Legumes & Beans, Peppers & Spices*).
  - Seeded verified Ekiti farmers (Ikere, Ado, Igbemo, Ilawe) and initial produce inventory with real photography links.
  - **Deployed & Verified:** All 6 categories and 8 produce items verified live.
- [x] **1.4 TypeScript Types & Parameterized Prepared Queries:**
  - Created `lib/supabase/types.ts` defining full database contract.
  - Created `lib/supabase/queries.ts` with prepared, SQL-injection safe queries for catalog filtering and checkout execution.

---

### [STAGE 2] Authentication & Role-Based Access Control (RBAC)
* **PRD Requirement:** Section 4.1 (Module 1: Authentication & User Management), FR-1.1 – FR-1.4.
* **Objective:** Secure registration, Bcrypt hashing (salt rounds $\ge 10$), and 7-day signed JWT tokens.

- [x] **2.1 User Registration (`/api/auth/register`):**
  - Validates payload: `full_name`, `email`, `phone`, `password`, `role` (`farmer` or `buyer`), plus optional `farm_name`, `farm_location` (Ekiti communities), and delivery `address`.
  - Integrates with Supabase Auth (`supabase.auth.signUp()`) and syncs profile to `public.users` table with database trigger `on_auth_user_created`.
  - Returns clean user object excluding password hash.
- [x] **2.2 User Login (`/api/auth/login`):**
  - Authenticates via Supabase Auth (`signInWithPassword`) with secure session cookie management.
  - Fetches complete profile from `public.users` (role, farm details, verification status).
- [x] **2.3 Session Validation Middleware (`/api/auth/me` & route guards):**
  - Next.js proxy middleware in `middleware.ts` / `utils/supabase/middleware.ts` refreshing cookies on every request.
  - Route guarding: restricts `/dashboard/farmer/*` to authenticated users with `farmer` or `admin` role, and `/admin/*` to `admin`.
  - Session endpoint `/api/auth/me` validates active session with `supabase.auth.getUser()`.
- [x] **2.4 Profile Management & React State Context (PRD FR-1.4):**
  - Created `lib/auth-context.tsx` with `AuthProvider` and `useAuth()` hook for reactive auth status across the app.
  - Exposes `login()`, `register()`, `logout()`, `openAuthModal()`, `closeAuthModal()`, `updateProfile()`, and real-time `onAuthStateChange` synchronization.
  - Implemented `/api/auth/profile` supporting GET and PATCH with input sanitization and `public.users` updates.
  - Implemented dedicated Profile & Settings management screen at `/profile` for contact details, default Ekiti delivery destinations, and farm operations.
- [x] **2.5 UI Auth Modals / Pages:**
  - Implemented `components/auth/AuthModal.tsx` adhering to the Phthalo Green & Cream design system with zero gradients.
  - Visual role selector for **"Buyer / Household"** vs **"Ekiti Farmer"** with dynamic farm credential inputs (Farm Name, Ekiti farming community).
  - Integrated into Header (Sign In button / user profile avatar & dropdown with quick link to `/profile`) and Hero CTA ("Register as a Farmer / Vendor").
  - Implemented protected Farmer Dashboard at `/dashboard/farmer`.

---

### [STAGE 3] Agricultural Catalog, Search & Unit Filtering Engine
* **PRD Requirement:** Section 4.2 (Module 2), FR-2.1 – FR-2.4; Section 5.1 (NFR-1.1 Sub-300ms response).
* **Objective:** High-performance produce discovery supporting multi-parameter queries.

- [x] **3.1 Multi-Parameter Query API (`/api/products` & `/api/categories`):**
  - Implemented `/api/categories` returning the 6 PRD categories with active produce counts per category.
  - Implemented `/api/products` supporting multi-parameter filtering by `category_id` (1-6), harvest `unit` (`tuber`, `basket`, `crate`, `bundle`, `50kg bag`), keyword search (produce name, description, farmer, Ekiti community), price bounds (`min_price`, `max_price`), and sorting (`newest`, `price_asc`, `price_desc`, `stock`).
  - Relational join with `users` (farmer metadata, verified status) and `categories`.
- [x] **3.2 Sub-300ms Latency Optimization:**
  - Powered by PostgreSQL composite indexes `idx_products_category_avail` and `idx_products_unit_avail`.
  - Configured HTTP caching headers (`Cache-Control: public, s-maxage=10, stale-while-revalidate=59`).
- [x] **3.3 Catalog UI Integration:**
  - Connected landing page marketplace to live backend endpoints.
  - Added interactive search bar with 300ms debouncing and quick-clear action.
  - Added real-time category count badges (`Tubers & Roots (1)`, etc.).
  - Added packaging unit pills, price range quick filters, sort dropdown, and active filter removal tags.
  - Added loading skeleton placeholders with subtle pulse animations matching the Phthalo/Cream card layout.
  - Handled empty search states with 1-click filter reset.

---

### [STAGE 4] Farmer / Vendor Portal & Inventory Management
* **PRD Requirement:** Section 2 (Farmer Persona), Section 4.2 (FR-2.2 & FR-2.3).
* **Objective:** Enable farmers to list harvests rapidly from mobile devices, set farm-gate pricing, and track stock.

- [x] **4.1 Farmer Dashboard UI (`/dashboard/farmer`):**
  - Mobile-first, low-friction dashboard using the Phthalo Green & Cream palette with zero gradients.
  - Summary metrics: Active Listings, Total Stock Available, Inbound Orders, Total Guaranteed Escrow.
  - Real-time synchronization with Supabase backend APIs (`/api/farmer/metrics`, `/api/farmer/products`, `/api/farmer/orders`).
  - Account switcher to seamlessly evaluate multiple verified Ekiti smallholders (Babatunde Agro, Grace Agboola, Ekiti Commercial Agro Plantation, Igbemo Millers Co-op) and logged-in accounts.
- [x] **4.2 Produce Publishing Flow (`/dashboard/farmer/new-listing`):**
  - High-speed harvest publication flow for mobile & desktop.
  - PRD-compliant category selector (all 6 categories with icons and crop examples).
  - Local packaging unit selector (`tuber`, `basket`, `crate`, `bundle`, `50kg bag`).
  - Farm-gate Price per Unit (₦) and Stock Quantity with live zero-stock validation.
  - Harvest Freshness selector with presets ("Harvested 6:00 AM Today", "Cut Fresh This Morning", etc.).
  - Authentic Ekiti produce photography presets (`yam-tubers.jpg`, `scotch-bonnet.jpg`, `ugwu-leaves.jpg`, `ofada-rice.jpg`, `valencia-oranges.jpg`, `honey-beans.jpg`, `waterleaf.jpg`, `tatase-peppers.jpg`) plus custom image URL support.
  - Real-time Live Marketplace Card Preview showing buyer-facing appearance before publishing.
- [x] **4.3 Listing Management (CRUD):**
  - Produce inventory table with thumbnail, unit, freshness, and active/inactive status badges.
  - 1-click quick stock adjustment steppers (`+` and `-`) for rapid on-farm inventory updates.
  - Modal price and stock editor.
  - Availability toggle (`Active` / `Paused`).
  - Automatic zero-stock deactivation: `is_available` toggles to `FALSE` when `stock_quantity == 0` (PRD FR-2.3).
  - Delete / Archive listing with confirmation modal.
- [x] **4.4 Inbound Order Notification & Dispatch Tracker:**
  - Real-time inbound orders view with buyer names, delivery destination in Ekiti, contact phone numbers, and line items.
  - 3-step order fulfillment lifecycle tracker: `Ready for Dispatch (Confirmed)` $\rightarrow$ `In Transit / Dispatched` $\rightarrow$ `Delivered & Settled`.
  - Direct farmer action buttons to advance dispatch status and trigger escrow clearance.
- [x] **4.5 Farmer Settlement Bank Account Payout Setup (PRD Section 2 & FR-4.3):**
  - Bank Account model (`FarmerBankDetails`) and `/api/farmer/bank` endpoint supporting standard Nigerian banks (GTBank, Access Bank, First Bank, Zenith, UBA, Kuda, Moniepoint, OPay, PalmPay, etc.).
  - Strict 10-digit NUBAN validation and CBN institution routing lookup.
  - Interactive bank card on `/dashboard/farmer` (Farm Profile & Settlement) with account masking toggle and verified Paystack Direct NIP indicator.
  - Interactive "Update Settlement Bank Account" modal with live digit counter, beneficiary name validation, and state updates.
  - Seamless escrow visibility: Admin Escrow Audit table (`/dashboard/admin`) and payout release notifications display farmer beneficiary bank name, account number, and account holder name.

---

### [STAGE 5] Cart, Order State Machine & ACID Concurrency Locking
* **PRD Requirement:** Section 4.3 (Module 3), FR-3.1 – FR-3.3, NFR-3.1.
* **Objective:** Concurrency-safe atomic checkout preventing stock over-allocation on perishable crops.

- [x] **5.1 Multi-Farmer Cart Persistence:**
  - Client-side storage (LocalStorage: `farm2door_cart_v1`) supporting items from multiple Ekiti smallholders simultaneously.
  - Implemented reactive `CartProvider` and `useCart()` hook in `lib/cart-context.tsx`.
  - Built slide-out cart drawer `components/cart/CartDrawer.tsx` displaying farmer origin provenance, local harvest units, and transparent transit fee calculations (₦1,500 intra-Ekiti transit).
  - Enforced live stock boundary protection on cart addition and stepper increments.
- [x] **5.2 Row-Level Concurrency Locking (`SELECT ... FOR UPDATE`):**
  - Implemented checkout transaction endpoint `/api/orders/checkout`.
  - Invokes PostgreSQL stored procedure `execute_atomic_checkout` which acquires pessimistic row locks: `SELECT id, name, price_per_unit, stock_quantity, is_available FROM products WHERE id = v_item.product_id FOR UPDATE;`.
  - Validates that `requested_quantity <= stock_quantity` for every item in the cart.
- [x] **5.3 Deterministic Rollback Logic:**
  - If any single item exceeds available stock during concurrent transactions: raises PostgreSQL exception, automatically aborting the transaction and executing deterministic rollback.
  - Returns HTTP 409 Conflict with descriptive error notification ("Insufficient stock for crop X. Requested: Y, Available: Z").
- [x] **5.4 Atomic Stock Deduction & Order Creation:**
  - Decrements inventory stock atomically inside the PostgreSQL transaction: `UPDATE products SET stock_quantity = stock_quantity - v_item.quantity`.
  - Automatically toggles `is_available = FALSE` if stock reaches 0 (PRD FR-2.3).
  - Creates row in `orders` table with status `pending` and generated reference `FD-YYYYMMDD-XXXXXX`.
  - Inserts all line items into `order_items` with snapshot unit prices and subtotals.
  - Commits transaction atomically.
- [x] **5.5 Order Lifecycle Management & Cancellation Stock Restoration:**
  - Status progression API in `/api/orders/[id]/status`: `pending` $\rightarrow$ `confirmed` $\rightarrow$ `in_transit` $\rightarrow$ `delivered`.
  - Deterministic stock restoration: if an order is cancelled prior to dispatch, atomically restores quantities in `order_items` back to `products.stock_quantity`.
  - Implemented `components/cart/CheckoutModal.tsx` for buyer delivery contact details, concurrency lock notifications, and confirmed order receipts.

---

### [STAGE 6] Payment Gateway Integration (Paystack)
* **PRD Requirement:** Section 4.4 (Module 4), FR-4.1 – FR-4.3, NFR-2.3.
* **Objective:** Secure debit card, USSD, and bank transfer settlements with Paystack API.

- [x] **6.1 Reference Formatter:**
  - Enforced PRD format: `FD-YYYYMMDD-XXXXXX` (e.g., `FD-20260907-8A2F9B`).
- [x] **6.2 Transaction Initialization API (`/api/payments/initialize`):**
  - Implemented `/api/payments/initialize` converting Naira to Kobo ($1 \text{ NGN} = 100 \text{ kobo}$).
  - Queries Paystack initialization endpoint with Bearer authorization and metadata payload.
  - Implemented High-Fidelity Sandbox fallback for development, testing, and academic evaluation without requiring external bank cards.
- [x] **6.3 Payment Verification Service (`/api/payments/verify/:reference`):**
  - Implemented `/api/payments/verify/[reference]` querying Paystack verification endpoint.
  - Verifies amount in Kobo matches order total amount in database.
- [x] **6.4 Webhook Handler (`/api/payments/webhook`):**
  - Implemented `/api/payments/webhook` with cryptographic HMAC-SHA512 signature validation (`x-paystack-signature`) using `PAYSTACK_SECRET_KEY` (PRD NFR-2.3).
  - Processes `charge.success` events idempotently to prevent duplicate ledger writes.
- [x] **6.5 Financial Ledger Writing, Escrow Confirmation & Dummy Checkout Implementation:**
  - Writes settlement audit record to `public.payments` table (`status = 'successful'`, `amount`, `payment_reference`, `channel`, `paid_at`, and raw response audit JSONB payload).
  - Updates `orders.status` to `confirmed`, advancing the order to the farmer dispatch queue.
  - Built dedicated buyer order tracking & receipt page at `/orders/[reference]`.
  - Implemented streamlined **Dummy Checkout Mode** with 1-click auto-approval, simulated payment methods (Card, Bank Transfer, Pay on Delivery), and demonstration lifecycle controls (`in_transit` $\rightarrow$ `delivered`).
  - Retained high-fidelity Paystack gateway modal & webhook verification for production evaluation.

---

### [STAGE 7] Trust & Reputation System (Verified Reviews)
* **PRD Requirement:** Section 4.5 (Module 5), FR-5.1 & FR-5.2.
* **Objective:** Eliminate fake ratings; only buyers with completed, delivered orders can review.

- [x] **7.1 Eligibility Verification Guard:**
  - Check database: Buyer ID must have an order with `status = 'delivered'` containing `product_id`.
  - Reject review submissions if order is incomplete or not delivered (enforces HTTP 403).
- [x] **7.2 Review Submission API (`/api/reviews`):**
  - Accept `product_id`, `rating` (1 to 5 integer), and feedback review text.
  - Prevent duplicate reviews for the same completed order item (enforces HTTP 409 Conflict).
- [x] **7.3 Dynamic Arithmetic Mean Aggregator:**
  - Compute and cache average rating and review counts on product cards and farmer profiles:
    $$\text{Mean} = \frac{\sum \text{ratings}}{\text{Total Reviews}}$$
- [x] **7.4 Review Display UI:**
  - Verified Buyer badge on produce cards and farmer profile sheets.
  - Interactive review drawer (`ProductReviewsDrawer`) and delivered order rating modal (`ReviewModal`).

---

### [STAGE 8] Platform Administration & Escrow Auditing
* **PRD Requirement:** Section 2 (Administrator Persona), Section 3.1.
* **Objective:** Centralized control for system health, escrow verification, and dispute resolution.

- [x] **8.1 Admin Dashboard UI (`/dashboard/admin`):**
  - High-level metrics: Gross Merchandise Volume (GMV), Total Smallholders Registered, Active Orders, Spoilage Prevention Metrics.
  - Implemented responsive administration portal with strictly zero gradients.
- [x] **8.2 Farmer Credential Auditing:**
  - Verify farm physical locations in Ekiti State (Ikere, Ado, Igbemo, Ilawe, etc.).
  - Approve, verify badge toggle, or suspend vendor listings (`/api/admin/farmers`).
- [x] **8.3 Escrow & Payment Settlement Audit:**
  - Match Paystack payments against released farmer bank payouts (92% take-home).
  - Review transaction reference histories (`FD-YYYYMMDD-XXXXXX`).
  - 1-click escrow payout release action (`/api/admin/escrow`).
- [x] **8.4 Dispute Resolution Workflow & Buyer Submission:**
  - Handle order transit delays, damaged perishable produce reports, or cancellations.
  - Interactive buyer dispute submission trigger on order receipts (`/orders/[reference]`) via `ReportIssueModal`.
  - Implemented `/api/disputes` supporting dispute logging (`perishable_decay`, `transit_delay`, `wrong_packaging_unit`, `missing_item`) and live ticket queries.
  - Dispute status tracking banners (`OPEN`, `INVESTIGATING`, `RESOLVED`, `REFUNDED`) on receipts and order list items.
  - Administrative adjudication with replacement or refund authorization (`/api/admin/disputes`).

---

### [STAGE 9] Performance, Security Hardening & Production Verification
* **PRD Requirement:** Section 5 (Non-Functional Requirements: NFR-1.1 – NFR-3.2).
* **Objective:** Ensure enterprise production readiness, security compliance, sub-1.5MB bundle size, and automated end-to-end verification.

- [x] **9.1 Bundle Size & Network Optimization:**
  - Keep client bundle $< 1.5 \text{ MB}$ for low-end 2G/3G mobile devices in agrarian areas.
  - Configured image optimization for remote photographic assets in `next.config.ts`.
- [x] **9.2 SQL Injection & XSS Audit:**
  - Verify 100% of database queries use parameterized prepared statements and Supabase typed query builders.
  - Sanitize all text search queries, review comments, and farm descriptions against SQL injection and script injection.
- [x] **9.3 Environment Security & CORS Whitelist:**
  - Confirm `JWT_SECRET`, `PAYSTACK_SECRET_KEY`, and DB credentials are isolated.
  - Configured production security headers (`X-Frame-Options: SAMEORIGIN`, `X-Content-Type-Options: nosniff`, `Strict-Transport-Security`, `X-XSS-Protection`) in `next.config.ts`.
- [x] **9.4 Production Verification & Enterprise Hardening:**
  - Comprehensive automated security and vulnerability validation script (`scratch/test_stage9_security.js`).
  - Production verification of RBAC routing, parameterized sanitization, and sub-second catalog response times.
  - Mathematical validation for dynamic commission settlement (8% platform fee, 92% farmer take-home).
  - Real-world ACID concurrency race condition validation under concurrent checkout traffic.

---

## Tracking & Review Protocol

> [!IMPORTANT]
> 1. **Before starting work on any task:** Check this document, locate the corresponding stage and sub-task, and follow the exact PRD requirements.
> 2. **After completing a task:** Mark the corresponding checkbox `[x]`, verify the Next.js build (`npm run build`), and confirm that the zero-gradient design system remains intact.
> 3. **Reference Links:**
>    - Full Requirements: [prd.md](file:///c:/Users/PC/Desktop/farm2door-website/prd.md)
>    - Design Tokens: [lib/design-system.ts](file:///c:/Users/PC/Desktop/farm2door-website/lib/design-system.ts)
>    - Global CSS & Palette: [app/globals.css](file:///c:/Users/PC/Desktop/farm2door-website/app/globals.css)
>    - Landing Page: [app/page.tsx](file:///c:/Users/PC/Desktop/farm2door-website/app/page.tsx)
