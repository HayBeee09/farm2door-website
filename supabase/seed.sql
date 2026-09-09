-- ========================================================================
-- Farm2Door — Supabase Seed Data
-- PRD References: Section 4.2 (FR-2.1 Categories, FR-2.2 Produce)
-- System Architecture: Farm2Door Engineering Team
-- ========================================================================

-- ------------------------------------------------------------------------
-- 1. SEED CATEGORIES (Exactly 6 Categories from PRD FR-2.1)
-- ------------------------------------------------------------------------
INSERT INTO public.categories (id, name, slug, icon, description) VALUES
(1, 'Tubers & Roots', 'tubers-roots', '🥔', 'Starchy staples including white yam, yellow yam, and cassava harvested fresh.'),
(2, 'Vegetables', 'vegetables', '🥬', 'Nutrient-dense leafy greens such as fluted pumpkin (ugwu), waterleaf, and bitterleaf.'),
(3, 'Fruits', 'fruits', '🍊', 'Naturally ripened tree and orchard fruits including sweet Valencia oranges and plantains.'),
(4, 'Grains & Cereals', 'grains-cereals', '🌾', 'Stone-free parboiled local rice (Igbemo Ofada), maize, and guinea corn.'),
(5, 'Legumes & Beans', 'legumes-beans', '🫘', 'High-protein brown honey beans (oloyin), cowpeas, and soy beans sorted clean.'),
(6, 'Peppers & Spices', 'peppers-spices', '🌶️', 'Aromatic scotch bonnet (rodo), tatase sweet peppers, and local chili varieties.')
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    slug = EXCLUDED.slug,
    icon = EXCLUDED.icon,
    description = EXCLUDED.description;

-- ------------------------------------------------------------------------
-- 2. SEED SAMPLE FARMERS & USERS
-- ------------------------------------------------------------------------
INSERT INTO public.users (id, full_name, email, phone, password_hash, role, farm_name, farm_location, address, is_verified)
VALUES
('11111111-1111-1111-1111-111111111111', 'Babatunde Agro', 'babatunde@farm2door.ng', '+2348031234567', '$2a$12$dummyhashedpasswordforbabatundeagro', 'farmer', 'Babatunde Organic Farms', 'Ikere-Ekiti', 'Along College of Education Road, Ikere-Ekiti', TRUE),
('22222222-2222-2222-2222-222222222222', 'Grace Agboola', 'grace@farm2door.ng', '+2348059876543', '$2a$12$dummyhashedpasswordforgraceagboola', 'farmer', 'Agboola Spice Gardens', 'Ado-Ekiti Outskirts', 'Ilawe Road, Ado-Ekiti', TRUE),
('33333333-3333-3333-3333-333333333333', 'Ekiti Fresh Agro Ventures', 'agro@ekitifresh.ng', '+2348023456789', '$2a$12$dummyhashedpasswordforekitifresh', 'farmer', 'Ekiti Commercial Agro Plantation', 'Ikere-Ekiti South Farms', 'South Farmlands, Ikere-Ekiti', TRUE),
('44444444-4444-4444-4444-444444444444', 'Igbemo Rice Millers Co-op', 'igbemo@farm2door.ng', '+2348061112233', '$2a$12$dummyhashedpasswordforigbemocoop', 'farmer', 'Igbemo Central Cooperative Mill', 'Igbemo-Ekiti', 'Central Mill Road, Igbemo-Ekiti', TRUE),
('55555555-5555-5555-5555-555555555555', 'Ekundayo Oluwagbenga (Admin)', 'admin@farm2door.ng', '+2348099998888', '$2a$12$dummyhashedpasswordforadminaccount', 'admin', NULL, 'Ikere-Ekiti', 'Commercial Operations Hub, Ikere-Ekiti', TRUE)
ON CONFLICT (email) DO NOTHING;

-- ------------------------------------------------------------------------
-- 3. SEED INITIAL PRODUCE INVENTORY (Using Authentic Photography)
-- ------------------------------------------------------------------------
INSERT INTO public.products (id, farmer_id, category_id, name, description, unit, price_per_unit, stock_quantity, is_available, image_url, harvest_time)
VALUES
(
    'a1111111-1111-1111-1111-111111111111',
    '11111111-1111-1111-1111-111111111111',
    1,
    'Premium Ekiti White Yam',
    'Dry, starchy white yam tubers. Zero preservative chemicals, perfect for pounded yam.',
    'tuber',
    3500.00,
    28,
    TRUE,
    '/images/produce/yam-tubers.jpg',
    'Harvested Yesterday'
),
(
    'a2222222-2222-2222-2222-222222222222',
    '22222222-2222-2222-2222-222222222222',
    6,
    'Fresh Scotch Bonnet (Rodo)',
    'Pungent, highly aromatic fiery red habanero peppers in aerated local cane baskets.',
    'basket',
    5800.00,
    14,
    TRUE,
    '/images/produce/scotch-bonnet.jpg',
    'Picked 6:00 AM Today'
),
(
    'a3333333-3333-3333-3333-333333333333',
    '33333333-3333-3333-3333-333333333333',
    2,
    'Tender Fluted Pumpkin (Ugwu)',
    'Deep green, moisture-locked crisp vegetable bundles rich in iron and dietary fiber.',
    'bundle',
    450.00,
    45,
    TRUE,
    '/images/produce/ugwu-leaves.jpg',
    'Cut 5:30 AM Today'
),
(
    'a4444444-4444-4444-4444-444444444444',
    '44444444-4444-4444-4444-444444444444',
    4,
    'Stone-Free Igbemo Ofada Rice',
    'Locally de-stoned, aromatic parboiled unpolished rice in durable woven 50kg bags.',
    '50kg bag',
    48000.00,
    9,
    TRUE,
    '/images/produce/ofada-rice.jpg',
    'Milled This Week'
),
(
    'a5555555-5555-5555-5555-555555555555',
    '11111111-1111-1111-1111-111111111111',
    3,
    'Sweet Valencia Farm Oranges',
    'Juicy, thin-skinned golden oranges packed in sturdy wooden transport crates.',
    'crate',
    7200.00,
    16,
    TRUE,
    '/images/produce/valencia-oranges.jpg',
    'Picked 2 Days Ago'
),
(
    'a6666666-6666-6666-6666-666666666666',
    '44444444-4444-4444-4444-444444444444',
    5,
    'Brown Honey Beans (Oloyin)',
    'Sweet boiling Nigerian honey beans. Hand-sorted, weevil-free, zero chemical dip.',
    '50kg bag',
    42000.00,
    7,
    TRUE,
    '/images/produce/honey-beans.jpg',
    'New Season Harvest'
),
(
    'a7777777-7777-7777-7777-777777777777',
    '33333333-3333-3333-3333-333333333333',
    2,
    'Crisp Waterleaf (Gbure)',
    'Succulent fresh waterleaf stems, ideal for edikang-ikong and traditional soups.',
    'bundle',
    350.00,
    32,
    TRUE,
    '/images/produce/waterleaf.jpg',
    'Cut 6:15 AM Today'
),
(
    'a8888888-8888-8888-8888-888888888888',
    '22222222-2222-2222-2222-222222222222',
    6,
    'Aromatic Red Bell Peppers (Tatase)',
    'Thick-walled, deep red sweet peppers for rich stew texture and vibrant coloration.',
    'basket',
    6400.00,
    11,
    TRUE,
    '/images/produce/tatase-peppers.jpg',
    'Harvested Yesterday'
)
ON CONFLICT (id) DO UPDATE SET
    price_per_unit = EXCLUDED.price_per_unit,
    stock_quantity = EXCLUDED.stock_quantity,
    image_url = EXCLUDED.image_url;
