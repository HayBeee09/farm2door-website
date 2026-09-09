# PRODUCT REQUIREMENTS DOCUMENT (PRD)

**Platform Title:** Farm2Door — An Online Marketplace for Local Farmers and Fresh Produce Vendors  
**Document Version:** 1.0.0  
**Organization:** Farm2Door Agricultural Initiative  
**Market Region:** Ekiti State Commercial Corridor, Nigeria  
**Date:** September 2026  
**Status:** Approved for Production Deployment  

---

## 1. Executive Summary & Problem Statement

### 1.1 Executive Summary
Farm2Door is a purpose-built, three-tier agricultural e-commerce platform designed to link smallholder farmers directly with end consumers, food service businesses, and urban retailers. By providing a centralized digital storefront, direct farm-gate inventory listings, integrated payment verification via Paystack, and verified peer reviews, the platform bypasses predatory middlemen networks, minimizes post-harvest produce spoilage, and enforces price transparency.

### 1.2 Problem Statement
Traditional agricultural distribution across Nigeria—and Ekiti State in particular—is hindered by critical structural bottlenecks:
* **Intermediary Monopoly:** 3 to 5 layers of aggregators, wholesalers, and retail brokers extract up to 50–70% of the final retail price, leaving smallholder farmers with suppressed farm-gate returns.
* **Perishability & Post-Harvest Losses:** Delayed manual price negotiations and physical transit hurdles cause an estimated 40% loss of fresh produce (tomatoes, peppers, leafy vegetables, tubers) before consumption.
* **Information Asymmetry:** Farmers lack real-time visibility into prevailing consumer demand and competitive market pricing.
* **Absence of Specialized Platforms:** Mainstream e-commerce platforms (e.g., Jiji, Jumia) cater to non-perishable manufactured goods and lack support for agricultural metrics (units of harvest, variable shelf-life decay, rapid-turnover inventory).

---

## 2. Stakeholders & User Personas

| Persona | Primary Needs | Key Pain Points | Platform Permissions |
| :--- | :--- | :--- | :--- |
| **Smallholder Farmer / Produce Vendor** | • List harvests rapidly.<br>• Guaranteed, direct digital payouts.<br>• Direct access to urban buyers. | • High post-harvest spoilage.<br>• Low price offers from exploitative aggregators.<br>• Complex software navigation. | Create/Edit/Archive listings; view inbound orders; track earnings. |
| **Buyer (Household / Restaurant / Retailer)** | • Source fresh, verifiable produce.<br>• Transparent, non-inflated pricing.<br>• Secure digital checkout. | • Inconvenience of visiting physical markets.<br>• Variable quality and unknown provenance.<br>• Hidden markups. | Browse catalog; manage cart; initiate orders; pay via Paystack; leave ratings. |
| **Platform Administrator** | • Maintain platform health.<br>• Audit escrow and payout distributions.<br>• Moderate suspicious listings or users. | • Dispute resolution overhead.<br>• Fraudulent listing attempts. | Global read/write; verify vendor credentials; resolve order disputes; system metrics. |

---

## 3. Scope & System Boundaries

### 3.1 In-Scope (Phase 1 — MVP)
* Role-based Authentication (Farmer, Buyer, Admin) using JSON Web Tokens (JWT) and Bcrypt hashing.
* Categorized agricultural product discovery with full-text search and category filtering.
* Dynamic inventory management supporting localized farm packaging units (`tuber`, `basket`, `crate`, `bundle`, `50kg bag`).
* Real-time stock reservation and concurrency locking during checkout.
* Payment gateway integration via Paystack (Debit Card, USSD, Bank Transfer).
* Order lifecycle management (`pending`, `confirmed`, `in_transit`, `delivered`, `cancelled`).
* Post-purchase buyer ratings and feedback system.
* Responsive web-based frontend optimized for both desktop and low-end mobile browsers.

### 3.2 Out-of-Scope (Deferred to Future Iterations)
* Native Android/iOS apps (platform will run as a Progressive Web App in Phase 1).
* In-house automated GPS freight dispatch and courier tracking algorithms (farmers and buyers arrange pickup/direct transit points).
* Automated ML-driven indigenous voice-to-listing transcription (Phase 2 expansion).

---

## 4. Functional Requirements

### 4.1 Module 1: Authentication & User Management
* **FR-1.1 Registration:** The system shall allow users to register by providing `full_name`, `email`, `phone`, `password`, `role` (`farmer`, `buyer`), and optional `farm_name` and `address`.
* **FR-1.2 Credential Security:** Passwords must be hashed using `bcryptjs` with a minimum work factor (salt rounds) of 10 prior to database insertion.
* **FR-1.3 Session Handling:** The platform must issue a signed JSON Web Token (JWT) with a 7-day expiration upon successful authentication.
* **FR-1.4 Profile Management:** Users must be able to update contact phone numbers, delivery addresses, and business descriptions.

### 4.2 Module 2: Catalog & Inventory Management
* **FR-2.1 Produce Categorization:** Produce listings must belong to one of 6 fixed primary agricultural categories:
  1. *Tubers & Roots*
  2. *Vegetables*
  3. *Fruits*
  4. *Grains & Cereals*
  5. *Legumes & Beans*
  6. *Peppers & Spices*
* **FR-2.2 Produce Listing:** Farmers must be able to publish listings specifying `name`, `category_id`, `description`, `unit` (`tuber`, `crate`, `bundle`, `basket`, `bag`), `price_per_unit`, `stock_quantity`, and an `image_url`.
* **FR-2.3 Real-Time Stock Updates:** The system must immediately decrement `stock_quantity` upon confirmed checkout. If `stock_quantity == 0`, `is_available` must automatically toggle to `FALSE`.
* **FR-2.4 Search & Filtering:** The system shall support combined multi-parameter queries filtering by `category_id`, keyword string (`LIKE %query%`), and minimum/maximum unit price.

### 4.3 Module 3: Cart, Orders & Concurrency
* **FR-3.1 Cart Persistence:** Buyers can stage items from multiple farmers in an in-memory/local storage cart.
* **FR-3.2 Concurrency Lock:** At the point of checkout execution, the system must initiate a database transaction with row-level locks (`SELECT ... FOR UPDATE`) to verify that all requested item quantities are less than or equal to current available stock.
* **FR-3.3 Transaction Rollback:** If any single item in the cart exceeds available stock during checkout, the entire transaction must abort, roll back database state, and return a descriptive out-of-stock notification to the buyer.

### 4.4 Module 4: Payment Gateway Integration (Paystack)
* **FR-4.1 Transaction Initialization:** The system must generate a unique transaction reference formatted as `FD-YYYYMMDD-XXXXXX` and open the Paystack transaction modal/gateway.
* **FR-4.2 Verification & Settlement:** The application must verify transactions by querying Paystack’s verification endpoint (`https://api.paystack.co/transaction/verify/:reference`) or validating inbound HMAC-SHA512 webhook signatures using the secret key.
* **FR-4.3 Payment Record:** Successful settlements must write to the `payments` table with `status = 'successful'`, recording `amount`, `payment_reference`, and `paid_at` timestamp.

### 4.5 Module 5: Trust & Reputation System
* **FR-5.1 Verified Reviews:** Only buyers who have completed an order containing a product may submit a numerical rating (1 to 5) and an optional text review.
* **FR-5.2 Aggregated Score:** Product and farmer cards must display the computed arithmetic mean rating across all verified product reviews.

---

## 5. Non-Functional Requirements

### 5.1 Performance & Latency
* **NFR-1.1 API Response Times:** Standard database queries (catalog browse, search, category filters) must return responses within 300 ms or less under a concurrent load of 250 requests.
* **NFR-1.2 Lightweight Bundle Size:** The frontend client payload must remain under 1.5 MB to ensure fast loading over constrained 2G/3G mobile cellular networks typical in rural communities.

### 5.2 Security & Compliance
* **NFR-2.1 SQL Injection Protection:** All database communications must exclusively use parameterized prepared statements (`mysql2/promise`). Raw string concatenation of user inputs in SQL queries is strictly forbidden.
* **NFR-2.2 Cross-Origin Resource Sharing (CORS):** The API must strictly whitelist authorized frontend client origins.
* **NFR-2.3 Secret Key Isolation:** Credentials such as `JWT_SECRET`, database passwords, and `PAYSTACK_SECRET_KEY` must never be committed to source control and must be loaded via environment variables (`.env`).

### 5.3 Reliability & Fault Tolerance
* **NFR-3.1 ACID Compliance:** All financial checkouts and inventory deductions must be wrapped within atomic database transactions with deterministic rollback logic.
* **NFR-3.2 Availability:** Target uptime of 99.5% during peak regional market trading windows (6:00 AM – 8:00 PM West Africa Time).

---

## 6. Technical Architecture & Data Design

```text
[Presentation Layer]
    Tailwind CSS + HTML5 + Vanilla JS / React Single Page Interface
                 |  HTTPS / RESTful JSON
                 v
[Application Logic Layer]
    Node.js (v18+) + Express.js
    ├── JWT Authentication & Role Authorization Middleware
    ├── Inventory & Atomic Order Processing Controller
    └── Paystack Payment Verification Service
                 |
                 +-----> External API: Paystack Gateway (Card/USSD/Transfer)
                 |
                 v  TCP / MySQL Protocol (Pool Connection)
[Data Persistence Layer]
    MySQL 8.0+ Relational Database Management System (InnoDB Engine)