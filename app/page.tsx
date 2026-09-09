"use client";

import React, { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import { AGRICULTURAL_UNITS, PRODUCE_CATEGORIES } from "@/lib/design-system";
import { useAuth } from "@/lib/auth-context";
import { useCart } from "@/lib/cart-context";
import ProductReviewsDrawer from "@/components/reviews/ProductReviewsDrawer";

interface Product {
  id: string;
  name: string;
  categoryId: number;
  categoryName: string;
  categoryIcon?: string;
  unit: "tuber" | "basket" | "crate" | "bundle" | "50kg bag";
  price: number;
  stock: number;
  farmerName: string;
  location: string;
  harvestTime: string;
  rating: number;
  reviewCount: number;
  description: string;
  icon?: string;
  imageUrl: string;
  badge?: string;
  isVerifiedFarmer?: boolean;
}

interface CategoryWithCount {
  id: number;
  name: string;
  slug: string;
  icon: string;
  description: string;
  product_count: number;
}

interface CartItem {
  product: Product;
  quantity: number;
}

const SAMPLE_PRODUCTS: Product[] = [
  {
    id: "prod-1",
    name: "Premium Ekiti White Yam",
    categoryId: 1,
    categoryName: "Tubers & Roots",
    unit: "tuber",
    price: 3500,
    stock: 28,
    farmerName: "Babatunde Agro",
    location: "Ikere-Ekiti",
    harvestTime: "Harvested Yesterday",
    rating: 4.9,
    reviewCount: 52,
    description: "Dry, starchy white yam tubers. Zero preservative chemicals, perfect for pounded yam.",
    icon: "🥔",
    imageUrl: "/images/produce/yam-tubers.jpg",
    badge: "Bestseller",
  },
  {
    id: "prod-2",
    name: "Fresh Scotch Bonnet (Rodo)",
    categoryId: 6,
    categoryName: "Peppers & Spices",
    unit: "basket",
    price: 5800,
    stock: 14,
    farmerName: "Grace Agboola",
    location: "Ado-Ekiti Outskirts",
    harvestTime: "Picked 6:00 AM Today",
    rating: 4.8,
    reviewCount: 39,
    description: "Pungent, highly aromatic fiery red habanero peppers in aerated local cane baskets.",
    icon: "🌶️",
    imageUrl: "/images/produce/scotch-bonnet.jpg",
    badge: "Fresh Pick",
  },
  {
    id: "prod-3",
    name: "Tender Fluted Pumpkin (Ugwu)",
    categoryId: 2,
    categoryName: "Vegetables",
    unit: "bundle",
    price: 450,
    stock: 45,
    farmerName: "Ekiti Fresh Agro Ventures",
    location: "Ikere-Ekiti South Farms",
    harvestTime: "Cut 5:30 AM Today",
    rating: 5.0,
    reviewCount: 68,
    description: "Deep green, moisture-locked crisp vegetable bundles rich in iron and dietary fiber.",
    icon: "🥬",
    imageUrl: "/images/produce/ugwu-leaves.jpg",
    badge: "Organic",
  },
  {
    id: "prod-4",
    name: "Stone-Free Igbemo Ofada Rice",
    categoryId: 4,
    categoryName: "Grains & Cereals",
    unit: "50kg bag",
    price: 48000,
    stock: 9,
    farmerName: "Igbemo Rice Millers Co-op",
    location: "Igbemo-Ekiti",
    harvestTime: "Milled This Week",
    rating: 4.9,
    reviewCount: 114,
    description: "Locally de-stoned, aromatic parboiled unpolished rice in durable woven 50kg bags.",
    icon: "🌾",
    imageUrl: "/images/produce/ofada-rice.jpg",
    badge: "Direct Mill",
  },
  {
    id: "prod-5",
    name: "Sweet Valencia Farm Oranges",
    categoryId: 3,
    categoryName: "Fruits",
    unit: "crate",
    price: 7200,
    stock: 16,
    farmerName: "Oye Citrus Orchards",
    location: "Oye-Ekiti",
    harvestTime: "Picked 2 Days Ago",
    rating: 4.7,
    reviewCount: 31,
    description: "Juicy, thin-skinned golden oranges packed in sturdy wooden transport crates.",
    icon: "🍊",
    imageUrl: "/images/produce/valencia-oranges.jpg",
  },
  {
    id: "prod-6",
    name: "Brown Honey Beans (Oloyin)",
    categoryId: 5,
    categoryName: "Legumes & Beans",
    unit: "50kg bag",
    price: 42000,
    stock: 7,
    farmerName: "Ayedun Grain Growers",
    location: "Ayedun-Ekiti",
    harvestTime: "New Season Harvest",
    rating: 4.8,
    reviewCount: 44,
    description: "Sweet boiling Nigerian honey beans. Hand-sorted, weevil-free, zero chemical dip.",
    icon: "🫘",
    imageUrl: "/images/produce/honey-beans.jpg",
    badge: "Chemical-Free",
  },
  {
    id: "prod-7",
    name: "Crisp Waterleaf (Gbure)",
    categoryId: 2,
    categoryName: "Vegetables",
    unit: "bundle",
    price: 350,
    stock: 32,
    farmerName: "River Valley Growers",
    location: "Ilawe-Ekiti",
    harvestTime: "Cut 6:15 AM Today",
    rating: 4.9,
    reviewCount: 26,
    description: "Succulent fresh waterleaf stems, ideal for edikang-ikong and traditional soups.",
    icon: "🌱",
    imageUrl: "/images/produce/waterleaf.jpg",
  },
  {
    id: "prod-8",
    name: "Aromatic Red Bell Peppers (Tatase)",
    categoryId: 6,
    categoryName: "Peppers & Spices",
    unit: "basket",
    price: 6400,
    stock: 11,
    farmerName: "Adeleke Farmstead",
    location: "Ikere-Ekiti",
    harvestTime: "Harvested Yesterday",
    rating: 4.8,
    reviewCount: 22,
    description: "Thick-walled, deep red sweet peppers for rich stew texture and vibrant coloration.",
    icon: "🫑",
    imageUrl: "/images/produce/tatase-peppers.jpg",
  },
];

export default function Home() {
  const [selectedCategory, setSelectedCategory] = useState<number>(0); // 0 = All
  const [selectedUnit, setSelectedUnit] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [debouncedSearch, setDebouncedSearch] = useState<string>("");
  const [sortBy, setSortBy] = useState<string>("newest");
  const [priceFilterRange, setPriceFilterRange] = useState<string>("all");

  // Live Supabase state
  const [products, setProducts] = useState<Product[]>(SAMPLE_PRODUCTS);
  const [liveCategories, setLiveCategories] = useState<CategoryWithCount[]>([]);
  const [totalProductsCount, setTotalProductsCount] = useState<number>(SAMPLE_PRODUCTS.length);
  const [isLoadingProducts, setIsLoadingProducts] = useState<boolean>(false);
  const [reviewsDrawerProduct, setReviewsDrawerProduct] = useState<Product | null>(null);

  const {
    items: cartItems,
    totalCount: totalCartCount,
    addToCart: addProductToCart,
    updateQuantity: updateCartQuantity,
    setIsCartOpen,
  } = useCart();
  const [activePersonaTab, setActivePersonaTab] = useState<"buyer" | "farmer" | "admin">("buyer");
  const { user, isAuthenticated, openAuthModal, logout } = useAuth();
  const [isUserMenuOpen, setIsUserMenuOpen] = useState<boolean>(false);

  // 1. Fetch live categories with active product counts on mount
  useEffect(() => {
    async function loadCategories() {
      try {
        const res = await fetch("/api/categories");
        if (res.ok) {
          const data = await res.json();
          if (data.success && Array.isArray(data.categories)) {
            setLiveCategories(data.categories);
            if (data.total_products) {
              setTotalProductsCount(data.total_products);
            }
          }
        }
      } catch (err) {
        console.warn("Categories API notice:", err);
      }
    }
    loadCategories();
  }, []);

  // 2. Debounce search query input (300ms)
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 300);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  // 3. Fetch live products from /api/products whenever filters or sorting change
  useEffect(() => {
    let cancelled = false;
    async function loadProducts() {
      setIsLoadingProducts(true);
      try {
        const params = new URLSearchParams();
        if (selectedCategory !== 0) params.set("category_id", String(selectedCategory));
        if (selectedUnit !== "all") params.set("unit", selectedUnit);
        if (debouncedSearch.trim()) params.set("search", debouncedSearch.trim());
        if (sortBy !== "newest") params.set("sort", sortBy);

        if (priceFilterRange === "under_5k") {
          params.set("max_price", "5000");
        } else if (priceFilterRange === "5k_to_20k") {
          params.set("min_price", "5000");
          params.set("max_price", "20000");
        } else if (priceFilterRange === "over_20k") {
          params.set("min_price", "20000");
        }

        const res = await fetch(`/api/products?${params.toString()}`);
        if (res.ok) {
          const data = await res.json();
          if (!cancelled && data.success && Array.isArray(data.products)) {
            setProducts(data.products);
          }
        }
      } catch (err) {
        console.warn("Products API fetch notice:", err);
      } finally {
        if (!cancelled) setIsLoadingProducts(false);
      }
    }

    loadProducts();
    return () => {
      cancelled = true;
    };
  }, [selectedCategory, selectedUnit, debouncedSearch, sortBy, priceFilterRange]);

  // Combined categories to ensure UI stability
  const displayCategories = useMemo(() => {
    if (liveCategories.length > 0) return liveCategories;
    return PRODUCE_CATEGORIES.map((c) => ({
      ...c,
      product_count: products.filter((p) => p.categoryId === c.id).length,
    }));
  }, [liveCategories, products]);

  const addToCart = (product: Product) => {
    addProductToCart({
      id: product.id,
      name: product.name,
      price: product.price,
      unit: product.unit,
      stock: product.stock,
      imageUrl: product.imageUrl,
      farmerName: product.farmerName,
      location: product.location,
      categoryId: product.categoryId,
      categoryName: product.categoryName,
    });
  };

  const updateQuantity = (productId: string, delta: number) => {
    updateCartQuantity(productId, delta);
  };

  const [isContactOpen, setIsContactOpen] = useState<boolean>(false);
  const [isCategoriesDropdownOpen, setIsCategoriesDropdownOpen] = useState<boolean>(false);

  return (
    <div className="min-h-screen bg-[#FAF8F2] text-[#0D2E1C] flex flex-col font-sans selection:bg-[#CFE73B] selection:text-[#0D2E1C]">
      {/* HERO SECTION WITH INTEGRATED FLOATING HEADER (MATCHING REFERENCE IMAGE) */}
      <div className="relative bg-[#07170D] text-white">
        {/* Background Image: Aerial Farmland (Zero Gradients, Pure Photography) */}
        <div 
          className="absolute inset-0 bg-cover bg-center bg-no-repeat opacity-45 mix-blend-luminosity"
          style={{ backgroundImage: "url('/images/hero-farmland.jpg')" }}
        />
        {/* Solid Dark Tint Overlay for 100% Crisp Contrast and Zero Gradients */}
        <div className="absolute inset-0 bg-[#07170D]/65" />

        {/* --- FLOATING HERO HEADER (MATCHING EXACT SCREENSHOT) --- */}
        <header className="relative z-30 border-b border-white/10">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-24 flex items-center justify-between gap-4">
            
            {/* LEFT: Official Farm2Door Brand Logo */}
            <a href="#" className="flex items-center group transition-transform hover:scale-[1.02]">
              <img
                src="/images/farm2door-logo.jpg"
                alt="Farm2Door - Where Freshness Finds You..."
                className="h-11 sm:h-12 w-auto object-contain rounded-xl"
              />
            </a>

            {/* CENTER: Navigation Links (Clean White with subtle hover) */}
            <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-white/90">
              <a href="#" className="hover:text-[#CFE73B] transition-colors">
                Home
              </a>
              <a href="#middlemen-problem" className="hover:text-[#CFE73B] transition-colors">
                About
              </a>
              <a href="#catalog" className="hover:text-[#CFE73B] transition-colors">
                Marketplace
              </a>

              {/* Categories with Dropdown Caret ▾ */}
              <div className="relative">
                <button
                  onClick={() => setIsCategoriesDropdownOpen(!isCategoriesDropdownOpen)}
                  className="flex items-center gap-1.5 hover:text-[#CFE73B] transition-colors focus:outline-none"
                >
                  <span>Categories</span>
                  <svg className={`w-3.5 h-3.5 transition-transform ${isCategoriesDropdownOpen ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {/* Categories Dropdown Menu */}
                {isCategoriesDropdownOpen && (
                  <div className="absolute top-full left-0 mt-3 w-56 rounded-2xl bg-[#FFFDF9] text-[#0D2E1C] border border-[#E5DBC7] shadow-xl py-2 z-50">
                    <div className="px-3 py-1.5 text-[10px] font-mono font-bold text-[#6A9B48] uppercase tracking-wider border-b border-[#E5DBC7]">
                      6 Core Categories (PRD)
                    </div>
                    {PRODUCE_CATEGORIES.map((cat) => (
                      <button
                        key={cat.id}
                        onClick={() => {
                          setSelectedCategory(cat.id);
                          setIsCategoriesDropdownOpen(false);
                          const el = document.getElementById("catalog");
                          el?.scrollIntoView({ behavior: "smooth" });
                        }}
                        className="w-full px-4 py-2.5 text-left text-xs font-semibold hover:bg-[#F2ECE0] flex items-center gap-2.5 transition-colors"
                      >
                        <span className="text-base">{cat.icon}</span>
                        <span>{cat.name}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <a href="#how-it-works" className="hover:text-[#CFE73B] transition-colors">
                How It Works
              </a>
              <a href="#direct-pricing" className="hover:text-[#CFE73B] transition-colors">
                Pricing Index
              </a>
            </nav>

            {/* RIGHT: Outline Cart Icon + Auth + Pear Green Pill CTA Button */}
            <div className="flex items-center gap-4 sm:gap-5">
              {/* Minimalist Outline Shopping Bag with Badge */}
              <button
                onClick={() => setIsCartOpen(true)}
                className="relative p-2 text-white hover:text-[#CFE73B] transition-colors focus:outline-none"
                aria-label="Shopping Cart"
              >
                {/* Outline Bag Icon matching the screenshot */}
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/>
                  <line x1="3" y1="6" x2="21" y2="6"/>
                  <path d="M16 10a4 4 0 0 1-8 0"/>
                </svg>
                {/* Floating Round Badge for Cart Count */}
                <span className="absolute -top-0.5 -right-0.5 min-w-4 h-4 px-1 rounded-full bg-[#CFE73B] text-[#0D2E1C] font-black text-[10px] flex items-center justify-center">
                  {totalCartCount}
                </span>
              </button>

              {/* Authentication Status: Sign In or User Pill */}
              {!isAuthenticated ? (
                <button
                  onClick={() => openAuthModal("login")}
                  className="px-3.5 py-1.5 border border-white/25 hover:border-[#CFE73B] text-white hover:text-[#CFE73B] text-xs font-semibold rounded-full transition-all cursor-pointer"
                >
                  Sign In
                </button>
              ) : (
                <div className="relative">
                  <button
                    onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 hover:bg-white/15 border border-white/20 text-white text-xs font-semibold transition-all focus:outline-none cursor-pointer"
                  >
                    <span className="w-6 h-6 rounded-full bg-[#CFE73B] text-[#0D2E1C] font-black text-xs flex items-center justify-center uppercase">
                      {user?.full_name?.charAt(0) || "U"}
                    </span>
                    <span className="hidden sm:inline-block max-w-[100px] truncate">
                      {user?.full_name?.split(" ")[0]}
                    </span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-[#CFE73B]/20 text-[#CFE73B] font-mono capitalize">
                      {user?.role}
                    </span>
                    <svg className="w-3 h-3 text-white/70" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>

                  {isUserMenuOpen && (
                    <div className="absolute right-0 top-full mt-2 w-56 rounded-2xl bg-[#FFFDF9] text-[#0D2E1C] border border-[#E5DBC7] shadow-xl py-2 z-50">
                      <div className="px-4 py-2 border-b border-[#E5DBC7]">
                        <p className="text-xs font-bold text-[#0D2E1C] truncate">{user?.full_name}</p>
                        <p className="text-[11px] text-[#4F6A52] truncate">{user?.email}</p>
                        {user?.farm_name && (
                          <p className="text-[10px] text-[#6A9B48] font-semibold mt-0.5">🌱 {user.farm_name}</p>
                        )}
                      </div>
                      {user?.role === "farmer" && (
                        <a
                          href="/dashboard/farmer"
                          className="block px-4 py-2 text-xs font-semibold hover:bg-[#F2ECE0] text-[#0D2E1C]"
                        >
                          🚜 Farmer Dashboard
                        </a>
                      )}
                      <Link
                        href="/orders"
                        className="block px-4 py-2 text-xs font-semibold hover:bg-[#F2ECE0] text-[#0D2E1C]"
                        onClick={() => setIsUserMenuOpen(false)}
                      >
                        📦 My Orders & Deliveries
                      </Link>
                      <Link
                        href="/dashboard/admin"
                        className="block px-4 py-2 text-xs font-semibold hover:bg-[#F2ECE0] text-[#0D2E1C]"
                        onClick={() => setIsUserMenuOpen(false)}
                      >
                        🏛️ Platform Admin & Escrow
                      </Link>
                      <Link
                        href="/profile"
                        className="block px-4 py-2 text-xs font-semibold hover:bg-[#F2ECE0] text-[#0D2E1C]"
                        onClick={() => setIsUserMenuOpen(false)}
                      >
                        ⚙️ Profile & Settings
                      </Link>
                      <button
                        onClick={() => {
                          logout();
                          setIsUserMenuOpen(false);
                        }}
                        className="w-full text-left px-4 py-2 text-xs font-semibold text-red-700 hover:bg-red-50 border-t border-[#E5DBC7] mt-1 cursor-pointer"
                      >
                        Sign Out
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Exact Pill Button: Pear Green (#CFE73B) with Dark Text and Arrow */}
              <button
                onClick={() => setIsContactOpen(true)}
                className="px-6 py-2.5 bg-[#CFE73B] hover:bg-[#BBD428] text-[#0D2E1C] font-bold text-sm rounded-full transition-all flex items-center gap-2 shadow-sm hover:shadow"
              >
                <span>Contact</span>
                <span className="text-base leading-none">→</span>
              </button>
            </div>
          </div>
        </header>

        {/* --- HERO CONTENT SECTION --- */}
        <div className="relative z-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 pb-28 text-center">
          <div className="max-w-4xl mx-auto space-y-6">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#0D2E1C]/90 border border-[#134229] text-[#CFE73B] text-xs font-bold tracking-wide uppercase shadow-sm">
              <span>🌾 Bypassing Middlemen Across Ekiti State</span>
              <span className="text-white/40">•</span>
              <span className="text-white/90">Farm2Door Platform</span>
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-7xl font-black text-white tracking-tight leading-[1.06]">
              Fresh Harvest Direct From Local Farmers To Your Doorstep.
            </h1>

            <p className="text-base sm:text-xl text-white/90 leading-relaxed max-w-3xl mx-auto font-normal">
              Eliminate 3 to 5 layers of predatory market brokers who extract up
              to 70% of margins. Access verified farm-gate prices, real-time stock
              reservation, and secure Paystack settlement in authentic agricultural harvest
              units.
            </p>

            {/* Action Bar: Search & Marketplace CTAs */}
            <div className="pt-3 flex flex-wrap justify-center items-center gap-4">
              <a
                href="#catalog"
                className="px-8 py-4 bg-[#CFE73B] hover:bg-[#BBD428] text-[#0D2E1C] font-black text-sm rounded-full transition-all inline-flex items-center gap-2 shadow-lg hover:shadow-xl hover:scale-105"
              >
                <span>Browse Farm Catalog</span>
                <span className="text-base">↓</span>
              </a>
              <button
                type="button"
                onClick={() => openAuthModal("register", "farmer")}
                className="px-8 py-4 bg-white/10 hover:bg-white/20 text-white font-bold text-sm rounded-full border border-white/25 transition-all inline-flex items-center gap-2 backdrop-blur-sm cursor-pointer"
              >
                <span>Register as a Farmer / Vendor</span>
                <span className="text-base">→</span>
              </button>
            </div>

            {/* Hero Trust Statistics - 4 Pillars */}
            <div className="pt-10 grid grid-cols-2 sm:grid-cols-4 gap-4 sm:gap-6 border-t border-white/15 max-w-3xl mx-auto">
              <div className="bg-[#07170D]/40 backdrop-blur-xs p-4 rounded-2xl border border-white/10">
                <div className="text-3xl sm:text-4xl font-black text-[#CFE73B]">0%</div>
                <div className="text-xs text-white/80 font-semibold mt-1">
                  Middlemen Markup
                </div>
              </div>
              <div className="bg-[#07170D]/40 backdrop-blur-xs p-4 rounded-2xl border border-white/10">
                <div className="text-3xl sm:text-4xl font-black text-[#CFE73B]">40%</div>
                <div className="text-xs text-white/80 font-semibold mt-1">
                  Spoilage Mitigated
                </div>
              </div>
              <div className="bg-[#07170D]/40 backdrop-blur-xs p-4 rounded-2xl border border-white/10">
                <div className="text-3xl sm:text-4xl font-black text-[#CFE73B]">92%</div>
                <div className="text-xs text-white/80 font-semibold mt-1">
                  Direct Farmer Return
                </div>
              </div>
              <div className="bg-[#07170D]/40 backdrop-blur-xs p-4 rounded-2xl border border-white/10">
                <div className="text-3xl sm:text-4xl font-black text-white">100%</div>
                <div className="text-xs text-white/80 font-semibold mt-1">
                  Paystack Protected
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 4. SIX CORE AGRICULTURAL CATEGORIES (PRD REQUIREMENT FR-2.1) */}
      <section className="bg-[#F2ECE0] border-b border-[#E5DBC7] py-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-[#6A9B48]">
                Module 2 — Agricultural Catalog
              </span>
              <h2 className="text-2xl font-black text-[#0D2E1C]">
                Explore By Certified Produce Category
              </h2>
            </div>
            <div className="text-xs font-bold text-[#506155]">
              Select a category to filter live marketplace inventory
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
            {/* All Produce Button */}
            <button
              onClick={() => setSelectedCategory(0)}
              className={`p-4 rounded-2xl border text-left transition-all flex flex-col justify-between h-28 cursor-pointer ${
                selectedCategory === 0
                  ? "bg-[#0D2E1C] text-[#CFE73B] border-[#0D2E1C] shadow-sm"
                  : "bg-[#FFFDF9] text-[#0D2E1C] border-[#E5DBC7] hover:border-[#6A9B48]"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-2xl">🧺</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#E5DBC7]/60 text-[#0D2E1C] font-mono font-bold">
                  {totalProductsCount} items
                </span>
              </div>
              <div>
                <div className="text-[10px] font-mono opacity-70">ALL PRODUCE</div>
                <div className="font-bold text-sm leading-tight mt-0.5">
                  All Harvests
                </div>
              </div>
            </button>

            {displayCategories.map((cat) => {
              const isSelected = selectedCategory === cat.id;
              return (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`p-4 rounded-2xl border text-left transition-all flex flex-col justify-between h-28 cursor-pointer ${
                    isSelected
                      ? "bg-[#0D2E1C] text-[#CFE73B] border-[#0D2E1C] shadow-sm"
                      : "bg-[#FFFDF9] text-[#0D2E1C] border-[#E5DBC7] hover:border-[#6A9B48]"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-2xl">{cat.icon}</span>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-mono font-bold ${
                      isSelected
                        ? "bg-[#CFE73B]/20 text-[#CFE73B]"
                        : "bg-[#E5DBC7]/60 text-[#4F6A52]"
                    }`}>
                      {cat.product_count}
                    </span>
                  </div>
                  <div>
                    <div className="text-[10px] font-mono opacity-70">
                      CAT 0{cat.id}
                    </div>
                    <div className="font-bold text-sm leading-tight mt-0.5">
                      {cat.name}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </section>

      {/* 5. HARVEST PACKAGING UNITS FILTER BAR (PRD REQUIREMENT FR-2.2) */}
      <section className="bg-[#FAF8F2] border-b border-[#E5DBC7] py-4">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-xs font-bold text-[#0D2E1C]">
            <span className="text-[#6A9B48]">⚖️ Packaging Units:</span>
            <span className="text-[#506155] hidden sm:inline">
              Filter by harvest metric
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setSelectedUnit("all")}
              className={`px-3 py-1.5 rounded-full text-xs font-bold border transition-colors ${
                selectedUnit === "all"
                  ? "bg-[#0D2E1C] text-[#CFE73B] border-[#0D2E1C]"
                  : "bg-[#FFFDF9] text-[#506155] border-[#E5DBC7] hover:border-[#0D2E1C]"
              }`}
            >
              All Units
            </button>
            {AGRICULTURAL_UNITS.map((unit) => (
              <button
                key={unit.id}
                onClick={() => setSelectedUnit(unit.id)}
                className={`px-3 py-1.5 rounded-full text-xs font-bold border transition-colors flex items-center gap-1.5 ${
                  selectedUnit === unit.id
                    ? "bg-[#0D2E1C] text-[#CFE73B] border-[#0D2E1C]"
                    : "bg-[#FFFDF9] text-[#506155] border-[#E5DBC7] hover:border-[#0D2E1C]"
                }`}
              >
                <span>{unit.icon}</span>
                <span>per {unit.name}</span>
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* 6. LIVE PRODUCE MARKETPLACE (PRD MODULE 2 & 3) */}
      <section id="catalog" className="py-14 bg-[#FAF8F2] flex-1">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Section Header */}
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-[#6A9B48]">
                Direct Farm-Gate Listings
              </span>
              <h2 className="text-3xl font-black text-[#0D2E1C] tracking-tight">
                Available Fresh Produce
              </h2>
              <p className="text-sm text-[#506155] mt-1">
                Showing {products.length} verified listings with atomic stock protection.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <span className="text-xs font-bold bg-[#FFFDF9] text-[#0D2E1C] px-3 py-2 rounded-xl border border-[#E5DBC7]">
                ⚡ Concurrency Locked (ACID)
              </span>
            </div>
          </div>

          {/* Interactive Agricultural Search & Filter Toolbar */}
          <div className="bg-[#FFFDF9] border border-[#E5DBC7] rounded-2xl p-4 sm:p-5 mb-8 shadow-xs">
            <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4">
              {/* Real-time Keyword Search */}
              <div className="relative flex-1">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#6A9B48]">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search produce (e.g. Yam, Rodo, Ofada), farmer, or Ekiti community..."
                  className="w-full pl-10 pr-10 py-2.5 bg-[#FAF8F2] border border-[#E5DBC7] rounded-xl text-xs sm:text-sm text-[#0D2E1C] placeholder-[#8A9C8E] focus:outline-none focus:border-[#0D2E1C] focus:bg-white transition-all"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery("")}
                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-[#8A9C8E] hover:text-[#0D2E1C] text-xs font-bold cursor-pointer"
                    title="Clear search"
                  >
                    ✕
                  </button>
                )}
              </div>

              {/* Price Range Filter Pills */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 lg:pb-0">
                <span className="text-[11px] font-bold text-[#4F6A52] uppercase tracking-wider shrink-0 mr-1">Price:</span>
                {[
                  { id: "all", label: "All" },
                  { id: "under_5k", label: "< ₦5k" },
                  { id: "5k_to_20k", label: "₦5k - ₦20k" },
                  { id: "over_20k", label: "> ₦20k" },
                ].map((p) => (
                  <button
                    key={p.id}
                    onClick={() => setPriceFilterRange(p.id)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all shrink-0 cursor-pointer ${
                      priceFilterRange === p.id
                        ? "bg-[#0D2E1C] text-[#FAF8F2]"
                        : "bg-[#FAF8F2] text-[#4F6A52] hover:bg-[#E5DBC7]/50"
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>

              {/* Sort Dropdown */}
              <div className="flex items-center gap-2 shrink-0">
                <span className="text-[11px] font-bold text-[#4F6A52] uppercase tracking-wider">Sort:</span>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="px-3 py-2 bg-[#FAF8F2] border border-[#E5DBC7] rounded-xl text-xs font-semibold text-[#0D2E1C] focus:outline-none focus:border-[#0D2E1C] cursor-pointer"
                >
                  <option value="newest">🕒 Newest Harvest</option>
                  <option value="price_asc">📉 Price: Low to High</option>
                  <option value="price_desc">📈 Price: High to Low</option>
                  <option value="stock">📦 Most In-Stock</option>
                </select>
              </div>
            </div>

            {/* Active Filters Row */}
            {(selectedCategory !== 0 || selectedUnit !== "all" || searchQuery || priceFilterRange !== "all") && (
              <div className="mt-3 pt-3 border-t border-[#E5DBC7] flex flex-wrap items-center gap-2 text-xs">
                <span className="text-[11px] font-bold text-[#4F6A52]">Active Filters:</span>
                {selectedCategory !== 0 && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-[#FAF8F2] border border-[#E5DBC7] text-[#0D2E1C] text-[11px] font-semibold">
                    Category: {displayCategories.find((c) => c.id === selectedCategory)?.name || selectedCategory}
                    <button onClick={() => setSelectedCategory(0)} className="hover:text-red-600 font-bold ml-1 cursor-pointer">✕</button>
                  </span>
                )}
                {selectedUnit !== "all" && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-[#FAF8F2] border border-[#E5DBC7] text-[#0D2E1C] text-[11px] font-semibold">
                    Unit: {selectedUnit}
                    <button onClick={() => setSelectedUnit("all")} className="hover:text-red-600 font-bold ml-1 cursor-pointer">✕</button>
                  </span>
                )}
                {searchQuery && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-[#FAF8F2] border border-[#E5DBC7] text-[#0D2E1C] text-[11px] font-semibold">
                    &ldquo;{searchQuery}&rdquo;
                    <button onClick={() => setSearchQuery("")} className="hover:text-red-600 font-bold ml-1 cursor-pointer">✕</button>
                  </span>
                )}
                {priceFilterRange !== "all" && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-[#FAF8F2] border border-[#E5DBC7] text-[#0D2E1C] text-[11px] font-semibold">
                    {priceFilterRange === "under_5k" ? "Under ₦5,000" : priceFilterRange === "5k_to_20k" ? "₦5k - ₦20k" : "Above ₦20,000"}
                    <button onClick={() => setPriceFilterRange("all")} className="hover:text-red-600 font-bold ml-1 cursor-pointer">✕</button>
                  </span>
                )}
                <button
                  onClick={() => {
                    setSelectedCategory(0);
                    setSelectedUnit("all");
                    setSearchQuery("");
                    setPriceFilterRange("all");
                    setSortBy("newest");
                  }}
                  className="text-[11px] font-bold text-red-700 hover:underline ml-auto cursor-pointer"
                >
                  Clear All Filters
                </button>
              </div>
            )}
          </div>

          {/* Product Cards Grid with Loading Skeletons */}
          {isLoadingProducts ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => (
                <div key={n} className="bg-[#FFFDF9] border border-[#E5DBC7] rounded-3xl p-5 animate-pulse">
                  <div className="h-44 rounded-2xl bg-[#E5DBC7]/40 mb-4" />
                  <div className="h-3 w-24 bg-[#E5DBC7]/60 rounded mb-2" />
                  <div className="h-5 w-3/4 bg-[#E5DBC7]/60 rounded mb-2" />
                  <div className="h-3 w-full bg-[#E5DBC7]/40 rounded mb-4" />
                  <div className="h-10 bg-[#E5DBC7]/50 rounded-xl" />
                </div>
              ))}
            </div>
          ) : products.length === 0 ? (
            <div className="p-12 text-center bg-[#FFFDF9] border border-[#E5DBC7] rounded-3xl">
              <div className="text-4xl mb-3">🌾</div>
              <h3 className="text-lg font-bold text-[#0D2E1C]">
                No produce found matching your criteria
              </h3>
              <p className="text-xs text-[#506155] mt-1 max-w-md mx-auto">
                Try clearing your search query or selecting a different agricultural
                category or harvest unit.
              </p>
              <button
                onClick={() => {
                  setSelectedCategory(0);
                  setSelectedUnit("all");
                  setSearchQuery("");
                  setPriceFilterRange("all");
                  setSortBy("newest");
                }}
                className="mt-4 px-5 py-2.5 bg-[#0D2E1C] text-[#CFE73B] text-xs font-bold rounded-full cursor-pointer"
              >
                Reset All Filters
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {products.map((product) => {
                const inCart = cartItems.find(
                  (item) => item.productId === product.id
                );
                const isOutOfStock = product.stock === 0;

                return (
                  <div
                    key={product.id}
                    className="bg-[#FFFDF9] border border-[#E5DBC7] rounded-3xl p-5 flex flex-col justify-between hover:border-[#6A9B48] transition-colors"
                  >
                    <div>
                      {/* Real Produce Photography Showcase */}
                      <div className="h-44 rounded-2xl bg-[#FAF8F2] border border-[#E5DBC7] overflow-hidden relative mb-4 group/img">
                        <img
                          src={product.imageUrl}
                          alt={product.name}
                          className="w-full h-full object-cover group-hover/img:scale-105 transition-transform duration-500"
                          loading="lazy"
                        />
                        {/* Overlay Badges */}
                        <div className="absolute top-2.5 left-2.5 right-2.5 flex justify-between items-center">
                          <span className="text-[10px] uppercase font-bold tracking-wider px-2.5 py-1 rounded-md bg-[#0D2E1C]/90 text-[#CFE73B] shadow-sm backdrop-blur-xs">
                            {product.categoryName}
                          </span>
                          {product.badge && (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-[#CFE73B] text-[#0D2E1C] shadow-sm">
                              {product.badge}
                            </span>
                          )}
                        </div>
                        {/* Bottom Provenance & Rating Pill */}
                        <div className="absolute bottom-2 left-2 right-2 flex justify-between items-center">
                          <span className="text-[10px] font-bold text-[#0D2E1C] bg-[#FFFDF9]/95 px-2 py-0.5 rounded-md border border-[#E5DBC7] shadow-sm">
                            📍 {product.location}
                          </span>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setReviewsDrawerProduct(product);
                            }}
                            className="text-[10px] font-bold text-[#0D2E1C] bg-[#FFFDF9]/95 hover:bg-[#FAF8F2] px-2 py-0.5 rounded-md border border-[#E5DBC7] shadow-sm flex items-center gap-1 cursor-pointer transition-colors"
                            title="Click to view verified buyer reviews"
                          >
                            <span className="text-[#6A9B48]">★</span> {product.rating} ({product.reviewCount})
                          </button>
                        </div>
                      </div>

                      {/* Titles & Details */}
                      <div className="text-xs font-bold text-[#6A9B48] uppercase tracking-wide">
                        {product.farmerName}
                      </div>
                      <h3 className="text-base font-bold text-[#0D2E1C] mt-0.5 leading-snug">
                        {product.name}
                      </h3>
                      <p className="text-xs text-[#506155] mt-1.5 leading-relaxed line-clamp-2">
                        {product.description}
                      </p>

                      <div className="mt-3 flex items-center justify-between text-[11px] text-[#6E7E74] border-t border-[#E5DBC7] pt-2">
                        <span>🕒 {product.harvestTime}</span>
                        <span
                          className={`font-semibold ${
                            product.stock < 10
                              ? "text-[#B5BA3E] font-bold"
                              : "text-[#506155]"
                          }`}
                        >
                          Stock: {product.stock} {product.unit}s
                        </span>
                      </div>
                    </div>

                    {/* Bottom Pricing & Cart CTA */}
                    <div className="mt-5 pt-3 border-t border-[#E5DBC7] flex items-center justify-between">
                      <div>
                        <div className="text-[10px] text-[#6E7E74] uppercase font-bold">
                          Farm-Gate Price
                        </div>
                        <div className="text-lg font-black text-[#0D2E1C]">
                          ₦{product.price.toLocaleString()}{" "}
                          <span className="text-xs font-semibold text-[#506155]">
                            / {product.unit}
                          </span>
                        </div>
                      </div>

                      {inCart ? (
                        <div className="flex items-center gap-2 bg-[#FAF8F2] border border-[#E5DBC7] rounded-full p-1">
                          <button
                            onClick={() => updateQuantity(product.id, -1)}
                            className="w-7 h-7 rounded-full bg-[#FFFDF9] hover:bg-[#F2ECE0] text-[#0D2E1C] font-black text-xs flex items-center justify-center border border-[#E5DBC7]"
                          >
                            -
                          </button>
                          <span className="text-xs font-black text-[#0D2E1C] px-1">
                            {inCart.quantity}
                          </span>
                          <button
                            onClick={() => updateQuantity(product.id, 1)}
                            disabled={inCart.quantity >= product.stock}
                            className="w-7 h-7 rounded-full bg-[#0D2E1C] hover:bg-[#134229] disabled:opacity-40 text-[#CFE73B] font-black text-xs flex items-center justify-center"
                          >
                            +
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => addToCart(product)}
                          disabled={isOutOfStock}
                          className="px-4 py-2 bg-[#0D2E1C] hover:bg-[#134229] disabled:bg-[#E5DBC7] disabled:text-[#6E7E74] text-[#CFE73B] text-xs font-bold rounded-full transition-colors flex items-center gap-1.5"
                        >
                          <span>+ Add</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* 7. PROBLEM VS SOLUTION / WHY FARMAN2DOOR (PRD SECTION 1.2) */}
      <section id="middlemen-problem" className="bg-[#FFFDF9] border-t border-[#E5DBC7] py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-14">
            <span className="text-xs font-bold uppercase tracking-wider text-[#6A9B48]">
              PRD Executive Problem Statement
            </span>
            <h2 className="text-3xl sm:text-4xl font-black text-[#0D2E1C] tracking-tight mt-1">
              Why Traditional Produce Distribution Fails Nigeria
            </h2>
            <p className="text-sm sm:text-base text-[#506155] mt-3 leading-relaxed">
              Nigeria loses up to 40% of fresh food to delays and exploitative middleman
              rings. Farm2Door creates an open digital pipeline from farm-gate to consumer.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Box 1 */}
            <div className="p-7 rounded-3xl bg-[#FAF8F2] border border-[#E5DBC7] space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-[#0D2E1C] text-[#CFE73B] font-black text-xl flex items-center justify-center">
                01
              </div>
              <h3 className="text-lg font-bold text-[#0D2E1C]">
                Middlemen Monopolies Broken
              </h3>
              <p className="text-xs text-[#506155] leading-relaxed">
                Traditional aggregators take 50% to 70% of the consumer retail
                price while farmers remain trapped in subsistence. Farm2Door connects
                farmers directly with buyers to guarantee fair payouts.
              </p>
              <div className="text-xs font-bold text-[#6A9B48] pt-2">
                ✓ Guaranteed direct farmer payouts
              </div>
            </div>

            {/* Box 2 */}
            <div className="p-7 rounded-3xl bg-[#FAF8F2] border border-[#E5DBC7] space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-[#6A9B48] text-[#FAF8F2] font-black text-xl flex items-center justify-center">
                02
              </div>
              <h3 className="text-lg font-bold text-[#0D2E1C]">
                40% Post-Harvest Loss Mitigated
              </h3>
              <p className="text-xs text-[#506155] leading-relaxed">
                Perishable crops like tomatoes, rodo, and leafy vegetables rot due
                to days spent negotiating price in physical markets. Listings on
                Farm2Door sell within hours of morning harvest.
              </p>
              <div className="text-xs font-bold text-[#6A9B48] pt-2">
                ✓ Rapid digital turnover
              </div>
            </div>

            {/* Box 3 */}
            <div className="p-7 rounded-3xl bg-[#FAF8F2] border border-[#E5DBC7] space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-[#B5BA3E] text-[#0D2E1C] font-black text-xl flex items-center justify-center">
                03
              </div>
              <h3 className="text-lg font-bold text-[#0D2E1C]">
                Agriculture-Specific Metrics
              </h3>
              <p className="text-xs text-[#506155] leading-relaxed">
                Generic e-commerce platforms do not understand baskets of rodo,
                bundles of ugwu, or tubers of new yam. Farm2Door enforces native
                Nigerian harvest units with ACID concurrency locks.
              </p>
              <div className="text-xs font-bold text-[#6A9B48] pt-2">
                ✓ Native units & zero overselling
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 8. HOW IT WORKS (3-TIER SYSTEM: BUYERS, FARMERS, ADMIN) */}
      <section id="how-it-works" className="bg-[#F2ECE0] border-t border-[#E5DBC7] py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-10">
            <span className="text-xs font-bold uppercase tracking-wider text-[#6A9B48]">
              Three-Tier Architecture
            </span>
            <h2 className="text-3xl font-black text-[#0D2E1C] tracking-tight mt-1">
              How Farm2Door Operates
            </h2>
            <div className="mt-4 flex justify-center gap-2">
              <button
                onClick={() => setActivePersonaTab("buyer")}
                className={`px-4 py-2 rounded-full text-xs font-bold border transition-colors ${
                  activePersonaTab === "buyer"
                    ? "bg-[#0D2E1C] text-[#CFE73B] border-[#0D2E1C]"
                    : "bg-[#FFFDF9] text-[#506155] border-[#E5DBC7]"
                }`}
              >
                For Buyers (Households & Restaurants)
              </button>
              <button
                onClick={() => setActivePersonaTab("farmer")}
                className={`px-4 py-2 rounded-full text-xs font-bold border transition-colors ${
                  activePersonaTab === "farmer"
                    ? "bg-[#0D2E1C] text-[#CFE73B] border-[#0D2E1C]"
                    : "bg-[#FFFDF9] text-[#506155] border-[#E5DBC7]"
                }`}
              >
                For Farmers & Vendors
              </button>
              <button
                onClick={() => setActivePersonaTab("admin")}
                className={`px-4 py-2 rounded-full text-xs font-bold border transition-colors ${
                  activePersonaTab === "admin"
                    ? "bg-[#0D2E1C] text-[#CFE73B] border-[#0D2E1C]"
                    : "bg-[#FFFDF9] text-[#506155] border-[#E5DBC7]"
                }`}
              >
                For Administrators
              </button>
            </div>
          </div>

          {/* Dynamic 3-Step Container */}
          <div className="bg-[#FFFDF9] border border-[#E5DBC7] rounded-3xl p-8 sm:p-12">
            {activePersonaTab === "buyer" && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <div className="space-y-3">
                  <div className="text-xs font-mono font-bold text-[#6A9B48]">
                    STEP 01
                  </div>
                  <h3 className="text-lg font-bold text-[#0D2E1C]">
                    Browse & Add Harvest
                  </h3>
                  <p className="text-xs text-[#506155] leading-relaxed">
                    Filter across Tubers, Vegetables, Fruits, Grains, Beans, and Peppers
                    with authentic packaging units (`tuber`, `basket`, `crate`, `bag`).
                  </p>
                </div>
                <div className="space-y-3">
                  <div className="text-xs font-mono font-bold text-[#6A9B48]">
                    STEP 02
                  </div>
                  <h3 className="text-lg font-bold text-[#0D2E1C]">
                    Paystack Direct Escrow
                  </h3>
                  <p className="text-xs text-[#506155] leading-relaxed">
                    Checkout with Debit Card, USSD, or Bank Transfer. Stock is
                    concurrency-locked in MySQL (`FOR UPDATE`) to eliminate out-of-stock
                    disputes.
                  </p>
                </div>
                <div className="space-y-3">
                  <div className="text-xs font-mono font-bold text-[#6A9B48]">
                    STEP 03
                  </div>
                  <h3 className="text-lg font-bold text-[#0D2E1C]">
                    Farm-Gate Transit & Review
                  </h3>
                  <p className="text-xs text-[#506155] leading-relaxed">
                    Receive fresh harvest at your doorstep or agreed transit hub. Rate
                    the farmer with verified reviews to maintain platform integrity.
                  </p>
                </div>
              </div>
            )}

            {activePersonaTab === "farmer" && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <div className="space-y-3">
                  <div className="text-xs font-mono font-bold text-[#6A9B48]">
                    STEP 01
                  </div>
                  <h3 className="text-lg font-bold text-[#0D2E1C]">
                    List Daily Harvest
                  </h3>
                  <p className="text-xs text-[#506155] leading-relaxed">
                    Set your farm-gate price, select your local unit (`basket`, `bundle`,
                    `crate`, `bag`), and state your harvest date right from your mobile phone.
                  </p>
                </div>
                <div className="space-y-3">
                  <div className="text-xs font-mono font-bold text-[#6A9B48]">
                    STEP 02
                  </div>
                  <h3 className="text-lg font-bold text-[#0D2E1C]">
                    Inbound Order Notification
                  </h3>
                  <p className="text-xs text-[#506155] leading-relaxed">
                    Receive immediate notifications when buyers place paid orders. Stock
                    decrements automatically without manual spreadsheets.
                  </p>
                </div>
                <div className="space-y-3">
                  <div className="text-xs font-mono font-bold text-[#6A9B48]">
                    STEP 03
                  </div>
                  <h3 className="text-lg font-bold text-[#0D2E1C]">
                    Automated Digital Payout
                  </h3>
                  <p className="text-xs text-[#506155] leading-relaxed">
                    Earnings are credited directly to your Nigerian bank account without
                    paying arbitrary broker fees or delayed wholesaler credit.
                  </p>
                </div>
              </div>
            )}

            {activePersonaTab === "admin" && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <div className="space-y-3">
                  <div className="text-xs font-mono font-bold text-[#6A9B48]">
                    STEP 01
                  </div>
                  <h3 className="text-lg font-bold text-[#0D2E1C]">
                    Farmer Credential Verification
                  </h3>
                  <p className="text-xs text-[#506155] leading-relaxed">
                    Review and verify farmer identities, farm locations in Ekiti State,
                    and agricultural credentials to maintain genuine farm-gate origin.
                  </p>
                </div>
                <div className="space-y-3">
                  <div className="text-xs font-mono font-bold text-[#6A9B48]">
                    STEP 02
                  </div>
                  <h3 className="text-lg font-bold text-[#0D2E1C]">
                    Escrow & Concurrency Audit
                  </h3>
                  <p className="text-xs text-[#506155] leading-relaxed">
                    Audit Paystack transaction webhooks, inspect automated ledger
                    settlement, and resolve delivery or quality disputes impartially.
                  </p>
                </div>
                <div className="space-y-3">
                  <div className="text-xs font-mono font-bold text-[#6A9B48]">
                    STEP 03
                  </div>
                  <h3 className="text-lg font-bold text-[#0D2E1C]">
                    Market Health Metrics
                  </h3>
                  <p className="text-xs text-[#506155] leading-relaxed">
                    Track price parity, regional harvest volumes, and consumer demand
                    patterns to empower Ekiti State agrarian development.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* 8.5. PRICE TRANSPARENCY INDEX: FARM-GATE VS RETAIL MIDDLEMEN BREAKDOWN (PRD SECTION 1.2) */}
      <section id="direct-pricing" className="bg-[#FAF8F2] border-t border-[#E5DBC7] py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-14">
            <span className="text-xs font-bold uppercase tracking-wider text-[#6A9B48]">
              PRD Requirement 1.2 — Price Transparency Index
            </span>
            <h2 className="text-3xl sm:text-4xl font-black text-[#0D2E1C] tracking-tight mt-1">
              Farm-Gate vs Retail Middlemen Breakdown
            </h2>
            <p className="text-sm sm:text-base text-[#506155] mt-3 leading-relaxed">
              By removing 3 to 5 layers of predatory brokers, Farm2Door guarantees smallholder
              farmers a 92% take-home return while giving households and food businesses up to 35% discount.
            </p>
          </div>

          {/* Side by Side Comparative Breakdown */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch mb-12">
            {/* Traditional Market Flow */}
            <div className="lg:col-span-6 bg-[#FFFDF9] border-2 border-[#E5DBC7] rounded-3xl p-6 sm:p-8 flex flex-col justify-between shadow-sm">
              <div className="space-y-4">
                <div className="flex justify-between items-center border-b border-[#E5DBC7] pb-4">
                  <div>
                    <span className="text-xs uppercase font-bold text-[#8A3B31]">Traditional Intermediary Model</span>
                    <h3 className="text-xl font-black text-[#0D2E1C]">Exploitative Middlemen Monopoly</h3>
                  </div>
                  <span className="px-3 py-1 rounded-full bg-[#FAF8F2] text-[#8A3B31] border border-[#E5DBC7] font-bold text-xs">
                    3-5 Broker Layers
                  </span>
                </div>

                <div className="p-4 bg-[#FAF8F2] rounded-2xl border border-[#E5DBC7]">
                  <div className="flex justify-between text-xs font-bold text-[#8A3B31]">
                    <span>Consumer Retail Outlay</span>
                    <span className="text-base font-black">₦6,500 / basket</span>
                  </div>
                  <div className="w-full bg-[#E5DBC7] h-3 rounded-full mt-2.5 overflow-hidden flex">
                    <div className="bg-[#8A3B31] w-[35%]" title="Farmer Share (35%)"></div>
                    <div className="bg-[#D3C5AA] w-[65%]" title="Middlemen Spread (65%)"></div>
                  </div>
                  <div className="flex justify-between text-xs text-[#506155] mt-2 font-medium">
                    <span className="text-[#8A3B31] font-bold">Farmer receives: ₦2,200 (35%)</span>
                    <span className="font-bold text-[#8A3B31]">Brokers extract: ₦4,300 (65%)</span>
                  </div>
                </div>

                <ul className="space-y-2.5 text-xs text-[#506155] pt-2">
                  <li className="flex items-start gap-2">
                    <span className="text-[#8A3B31] font-bold">✕</span>
                    <span><strong>40% Produce Decay:</strong> Days spent haggling with aggregators leads to rotten tomatoes, pepper, and tubers.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-[#8A3B31] font-bold">✕</span>
                    <span><strong>Delayed Credit Payouts:</strong> Wholesalers take produce on credit with weeks of delayed settlement.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-[#8A3B31] font-bold">✕</span>
                    <span><strong>Zero Farm Accountability:</strong> Buyers pay inflated prices with unknown provenance and hidden markups.</span>
                  </li>
                </ul>
              </div>

              <div className="mt-6 p-3.5 rounded-xl bg-[#FAF8F2] border border-[#E5DBC7] text-xs font-semibold text-[#8A3B31] text-center">
                Middlemen Margin Loss: -65% Farm-Gate Value
              </div>
            </div>

            {/* Farm2Door Direct Flow */}
            <div className="lg:col-span-6 bg-[#0D2E1C] text-[#FAF8F2] border-2 border-[#134229] rounded-3xl p-6 sm:p-8 flex flex-col justify-between shadow-xl">
              <div className="space-y-4">
                <div className="flex justify-between items-center border-b border-[#134229] pb-4">
                  <div>
                    <span className="text-xs uppercase font-bold text-[#CFE73B]">Farm2Door Direct Pipeline</span>
                    <h3 className="text-xl font-black text-[#FAF8F2]">Zero Middlemen Disintermediation</h3>
                  </div>
                  <span className="px-3 py-1 rounded-full bg-[#134229] text-[#CFE73B] border border-[#25784B] font-bold text-xs">
                    Ekiti Farm-Gate
                  </span>
                </div>

                <div className="p-4 bg-[#134229] rounded-2xl border border-[#25784B]">
                  <div className="flex justify-between text-xs font-bold">
                    <span className="text-[#CFE73B]">Fair Direct Checkout</span>
                    <span className="text-base font-black text-[#CFE73B]">₦4,200 / basket</span>
                  </div>
                  <div className="w-full bg-[#0D2E1C] h-3 rounded-full mt-2.5 overflow-hidden flex border border-[#134229]">
                    <div className="bg-[#CFE73B] w-[92%]" title="Farmer Take-home (92%)"></div>
                    <div className="bg-[#6A9B48] w-[8%]" title="Platform Fee (8%)"></div>
                  </div>
                  <div className="flex justify-between text-xs text-[#FAF8F2]/90 mt-2 font-medium">
                    <span className="text-[#CFE73B] font-bold">Farmer receives: ₦3,850 (92%)</span>
                    <span className="text-white/80">Buyer saves: ₦2,300 (35%)</span>
                  </div>
                </div>

                <ul className="space-y-2.5 text-xs text-[#FAF8F2]/85 pt-2">
                  <li className="flex items-start gap-2">
                    <span className="text-[#CFE73B] font-bold">✓</span>
                    <span><strong>+75% Higher Farmer Revenue:</strong> Smallholders earn ₦3,850 instead of ₦2,200 per basket of peppers.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-[#CFE73B] font-bold">✓</span>
                    <span><strong>Rapid 24-Hr Morning Turnover:</strong> Produce is listed and purchased the morning of harvest, minimizing spoilage.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-[#CFE73B] font-bold">✓</span>
                    <span><strong>Guaranteed Digital Paystack Payout:</strong> Direct automated bank account transfers upon order delivery.</span>
                  </li>
                </ul>
              </div>

              <div className="mt-6 p-3.5 rounded-xl bg-[#134229] border border-[#25784B] text-xs font-bold text-[#CFE73B] text-center">
                Net Farmer Benefit: +75% Guaranteed Cash Return
              </div>
            </div>
          </div>

          {/* Regional Commodity Comparison Table */}
          <div className="bg-[#FFFDF9] border border-[#E5DBC7] rounded-3xl p-6 sm:p-8 overflow-x-auto shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-6">
              <div>
                <h4 className="text-lg font-bold text-[#0D2E1C]">Regional Harvest Price Parity Matrix (Ekiti State)</h4>
                <p className="text-xs text-[#506155]">Benchmark data tracked across Ikere, Ado, and Oye rural farm clusters.</p>
              </div>
              <span className="text-xs font-mono font-bold text-[#6A9B48] bg-[#F2ECE0] px-3 py-1.5 rounded-full border border-[#E5DBC7]">
                Live Index Benchmark
              </span>
            </div>

            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-[#E5DBC7] text-[#506155] uppercase font-mono text-[11px]">
                  <th className="pb-3 font-bold">Produce Item</th>
                  <th className="pb-3 font-bold">Packaging Unit</th>
                  <th className="pb-3 font-bold text-[#8A3B31]">Traditional Retail Broker</th>
                  <th className="pb-3 font-bold text-[#0D2E1C]">Farm2Door Gate Price</th>
                  <th className="pb-3 font-bold text-[#6A9B48]">Farmer Payout (+Gain)</th>
                  <th className="pb-3 font-bold text-right">Consumer Savings</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5DBC7]">
                <tr>
                  <td className="py-3.5 font-bold text-[#0D2E1C] flex items-center gap-2">
                    <span>🥔</span> Ekiti New White Yam
                  </td>
                  <td className="py-3.5 text-[#506155]">per Tuber</td>
                  <td className="py-3.5 text-[#8A3B31] font-semibold">₦5,200 (Farmer got ₦2,000)</td>
                  <td className="py-3.5 font-bold text-[#0D2E1C]">₦3,500</td>
                  <td className="py-3.5 font-bold text-[#6A9B48]">₦3,220 (+61%)</td>
                  <td className="py-3.5 font-bold text-right text-[#0D2E1C]">Save ₦1,700 (-33%)</td>
                </tr>
                <tr>
                  <td className="py-3.5 font-bold text-[#0D2E1C] flex items-center gap-2">
                    <span>🌶️</span> Fresh Scotch Bonnet (Rodo)
                  </td>
                  <td className="py-3.5 text-[#506155]">per Basket</td>
                  <td className="py-3.5 text-[#8A3B31] font-semibold">₦8,500 (Farmer got ₦3,000)</td>
                  <td className="py-3.5 font-bold text-[#0D2E1C]">₦5,800</td>
                  <td className="py-3.5 font-bold text-[#6A9B48]">₦5,336 (+78%)</td>
                  <td className="py-3.5 font-bold text-right text-[#0D2E1C]">Save ₦2,700 (-32%)</td>
                </tr>
                <tr>
                  <td className="py-3.5 font-bold text-[#0D2E1C] flex items-center gap-2">
                    <span>🌾</span> Stone-Free Igbemo Ofada Rice
                  </td>
                  <td className="py-3.5 text-[#506155]">per 50kg Bag</td>
                  <td className="py-3.5 text-[#8A3B31] font-semibold">₦68,000 (Miller got ₦38,000)</td>
                  <td className="py-3.5 font-bold text-[#0D2E1C]">₦48,000</td>
                  <td className="py-3.5 font-bold text-[#6A9B48]">₦44,160 (+16%)</td>
                  <td className="py-3.5 font-bold text-right text-[#0D2E1C]">Save ₦20,000 (-29%)</td>
                </tr>
                <tr>
                  <td className="py-3.5 font-bold text-[#0D2E1C] flex items-center gap-2">
                    <span>🥬</span> Tender Fluted Pumpkin (Ugwu)
                  </td>
                  <td className="py-3.5 text-[#506155]">per Bundle</td>
                  <td className="py-3.5 text-[#8A3B31] font-semibold">₦800 (Farmer got ₦200)</td>
                  <td className="py-3.5 font-bold text-[#0D2E1C]">₦450</td>
                  <td className="py-3.5 font-bold text-[#6A9B48]">₦414 (+107%)</td>
                  <td className="py-3.5 font-bold text-right text-[#0D2E1C]">Save ₦350 (-44%)</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* 9. FARMER ONBOARDING CALL TO ACTION BANNER (PRD FR-1.1) */}
      <section id="sell" className="bg-[#0D2E1C] text-[#FAF8F2] py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            <div className="lg:col-span-8 space-y-4">
              <span className="text-xs font-bold text-[#CFE73B] tracking-wider uppercase">
                Farmer Onboarding Program
              </span>
              <h2 className="text-3xl sm:text-4xl font-black text-[#FAF8F2] tracking-tight">
                Are You A Farmer in Ekiti State or Surrounding Regions?
              </h2>
              <p className="text-sm sm:text-base text-[#FAF8F2]/80 leading-relaxed max-w-2xl">
                Sell your yam, cassava, pepper, vegetables, and grains directly to
                thousands of verified households, restaurants, and retailers. Zero
                middlemen commission on your first 3 months.
              </p>
              <div className="flex flex-wrap gap-4 text-xs font-semibold text-[#CFE73B] pt-2">
                <span>✓ Direct Bank Settlement</span>
                <span>•</span>
                <span>✓ Free Produce Photography & Listing</span>
                <span>•</span>
                <span>✓ Concurrency Stock Lock</span>
              </div>
            </div>

            <div className="lg:col-span-4 flex flex-col sm:flex-row lg:flex-col gap-3">
              <button
                onClick={() => alert("Farmer registration form will connect to /api/auth/register with role='farmer'.")}
                className="px-6 py-3.5 bg-[#CFE73B] hover:bg-[#BBD428] text-[#0D2E1C] font-black text-sm rounded-full transition-colors text-center"
              >
                Register as a Local Farmer
              </button>
              <a
                href="#catalog"
                className="px-6 py-3.5 bg-[#134229] hover:bg-[#1B5A38] text-[#FAF8F2] font-bold text-sm rounded-full transition-colors text-center border border-[#25784B]"
              >
                Explore Current Prices
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* 10. PROFESSIONAL FOOTER */}
      <footer className="bg-[#06170D] text-[#FAF8F2] border-t border-[#134229] pt-14 pb-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-8 pb-12 border-b border-[#134229]">
            {/* Col 1 & 2: Brand & Mission */}
            <div className="lg:col-span-2 space-y-4">
              <div className="flex items-center">
                <img
                  src="/images/farm2door-logo.jpg"
                  alt="Farm2Door - Where Freshness Finds You..."
                  className="h-12 w-auto object-contain rounded-xl"
                />
              </div>
              <p className="text-xs text-[#FAF8F2]/70 leading-relaxed max-w-sm">
                Farm2Door — Modern agricultural e-commerce marketplace linking
                smallholder farmers directly with households, catering services,
                and retail businesses across Ekiti State.
              </p>
              <div className="p-4 rounded-xl bg-[#0D2E1C] border border-[#134229] text-xs text-[#FAF8F2]/80 space-y-1">
                <div className="font-bold text-[#CFE73B]">Ekiti State Agricultural Initiative</div>
                <div>Empowering smallholder farmers across 16 Local Government Areas</div>
                <div>Direct farm-gate disintermediation & same-day cold-chain fulfillment</div>
                <div className="text-[11px] text-[#CFE73B]/80 font-mono pt-1">Ikere-Ekiti • Ado-Ekiti • Igbemo-Ekiti</div>
              </div>
            </div>

            {/* Col 3: Categories */}
            <div className="space-y-3">
              <div className="text-xs font-bold text-[#CFE73B] uppercase tracking-wider">
                Produce Categories
              </div>
              <ul className="space-y-2 text-xs text-[#FAF8F2]/70">
                <li>Tubers & Roots</li>
                <li>Vegetables</li>
                <li>Fruits</li>
                <li>Grains & Cereals</li>
                <li>Legumes & Beans</li>
                <li>Peppers & Spices</li>
              </ul>
            </div>

            {/* Col 4: Native Units */}
            <div className="space-y-3">
              <div className="text-xs font-bold text-[#CFE73B] uppercase tracking-wider">
                Harvest Units
              </div>
              <ul className="space-y-2 text-xs text-[#FAF8F2]/70">
                <li>Tuber (Yam & Cassava)</li>
                <li>Basket (Peppers & Tomatoes)</li>
                <li>Crate (Fruits & Citrus)</li>
                <li>Bundle (Ugwu & Leafy Greens)</li>
                <li>50kg Bag (Grains & Beans)</li>
              </ul>
            </div>

            {/* Col 5: Security & Protocol */}
            <div className="space-y-3">
              <div className="text-xs font-bold text-[#CFE73B] uppercase tracking-wider">
                Security & Integrity
              </div>
              <ul className="space-y-2 text-xs text-[#FAF8F2]/70">
                <li>Paystack Payment Gateway</li>
                <li>JWT Signed Sessions (7 Days)</li>
                <li>Bcrypt Password Hashing</li>
                <li>InnoDB ACID Transactions</li>
                <li>Row-Level Concurrency Locks</li>
              </ul>
            </div>
          </div>

          <div className="pt-8 flex flex-col sm:flex-row justify-between items-center gap-4 text-xs text-[#FAF8F2]/60">
            <div>
              © 2026 Farm2Door. Approved for Implementation.
            </div>
            <div className="flex gap-4">
              <span>Privacy Policy</span>
              <span>•</span>
              <span>Terms of Escrow</span>
              <span>•</span>
              <span>Dispute Resolution</span>
            </div>
          </div>
        </div>
      </footer>



      {/* 13. CONTACT & FARM INQUIRY MODAL (TRIGGERED BY HEADER 'CONTACT →' BUTTON) */}
      {isContactOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            onClick={() => setIsContactOpen(false)}
            className="absolute inset-0 bg-[#07170D]/70 backdrop-blur-xs"
          />

          <div className="relative bg-[#FFFDF9] border-2 border-[#E5DBC7] rounded-3xl max-w-lg w-full p-6 sm:p-8 space-y-6 shadow-2xl">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-[#E5DBC7] pb-4">
              <div className="flex items-center gap-2.5">
                <img
                  src="/images/farm2door-logo.jpg"
                  alt="Farm2Door"
                  className="h-9 w-auto object-contain rounded-lg"
                />
              </div>
              <button
                onClick={() => setIsContactOpen(false)}
                className="w-8 h-8 rounded-full bg-[#FAF8F2] border border-[#E5DBC7] text-[#0D2E1C] font-bold text-xs flex items-center justify-center hover:bg-[#F2ECE0]"
              >
                ✕
              </button>
            </div>

            {/* Modal Info & Form */}
            <div className="space-y-4">
              <div className="p-4 bg-[#FAF8F2] border border-[#E5DBC7] rounded-2xl space-y-2 text-xs">
                <div className="flex items-center gap-2 text-[#0D2E1C] font-bold">
                  <span>📍 Regional Agro Hub:</span>
                  <span>Ikere-Ekiti Commercial Agro Hub, Ekiti State</span>
                </div>
                <div className="flex items-center gap-2 text-[#506155]">
                  <span>📞 Farm Dispatch:</span>
                  <span>+234 (0) 800-FARM2DOOR</span>
                </div>
                <div className="flex items-center gap-2 text-[#506155]">
                  <span>✉️ Official Email:</span>
                  <span>support@farm2door.ng</span>
                </div>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-bold text-[#0D2E1C] uppercase tracking-wider mb-1">
                    Your Full Name / Business
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Adeola Bello (Bello Food Kitchen)"
                    className="w-full px-4 py-2.5 bg-[#FAF8F2] border border-[#E5DBC7] rounded-xl text-xs text-[#0D2E1C] focus:outline-none focus:border-[#0D2E1C]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#0D2E1C] uppercase tracking-wider mb-1">
                    Phone / WhatsApp Number
                  </label>
                  <input
                    type="tel"
                    placeholder="+234..."
                    className="w-full px-4 py-2.5 bg-[#FAF8F2] border border-[#E5DBC7] rounded-xl text-xs text-[#0D2E1C] focus:outline-none focus:border-[#0D2E1C]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#0D2E1C] uppercase tracking-wider mb-1">
                    Inquiry Type
                  </label>
                  <select className="w-full px-3 py-2.5 bg-[#FAF8F2] border border-[#E5DBC7] rounded-xl text-xs text-[#0D2E1C] focus:outline-none focus:border-[#0D2E1C]">
                    <option>Bulk Produce Purchase (Restaurants / Caterers)</option>
                    <option>Farmer / Vendor Enrollment</option>
                    <option>Transit & Delivery Inquiry</option>
                    <option>Other Feedback</option>
                  </select>
                </div>
              </div>

              <button
                onClick={() => {
                  alert("Thank you! Your message has been routed to our Ikere-Ekiti farm coordination desk.");
                  setIsContactOpen(false);
                }}
                className="w-full py-3 bg-[#0D2E1C] hover:bg-[#134229] text-[#CFE73B] font-bold text-xs rounded-full transition-colors"
              >
                Submit Inquiry
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Verified Produce Reviews Slide-Out Drawer */}
      <ProductReviewsDrawer
        isOpen={!!reviewsDrawerProduct}
        onClose={() => setReviewsDrawerProduct(null)}
        productId={reviewsDrawerProduct?.id || null}
        productName={reviewsDrawerProduct?.name}
        productImage={reviewsDrawerProduct?.imageUrl}
        farmerName={reviewsDrawerProduct?.farmerName}
        location={reviewsDrawerProduct?.location}
      />
    </div>
  );
}
