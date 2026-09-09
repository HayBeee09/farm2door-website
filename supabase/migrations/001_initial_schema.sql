-- ========================================================================
-- Farm2Door — Supabase PostgreSQL Schema Migration 001
-- System Architecture: Farm2Door Engineering Team
-- Market Region: Ekiti State Commercial Corridor, Nigeria
-- PRD References: Section 4, Section 5.2 (NFR-2.1), Section 6 (Persistence)
-- ========================================================================

-- Enable pgcrypto for UUID generation
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ------------------------------------------------------------------------
-- 1. USERS TABLE (3-Tier Persona: Smallholder Farmer, Buyer, Admin)
-- ------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    full_name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    phone TEXT NOT NULL,
    password_hash TEXT DEFAULT '',
    role TEXT NOT NULL CHECK (role IN ('farmer', 'buyer', 'admin')),
    farm_name TEXT,
    farm_location TEXT, -- e.g. Ikere-Ekiti, Ado-Ekiti, Oye-Ekiti
    address TEXT,
    is_verified BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ------------------------------------------------------------------------
-- 2. CATEGORIES TABLE (PRD FR-2.1: Exactly 6 Agricultural Categories)
-- ------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.categories (
    id SERIAL PRIMARY KEY,
    name TEXT UNIQUE NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    icon TEXT NOT NULL,
    description TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ------------------------------------------------------------------------
-- 3. PRODUCTS TABLE (PRD FR-2.2 & FR-2.3: 5 Harvest Packaging Units)
-- ------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    farmer_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    category_id INT NOT NULL REFERENCES public.categories(id) ON DELETE RESTRICT,
    name TEXT NOT NULL,
    description TEXT,
    unit TEXT NOT NULL CHECK (unit IN ('tuber', 'basket', 'crate', 'bundle', '50kg bag')),
    price_per_unit NUMERIC(12, 2) NOT NULL CHECK (price_per_unit > 0),
    stock_quantity INT NOT NULL DEFAULT 0 CHECK (stock_quantity >= 0),
    is_available BOOLEAN NOT NULL DEFAULT TRUE,
    image_url TEXT NOT NULL,
    harvest_time TEXT, -- e.g. "Picked 6:00 AM Today", "Harvested Yesterday"
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ------------------------------------------------------------------------
-- 4. ORDERS TABLE (PRD Module 3: Escrow & Checkout)
-- Reference Format: FD-YYYYMMDD-XXXXXX
-- ------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    buyer_id UUID NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
    order_reference TEXT UNIQUE NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'in_transit', 'delivered', 'cancelled')),
    total_amount NUMERIC(12, 2) NOT NULL CHECK (total_amount >= 0),
    transit_fee NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK (transit_fee >= 0),
    delivery_address TEXT NOT NULL,
    delivery_phone TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ------------------------------------------------------------------------
-- 5. ORDER_ITEMS TABLE (Granular Line Items & Subtotals)
-- ------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.order_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE RESTRICT,
    quantity INT NOT NULL CHECK (quantity > 0),
    unit_price NUMERIC(12, 2) NOT NULL CHECK (unit_price > 0),
    subtotal NUMERIC(12, 2) NOT NULL CHECK (subtotal > 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ------------------------------------------------------------------------
-- 6. PAYMENTS TABLE (PRD Module 4: Paystack Integration & Audit Trail)
-- ------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
    payment_reference TEXT UNIQUE NOT NULL,
    paystack_reference TEXT,
    amount NUMERIC(12, 2) NOT NULL CHECK (amount > 0),
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'successful', 'failed')),
    channel TEXT DEFAULT 'card', -- card, bank_transfer, ussd
    paid_at TIMESTAMPTZ,
    raw_payload JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ------------------------------------------------------------------------
-- 7. REVIEWS TABLE (PRD Module 5: Quality Feedback & Rating 1-5)
-- ------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.reviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
    buyer_id UUID NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
    order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL,
    rating INT NOT NULL CHECK (rating >= 1 AND rating <= 5),
    comment TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT unique_product_buyer_order_review UNIQUE(product_id, buyer_id, order_id)
);

-- ========================================================================
-- COMPOSITE INDEXES FOR SUB-300ms LATENCY (PRD NFR-1.1 & Section 4.2)
-- ========================================================================
CREATE INDEX IF NOT EXISTS idx_products_category_avail ON public.products(category_id, is_available);
CREATE INDEX IF NOT EXISTS idx_products_unit_avail ON public.products(unit, is_available);
CREATE INDEX IF NOT EXISTS idx_products_farmer ON public.products(farmer_id);
CREATE INDEX IF NOT EXISTS idx_products_price ON public.products(price_per_unit);

CREATE INDEX IF NOT EXISTS idx_orders_buyer ON public.orders(buyer_id);
CREATE INDEX IF NOT EXISTS idx_orders_ref ON public.orders(order_reference);
CREATE INDEX IF NOT EXISTS idx_orders_status ON public.orders(status);

CREATE INDEX IF NOT EXISTS idx_order_items_order ON public.order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_order_items_product ON public.order_items(product_id);

CREATE INDEX IF NOT EXISTS idx_payments_order ON public.payments(order_id);
CREATE INDEX IF NOT EXISTS idx_payments_ref ON public.payments(payment_reference);

CREATE INDEX IF NOT EXISTS idx_reviews_product ON public.reviews(product_id);

-- ========================================================================
-- ACID CONCURRENCY LOCKING STORED FUNCTION (PRD FR-3.2 & FR-3.3)
-- Locks product rows with `SELECT ... FOR UPDATE` before stock decrement.
-- Automatically rolls back if any product stock is insufficient.
-- ========================================================================
CREATE OR REPLACE FUNCTION public.execute_atomic_checkout(
    p_buyer_id UUID,
    p_order_ref TEXT,
    p_delivery_address TEXT,
    p_delivery_phone TEXT,
    p_transit_fee NUMERIC,
    p_items JSONB -- Array of { "product_id": UUID, "quantity": INT }
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_item RECORD;
    v_product RECORD;
    v_total_amount NUMERIC(12, 2) := 0;
    v_order_id UUID;
    v_subtotal NUMERIC(12, 2);
BEGIN
    -- 1. Create order record first in 'pending' state
    INSERT INTO public.orders (
        buyer_id,
        order_reference,
        status,
        total_amount,
        transit_fee,
        delivery_address,
        delivery_phone
    ) VALUES (
        p_buyer_id,
        p_order_ref,
        'pending',
        0, -- will update after items calculated
        p_transit_fee,
        p_delivery_address,
        p_delivery_phone
    ) RETURNING id INTO v_order_id;

    -- 2. Iterate through each cart line item with row-level lock
    FOR v_item IN SELECT * FROM jsonb_to_recordset(p_items) AS x(product_id UUID, quantity INT)
    LOOP
        -- Acquire pessimistic row lock (SELECT ... FOR UPDATE)
        SELECT id, name, price_per_unit, stock_quantity, is_available
        INTO v_product
        FROM public.products
        WHERE id = v_item.product_id
        FOR UPDATE;

        IF NOT FOUND THEN
            RAISE EXCEPTION 'Product % does not exist.', v_item.product_id;
        END IF;

        IF v_product.stock_quantity < v_item.quantity THEN
            RAISE EXCEPTION 'Insufficient stock for "%". Requested: %, Available: %',
                v_product.name, v_item.quantity, v_product.stock_quantity;
        END IF;

        -- Calculate item subtotal
        v_subtotal := v_product.price_per_unit * v_item.quantity;
        v_total_amount := v_total_amount + v_subtotal;

        -- Insert line item
        INSERT INTO public.order_items (
            order_id,
            product_id,
            quantity,
            unit_price,
            subtotal
        ) VALUES (
            v_order_id,
            v_product.id,
            v_item.quantity,
            v_product.price_per_unit,
            v_subtotal
        );

        -- Decrement inventory stock atomically
        UPDATE public.products
        SET stock_quantity = stock_quantity - v_item.quantity,
            is_available = CASE WHEN (stock_quantity - v_item.quantity) = 0 THEN FALSE ELSE TRUE END,
            updated_at = NOW()
        WHERE id = v_product.id;
    END LOOP;

    -- 3. Update order with final total amount including transit fee
    v_total_amount := v_total_amount + p_transit_fee;

    UPDATE public.orders
    SET total_amount = v_total_amount,
        updated_at = NOW()
    WHERE id = v_order_id;

    -- Return the generated order details
    RETURN jsonb_build_object(
        'success', TRUE,
        'order_id', v_order_id,
        'order_reference', p_order_ref,
        'total_amount', v_total_amount
    );
END;
$$;

-- ========================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ========================================================================
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

-- Categories: Read-only for public
CREATE POLICY "Categories are readable by everyone"
    ON public.categories FOR SELECT
    USING (true);

-- Products: Available products are readable by everyone
CREATE POLICY "Available products readable by public"
    ON public.products FOR SELECT
    USING (true);

-- Products: Farmers can insert their own products
CREATE POLICY "Farmers can insert products"
    ON public.products FOR INSERT
    WITH CHECK (auth.uid() = farmer_id);

-- Products: Farmers can update their own products
CREATE POLICY "Farmers can update own products"
    ON public.products FOR UPDATE
    USING (auth.uid() = farmer_id);

-- Orders: Buyers can view their own orders
CREATE POLICY "Buyers can view own orders"
    ON public.orders FOR SELECT
    USING (auth.uid() = buyer_id);

-- Order items: Buyers can view items for their own orders
CREATE POLICY "Buyers can view own order items"
    ON public.order_items FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.orders
            WHERE orders.id = order_items.order_id
            AND orders.buyer_id = auth.uid()
        )
    );

-- Reviews: Readable by public
CREATE POLICY "Reviews readable by everyone"
    ON public.reviews FOR SELECT
    USING (true);

-- Reviews: Authenticated buyers can insert reviews
CREATE POLICY "Buyers can insert reviews"
    ON public.reviews FOR INSERT
    WITH CHECK (auth.uid() = buyer_id);

-- Users: Users can view their own profile
CREATE POLICY "Users can view own profile"
    ON public.users FOR SELECT
    USING (auth.uid() = id);

-- Users: Public can view farmer profiles
CREATE POLICY "Public can view farmer profiles"
    ON public.users FOR SELECT
    USING (role = 'farmer');

-- Users: Users can update their own profile
CREATE POLICY "Users can update own profile"
    ON public.users FOR UPDATE
    USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);

-- Users: Service role or auth trigger can insert user profiles
CREATE POLICY "Users can insert own profile"
    ON public.users FOR INSERT
    WITH CHECK (auth.uid() = id);

-- ------------------------------------------------------------------------
-- 10. AUTH TRIGGER: Automatic Profile Sync from Supabase Auth (auth.users)
-- ------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (
    id,
    full_name,
    email,
    phone,
    role,
    farm_name,
    farm_location,
    address,
    is_verified
  )
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'phone', ''),
    COALESCE(NEW.raw_user_meta_data->>'role', 'buyer'),
    NEW.raw_user_meta_data->>'farm_name',
    NEW.raw_user_meta_data->>'farm_location',
    NEW.raw_user_meta_data->>'address',
    FALSE
  )
  ON CONFLICT (id) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    phone = EXCLUDED.phone,
    role = EXCLUDED.role,
    farm_name = EXCLUDED.farm_name,
    farm_location = EXCLUDED.farm_location,
    address = EXCLUDED.address,
    updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT OR UPDATE ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

