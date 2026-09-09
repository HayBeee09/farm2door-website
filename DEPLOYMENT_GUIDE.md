# Farm2Door — Enterprise Production Deployment & Infrastructure Runbook

> **Platform:** Farm2Door  
> **Market Corridor:** Ekiti State Commercial Corridor, Nigeria  
> **Target Cloud Infrastructure:** Vercel (Edge & Serverless) + Supabase Cloud (Managed PostgreSQL) + Paystack (Fintech Settlement)  
> **Version:** 1.0.0 Production Release  

---

## Table of Contents
1. [Architecture & Infrastructure Overview](#1-architecture--infrastructure-overview)
2. [Environment Variables Matrix](#2-environment-variables-matrix)
3. [Supabase Cloud Database Setup & Migrations](#3-supabase-cloud-database-setup--migrations)
4. [Paystack Payment Gateway Configuration](#4-paystack-payment-gateway-configuration)
5. [Deploying to Vercel (Step-by-Step)](#5-deploying-to-vercel-step-by-step)
6. [Custom Domain & DNS Setup (e.g., farm2door.ng)](#6-custom-domain--dns-setup)
7. [Post-Deployment Verification & Smoke Testing](#7-post-deployment-verification--smoke-testing)
8. [Maintenance, Backups & Incident Response](#8-maintenance-backups--incident-response)

---

## 1. Architecture & Infrastructure Overview

Farm2Door runs on a cloud-native, serverless architecture optimized for high concurrency, sub-300ms latency, and low data bandwidth across Nigerian mobile networks:

```
[ Mobile / Desktop PWA Client ]
               │
               ▼ (HTTPS / HTTP/2)
    [ Vercel Edge Network ]
    ├── App Router Serverless Functions (Next.js 16)
    ├── Static Route Caching (SSG / ISR)
    └── Dynamic API Endpoints (/api/products, /api/orders, /api/payments)
               │
       ┌───────┴───────────────────────┐
       ▼                               ▼
[ Supabase Cloud (PostgreSQL 15) ]   [ Paystack API ]
├── ACID Row-Level Locking          ├── Webhooks (HMAC-SHA512)
├── Composite Indexes               ├── Card / USSD / Bank Transfer
└── Row-Level Security (RLS)        └── Direct Farmer Bank NIP Transfer (92%)
```

---

## 2. Environment Variables Matrix

Create your production environment configuration in the Vercel Dashboard under **Project Settings $\rightarrow$ Environment Variables**:

| Variable Name | Environment | Description | Example / Format |
| :--- | :---: | :--- | :--- |
| `NEXT_PUBLIC_SUPABASE_URL` | Production | Public REST API URL of your Supabase Cloud project | `https://your-project.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Production | Client-safe anonymous API key | `your-supabase-anon-key` |
| `SUPABASE_SERVICE_ROLE_KEY` | Production (Secret) | High-privilege service key for backend admin tasks & RLS bypass | `your-supabase-service-role-key` |
| `PAYSTACK_PUBLIC_KEY` | Production | Paystack live public key for checkout initialization | `your-paystack-live-public-key` |
| `PAYSTACK_SECRET_KEY` | Production (Secret) | Paystack live secret key for verification and webhook validation | `your-paystack-live-secret-key` |
| `JWT_SECRET` | Production (Secret) | Cryptographic string for signing authentication tokens (min 32 chars) | `your-64-char-hex-random-token` |
| `NEXT_PUBLIC_APP_URL` | Production | Canonical public URL of the deployed application | `https://farm2door.ng` |

> [!CAUTION]
> **Never commit `SUPABASE_SERVICE_ROLE_KEY` or `PAYSTACK_SECRET_KEY` to public Git repositories.** Vercel securely encrypts these keys in transit and at rest.

---

## 3. Supabase Cloud Database Setup & Migrations

### Step 3.1: Create Your Supabase Project
1. Log in to [Supabase Cloud Console](https://database.new).
2. Click **New Project** and configure:
   - **Name**: `farm2door-production`
   - **Database Password**: Generate a secure 24-character password.
   - **Region**: Choose `EU (Frankfurt)` or `EU (London)` for optimal latency to Nigeria and international internet gateways.
3. Once provisioned, navigate to **Project Settings $\rightarrow$ API** to copy:
   - `Project URL` $\rightarrow$ maps to `NEXT_PUBLIC_SUPABASE_URL`
   - `anon public key` $\rightarrow$ maps to `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `service_role secret key` $\rightarrow$ maps to `SUPABASE_SERVICE_ROLE_KEY`

### Step 3.2: Run Master Production Migration
1. In the Supabase Dashboard, open the **SQL Editor** from the left sidebar.
2. Open [`supabase/full_migration.sql`](file:///c:/Users/PC/Desktop/farm2door-website/supabase/full_migration.sql) from this repository.
3. Paste the complete SQL script into the query editor and click **Run**.
4. The migration will establish:
   - Tables: `users`, `categories`, `products`, `orders`, `order_items`, `payments`, `reviews`.
   - Seed data: The 6 PRD agricultural categories, verified Ekiti smallholders, and initial crop harvests.
   - Triggers: Concurrency stock locking triggers (`SELECT ... FOR UPDATE`), automated zero-stock availability deactivation, and timestamp hooks.
   - Row-Level Security (RLS) policies ensuring buyers and farmers only access authorized records.

---

## 4. Paystack Payment Gateway Configuration

### Step 4.1: Switch to Live Keys
1. Access the [Paystack Dashboard](https://dashboard.paystack.com).
2. Go to **Settings $\rightarrow$ API Keys & Webhooks**.
3. Copy:
   - **Live Public Key**
   - **Live Secret Key**
4. Paste these into your Vercel project environment variables.

### Step 4.2: Configure Webhook URL
1. On the same Paystack settings page, locate the **Live Webhook URL** field.
2. Enter your production webhook endpoint:
   ```
   https://farm2door.ng/api/payments/webhook
   ```
3. Set **Test Webhook URL** to your staging or preview domain if desired.
4. Click **Save Changes**. Paystack will send cryptographic HMAC-SHA512 signed webhooks whenever a customer completes a card, USSD, or direct bank transfer payment.

---

## 5. Deploying to Vercel (Step-by-Step)

### Step 5.1: Push Repository to GitHub
Ensure your repository is committed and pushed to GitHub:
```bash
git add .
git commit -m "feat: complete production release of Farm2Door"
git push origin main
```

### Step 5.2: Import Project into Vercel
1. Log in to [Vercel](https://vercel.com).
2. Click **Add New... $\rightarrow$ Project**.
3. Select your `farm2door-website` GitHub repository and click **Import**.
4. Configure the Build & Development Settings:
   - **Framework Preset**: `Next.js`
   - **Root Directory**: `./`
   - **Build Command**: `npm run build` (Turbopack compiler enabled)
   - **Output Directory**: `.next`
5. Expand the **Environment Variables** section and paste the variables from [Section 2](#2-environment-variables-matrix).
6. Click **Deploy**. Vercel will build the 32 production routes and deploy them to global edge nodes.

---

## 6. Custom Domain & DNS Setup

To link your custom domain (e.g. `farm2door.ng` or `www.farm2door.ng`):
1. In your Vercel Project Dashboard, navigate to **Settings $\rightarrow$ Domains**.
2. Enter `farm2door.ng` and click **Add**.
3. Add the corresponding DNS records at your domain registrar (e.g. Whois.com, Whogohost, Namecheap):

| Type | Name / Host | Value / Target | TTL |
| :---: | :---: | :---: | :---: |
| `A` | `@` | `76.76.21.21` | `Automatic` / `3600` |
| `CNAME` | `www` | `cname.vercel-dns.com` | `Automatic` / `3600` |

4. Vercel will automatically provision a free, auto-renewing **Let's Encrypt SSL/TLS certificate** for secure HTTPS transmission.

---

## 7. Post-Deployment Verification & Smoke Testing

Run through this smoke test checklist once deployed:

1. **Marketplace Load Time**:
   - Open your production URL (`https://farm2door.ng`).
   - Check response time in browser DevTools Network tab: `< 300 ms` for catalog queries (NFR-1.1).
2. **PWA Mobile Installability**:
   - Open on an Android or iOS device in Chrome/Safari.
   - Verify the bottom install banner appears ("Add Farm2Door to Home Screen").
   - Install the app and confirm standalone launch without browser address bar.
3. **End-to-End Transaction**:
   - Add items to the cart and proceed to checkout.
   - Complete payment and verify the order receipt at `/orders/FD-...`.
   - Click **"Print / Save PDF Receipt"** and verify invoice rendering.
4. **Farmer Bank Settlement Verification**:
   - Log into `/dashboard/farmer` and confirm the order is listed in inbound dispatch.
   - Mark as dispatched and delivered.
   - In `/dashboard/admin`, verify that the 92% take-home payout is reflected in the Escrow ledger with the farmer's registered NUBAN.

---

## 8. Maintenance, Backups & Incident Response

- **Automated Database Backups**: Supabase Cloud performs daily automated WAL backups. For point-in-time recovery (PITR), upgrade to the Pro plan if higher retention is required.
- **Log Inspection**:
  - Runtime edge logs: View in the **Vercel Project Dashboard $\rightarrow$ Logs**.
  - PostgreSQL database query logs & slow queries: View in **Supabase Dashboard $\rightarrow$ Logs Explorer**.
- **Dispute & Refund Escalation**:
  - If a perishable crop is damaged in transit, navigate to `/dashboard/admin $\rightarrow$ Disputes` to issue a replacement authorization or record an escrow refund.
