"use client";

import React, { useState, useEffect, useCallback, useTransition } from "react";
import Link from "next/link";
import Image from "next/image";
import { useAuth } from "@/lib/auth-context";
import { ProduceUnit, OrderStatus } from "@/lib/supabase/types";
import { FarmerBankDetails } from "@/lib/admin-store";

interface FarmerProduct {
  id: string;
  farmerId: string;
  name: string;
  description: string;
  unit: ProduceUnit;
  price: number;
  stock: number;
  isAvailable: boolean;
  imageUrl: string;
  harvestTime: string;
  categoryId: number;
  categoryName: string;
  categoryIcon: string;
  createdAt: string;
  updatedAt?: string;
}

interface InboundOrderItem {
  productId: string;
  productName: string;
  unit: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
}

interface InboundOrder {
  id: string;
  orderReference: string;
  buyerName: string;
  deliveryPhone: string;
  deliveryAddress: string;
  status: OrderStatus;
  transitFee: number;
  totalFarmerAmount: number;
  createdAt: string;
  items: InboundOrderItem[];
}

interface Metrics {
  activeListings: number;
  totalListings: number;
  totalStock: number;
  inboundOrders: number;
  totalEarnings: number;
}

const SEED_FARMERS = [
  { id: "11111111-1111-1111-1111-111111111111", name: "Babatunde Agro", farmName: "Babatunde Organic Farms", location: "Ikere-Ekiti" },
  { id: "22222222-2222-2222-2222-222222222222", name: "Grace Agboola", farmName: "Agboola Spice Gardens", location: "Ado-Ekiti Outskirts" },
  { id: "33333333-3333-3333-3333-333333333333", name: "Ikere Orchards", farmName: "Ikere Central Commercial Farms", location: "Ikere South Farmlands" },
  { id: "44444444-4444-4444-4444-444444444444", name: "Igbemo Millers", farmName: "Igbemo Central Cooperative", location: "Igbemo-Ekiti" },
];

export default function FarmerDashboardPage() {
  const { user, isLoading: isAuthLoading, logout, openAuthModal } = useAuth();
  const [, startTransition] = useTransition();

  // Active farmer identity (authenticated or chosen demo farmer)
  const [selectedFarmerId, setSelectedFarmerId] = useState<string>(
    user?.id || SEED_FARMERS[0].id
  );

  const [activeTab, setActiveTab] = useState<"inventory" | "orders" | "profile">("inventory");
  const [metrics, setMetrics] = useState<Metrics>({
    activeListings: 0,
    totalListings: 0,
    totalStock: 0,
    inboundOrders: 0,
    totalEarnings: 0,
  });

  const [products, setProducts] = useState<FarmerProduct[]>([]);
  const [orders, setOrders] = useState<InboundOrder[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [unitFilter, setUnitFilter] = useState<string>("all");
  const [notification, setNotification] = useState<string | null>(null);

  // Bank payout & settlement state
  const [bankDetails, setBankDetails] = useState<FarmerBankDetails | null>(null);
  const [availableBanks, setAvailableBanks] = useState<{ name: string; code: string }[]>([]);
  const [isEditingBank, setIsEditingBank] = useState(false);
  const [selectedBankName, setSelectedBankName] = useState("First Bank of Nigeria");
  const [accountNumberInput, setAccountNumberInput] = useState("");
  const [accountNameInput, setAccountNameInput] = useState("");
  const [isSavingBank, setIsSavingBank] = useState(false);
  const [bankError, setBankError] = useState<string | null>(null);
  const [showFullAccount, setShowFullAccount] = useState(false);

  // Edit Product Modal state
  const [editingProduct, setEditingProduct] = useState<FarmerProduct | null>(null);
  const [editPrice, setEditPrice] = useState("");
  const [editStock, setEditStock] = useState("");
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  // Delete confirmation state
  const [deletingProductId, setDeletingProductId] = useState<string | null>(null);

  // Synchronize when user logs in
  useEffect(() => {
    if (user?.id) {
      setSelectedFarmerId(user.id);
    }
  }, [user]);

  // Load dashboard data (metrics, products, orders, bank details)
  const loadDashboardData = useCallback(async (farmerIdToFetch: string) => {
    setIsLoading(true);
    try {
      const [metricsRes, productsRes, ordersRes, bankRes] = await Promise.all([
        fetch(`/api/farmer/metrics?farmer_id=${farmerIdToFetch}`, { cache: "no-store" }),
        fetch(`/api/farmer/products?farmer_id=${farmerIdToFetch}`, { cache: "no-store" }),
        fetch(`/api/farmer/orders?farmer_id=${farmerIdToFetch}`, { cache: "no-store" }),
        fetch(`/api/farmer/bank?farmer_id=${farmerIdToFetch}`, { cache: "no-store" }),
      ]);

      if (metricsRes.ok) {
        const mData = await metricsRes.json();
        setMetrics(mData.metrics);
      }

      if (productsRes.ok) {
        const pData = await productsRes.json();
        setProducts(pData.products || []);
      }

      if (ordersRes.ok) {
        const oData = await ordersRes.json();
        setOrders(oData.orders || []);
      }

      if (bankRes.ok) {
        const bData = await bankRes.json();
        if (bData.bankDetails) setBankDetails(bData.bankDetails);
        if (bData.availableBanks) setAvailableBanks(bData.availableBanks);
      }
    } catch (err) {
      console.error("Error loading farmer data:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDashboardData(selectedFarmerId);
  }, [selectedFarmerId, loadDashboardData]);

  const handleOpenBankModal = () => {
    setSelectedBankName(bankDetails?.bankName || "First Bank of Nigeria");
    setAccountNumberInput(bankDetails?.accountNumber || "");
    setAccountNameInput(bankDetails?.accountName || currentFarmerInfo.name);
    setBankError(null);
    setIsEditingBank(true);
  };

  const handleSaveBankDetails = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingBank(true);
    setBankError(null);

    try {
      const cleanAcc = accountNumberInput.trim().replace(/\D/g, "");
      if (cleanAcc.length !== 10) {
        throw new Error("Account number must be exactly 10 digits (NUBAN).");
      }
      if (!accountNameInput.trim()) {
        throw new Error("Account holder name is required.");
      }

      const matchedBank = availableBanks.find((b) => b.name === selectedBankName);
      const res = await fetch("/api/farmer/bank", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          farmer_id: selectedFarmerId,
          bank_name: selectedBankName,
          account_number: cleanAcc,
          account_name: accountNameInput.trim(),
          bank_code: matchedBank?.code || "",
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to update settlement bank account.");
      }

      setBankDetails(data.bankDetails);
      setIsEditingBank(false);
      setNotification("Settlement bank account updated & verified for escrow clearance!");
      setTimeout(() => setNotification(null), 4000);
    } catch (err: any) {
      setBankError(err.message || "An unexpected error occurred.");
    } finally {
      setIsSavingBank(false);
    }
  };

  // Quick Inline Stock Adjustment (+1 / -1)
  const handleQuickStockAdjust = async (product: FarmerProduct, delta: number) => {
    const newStock = Math.max(0, product.stock + delta);
    // PRD FR-2.3: Zero stock automatically toggles is_available to false
    const newAvailability = newStock > 0 ? product.isAvailable : false;

    // Optimistic UI update
    setProducts((prev) =>
      prev.map((p) =>
        p.id === product.id ? { ...p, stock: newStock, isAvailable: newAvailability } : p
      )
    );

    try {
      const res = await fetch(`/api/farmer/products/${product.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          stock_quantity: newStock,
          is_available: newAvailability,
          demo_farmer_id: selectedFarmerId,
        }),
      });

      if (!res.ok) {
        throw new Error("Failed to update stock");
      }

      setNotification(`Updated stock for "${product.name}" to ${newStock} ${product.unit}(s)`);
      setTimeout(() => setNotification(null), 3500);
      loadDashboardData(selectedFarmerId);
    } catch {
      // Revert on error
      loadDashboardData(selectedFarmerId);
    }
  };

  // Toggle Listing Availability
  const handleToggleAvailability = async (product: FarmerProduct) => {
    if (product.stock === 0 && !product.isAvailable) {
      alert("Cannot activate listing with 0 stock. Please increment stock first.");
      return;
    }

    const newStatus = !product.isAvailable;

    // Optimistic update
    setProducts((prev) =>
      prev.map((p) => (p.id === product.id ? { ...p, isAvailable: newStatus } : p))
    );

    try {
      const res = await fetch(`/api/farmer/products/${product.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          is_available: newStatus,
          demo_farmer_id: selectedFarmerId,
        }),
      });

      if (!res.ok) throw new Error("Failed to toggle listing");

      setNotification(`Listing "${product.name}" marked as ${newStatus ? "ACTIVE" : "PAUSED"}`);
      setTimeout(() => setNotification(null), 3000);
      loadDashboardData(selectedFarmerId);
    } catch {
      loadDashboardData(selectedFarmerId);
    }
  };

  // Open Edit Modal
  const openEditModal = (product: FarmerProduct) => {
    setEditingProduct(product);
    setEditPrice(product.price.toString());
    setEditStock(product.stock.toString());
  };

  // Save Modal Edits
  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProduct) return;

    const parsedPrice = parseFloat(editPrice);
    const parsedStock = parseInt(editStock, 10);

    if (isNaN(parsedPrice) || parsedPrice <= 0 || isNaN(parsedStock) || parsedStock < 0) {
      alert("Please provide valid price and stock numbers.");
      return;
    }

    setIsSavingEdit(true);
    try {
      const res = await fetch(`/api/farmer/products/${editingProduct.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          price_per_unit: parsedPrice,
          stock_quantity: parsedStock,
          demo_farmer_id: selectedFarmerId,
        }),
      });

      if (!res.ok) throw new Error("Failed to save changes");

      setEditingProduct(null);
      setNotification(`Produce details for "${editingProduct.name}" updated successfully.`);
      setTimeout(() => setNotification(null), 3000);
      loadDashboardData(selectedFarmerId);
    } catch {
      alert("Error saving edits. Please try again.");
    } finally {
      setIsSavingEdit(false);
    }
  };

  // Delete Produce Listing
  const handleDeleteProduct = async (id: string) => {
    try {
      const res = await fetch(`/api/farmer/products/${id}?demo_farmer_id=${selectedFarmerId}`, {
        method: "DELETE",
      });

      if (!res.ok) throw new Error("Failed to delete produce");

      setDeletingProductId(null);
      setNotification("Listing deleted successfully.");
      setTimeout(() => setNotification(null), 3000);
      loadDashboardData(selectedFarmerId);
    } catch {
      alert("Error deleting product.");
    }
  };

  // Update Inbound Order Dispatch Lifecycle
  const handleUpdateOrderStatus = async (orderId: string, nextStatus: OrderStatus) => {
    try {
      const res = await fetch("/api/farmer/orders", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ order_id: orderId, status: nextStatus }),
      });

      if (!res.ok) throw new Error("Failed to update status");

      setNotification(`Order dispatch status updated to ${nextStatus.toUpperCase().replace("_", " ")}`);
      setTimeout(() => setNotification(null), 3500);
      loadDashboardData(selectedFarmerId);
    } catch {
      alert("Error updating order status.");
    }
  };

  // Filtered Produce List
  const filteredProducts = products.filter((p) => {
    const matchesSearch =
      searchQuery === "" ||
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.categoryName.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesUnit = unitFilter === "all" || p.unit === unitFilter;
    return matchesSearch && matchesUnit;
  });

  const currentFarmerInfo =
    SEED_FARMERS.find((f) => f.id === selectedFarmerId) || {
      name: user?.full_name || "Ekiti Farmer",
      farmName: user?.farm_name || "Smallholder Agro Enterprise",
      location: user?.farm_location || "Ikere-Ekiti",
    };

  return (
    <div className="min-h-screen bg-[#FAF8F2] text-[#0D2E1C]">
      {/* Top Header */}
      <header className="bg-[#0D2E1C] text-white px-4 sm:px-6 py-4 border-b border-[#1B3B22] sticky top-0 z-30">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center space-x-3">
            <Link
              href="/"
              className="text-[#CFE73B] text-xs font-bold uppercase tracking-wider hover:underline flex items-center gap-1"
            >
              &larr; Public Marketplace
            </Link>
            <span className="text-white/30 hidden sm:inline">•</span>
            <span className="text-xs text-white/80 font-medium hidden sm:inline">
              Producer Administration Console
            </span>
          </div>

          <div className="flex items-center space-x-3">
            {/* Demo Farmer Switcher Dropdown (Allows evaluating different smallholders) */}
            <div className="hidden md:flex items-center space-x-2 bg-[#1B3B22] px-3 py-1.5 rounded-xl border border-[#2B5436] text-xs">
              <span className="text-white/70 text-[11px]">Farm Account:</span>
              <select
                value={selectedFarmerId}
                onChange={(e) => {
                  const newId = e.target.value;
                  startTransition(() => {
                    setSelectedFarmerId(newId);
                  });
                }}
                className="bg-transparent text-[#CFE73B] font-bold focus:outline-none cursor-pointer"
              >
                {SEED_FARMERS.map((sf) => (
                  <option key={sf.id} value={sf.id} className="bg-[#0D2E1C] text-white">
                    {sf.farmName} ({sf.location})
                  </option>
                ))}
                {user?.id && (
                  <option value={user.id} className="bg-[#0D2E1C] text-white">
                    {user.farm_name || user.full_name} (My Logged-in Account)
                  </option>
                )}
              </select>
            </div>

            <Link
              href="/profile"
              className="text-xs text-[#FAF8F2] bg-[#1B3B22] hover:bg-[#234A2D] px-3 py-1.5 rounded-lg border border-[#2B5436] font-semibold transition-colors flex items-center gap-1.5"
            >
              <span>⚙️</span>
              <span className="hidden sm:inline">Settings</span>
            </Link>

            {user ? (
              <button
                onClick={() => logout()}
                className="text-xs text-white/80 hover:text-white px-3 py-1.5 rounded-lg border border-white/20 hover:border-white transition-colors cursor-pointer"
              >
                Sign Out
              </button>
            ) : (
              <button
                onClick={() => openAuthModal("login", "farmer")}
                className="text-xs bg-[#CFE73B] text-[#0D2E1C] font-bold px-3 py-1.5 rounded-lg hover:bg-[#b5ba3e] transition-colors cursor-pointer"
              >
                Sign In
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Notification Toast */}
      {notification && (
        <div className="fixed bottom-6 right-6 z-50 bg-[#0D2E1C] text-[#FAF8F2] px-5 py-3 rounded-xl border border-[#6A9B48] shadow-lg flex items-center space-x-3 animate-fade-in">
          <span className="text-[#CFE73B] text-base">✓</span>
          <span className="text-xs font-semibold">{notification}</span>
        </div>
      )}

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Banner */}
        <div className="bg-[#FFFDF9] border border-[#E5DBC7] rounded-2xl p-6 sm:p-8 mb-8 shadow-xs">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#EBF3E8] border border-[#CDE1C8] text-[#1B3B22] text-xs font-bold mb-2">
                <span>🌱 Verified Ekiti Smallholder Farmer</span>
                <span>•</span>
                <span>{currentFarmerInfo.location}</span>
                <span>•</span>
                <span className="text-[#6A9B48]">PRD Stage 4 Active</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-black text-[#0D2E1C] tracking-tight">
                {currentFarmerInfo.farmName}
              </h1>
              <p className="text-xs sm:text-sm text-[#4F6A52] mt-1">
                Operator: <strong className="text-[#0D2E1C]">{currentFarmerInfo.name}</strong> • Direct farm-gate settlement with 100% Paystack escrow guarantee.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <Link
                href="/dashboard/farmer/new-listing"
                className="px-6 py-3 bg-[#0D2E1C] hover:bg-[#1B3B22] text-[#FAF8F2] text-xs font-bold rounded-xl transition-all shadow-sm flex items-center space-x-2 cursor-pointer"
              >
                <span>+ List New Harvest</span>
              </Link>
            </div>
          </div>
        </div>

        {/* 4 KPI Metric Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div className="bg-white p-5 rounded-2xl border border-[#E5DBC7] shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-[#4F6A52] uppercase tracking-wider">
                Active Listings
              </span>
              <span className="text-xl">🧺</span>
            </div>
            <div className="text-3xl font-black text-[#0D2E1C] mt-2">
              {isLoading ? "..." : metrics.activeListings}
            </div>
            <p className="text-[11px] text-[#6A9B48] font-semibold mt-1">
              {metrics.totalListings} total produce registered
            </p>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-[#E5DBC7] shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-[#4F6A52] uppercase tracking-wider">
                Total Stock Available
              </span>
              <span className="text-xl">📦</span>
            </div>
            <div className="text-3xl font-black text-[#0D2E1C] mt-2">
              {isLoading ? "..." : `${metrics.totalStock} Units`}
            </div>
            <p className="text-[11px] text-[#4F6A52] font-semibold mt-1">
              Across 5 packaging units
            </p>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-[#E5DBC7] shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-[#4F6A52] uppercase tracking-wider">
                Inbound Buyer Orders
              </span>
              <span className="text-xl">🚚</span>
            </div>
            <div className="text-3xl font-black text-[#0D2E1C] mt-2">
              {isLoading ? "..." : `${metrics.inboundOrders} Orders`}
            </div>
            <p className="text-[11px] text-[#854D0E] font-semibold mt-1">
              Awaiting transit dispatch
            </p>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-[#E5DBC7] shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-[#4F6A52] uppercase tracking-wider">
                Guaranteed Escrow
              </span>
              <span className="text-xl">💳</span>
            </div>
            <div className="text-3xl font-black text-[#0D2E1C] mt-2">
              {isLoading ? "..." : `₦${metrics.totalEarnings.toLocaleString()}`}
            </div>
            <p className="text-[11px] text-[#166534] font-semibold mt-1">
              Held in Paystack Escrow
            </p>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center space-x-3 border-b border-[#E5DBC7] mb-6">
          <button
            onClick={() => setActiveTab("inventory")}
            className={`pb-3 px-2 text-xs font-bold uppercase tracking-wider transition-all border-b-2 cursor-pointer ${
              activeTab === "inventory"
                ? "border-[#0D2E1C] text-[#0D2E1C]"
                : "border-transparent text-[#4F6A52] hover:text-[#0D2E1C]"
            }`}
          >
            Produce Inventory ({products.length})
          </button>
          <button
            onClick={() => setActiveTab("orders")}
            className={`pb-3 px-2 text-xs font-bold uppercase tracking-wider transition-all border-b-2 cursor-pointer ${
              activeTab === "orders"
                ? "border-[#0D2E1C] text-[#0D2E1C]"
                : "border-transparent text-[#4F6A52] hover:text-[#0D2E1C]"
            }`}
          >
            Inbound Orders & Dispatch ({orders.length})
          </button>
          <button
            onClick={() => setActiveTab("profile")}
            className={`pb-3 px-2 text-xs font-bold uppercase tracking-wider transition-all border-b-2 cursor-pointer ${
              activeTab === "profile"
                ? "border-[#0D2E1C] text-[#0D2E1C]"
                : "border-transparent text-[#4F6A52] hover:text-[#0D2E1C]"
            }`}
          >
            Farm Profile & Settlement
          </button>
        </div>

        {/* TAB 1: PRODUCE INVENTORY */}
        {activeTab === "inventory" && (
          <div className="space-y-6">
            {/* Search & Filter Toolbar */}
            <div className="bg-white p-4 rounded-2xl border border-[#E5DBC7] flex flex-col sm:flex-row items-center justify-between gap-3 shadow-xs">
              <div className="relative w-full sm:w-80">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Filter crop name or category..."
                  className="w-full pl-9 pr-4 py-2 bg-[#FAF8F2] border border-[#E5DBC7] rounded-xl text-xs font-semibold text-[#0D2E1C] focus:outline-none focus:border-[#0D2E1C]"
                />
                <span className="absolute left-3 top-2.5 text-xs text-[#4F6A52]">🔍</span>
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery("")}
                    className="absolute right-3 top-2 text-xs text-[#4F6A52] cursor-pointer"
                  >
                    ✕
                  </button>
                )}
              </div>

              <div className="flex items-center space-x-2 w-full sm:w-auto overflow-x-auto">
                <span className="text-xs font-semibold text-[#4F6A52] shrink-0">Unit:</span>
                {["all", "tuber", "basket", "crate", "bundle", "50kg bag"].map((u) => (
                  <button
                    key={u}
                    onClick={() => setUnitFilter(u)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors shrink-0 cursor-pointer ${
                      unitFilter === u
                        ? "bg-[#0D2E1C] text-white"
                        : "bg-[#FAF8F2] text-[#4F6A52] border border-[#E5DBC7] hover:bg-[#F2ECE0]"
                    }`}
                  >
                    {u === "all" ? "All Units" : u}
                  </button>
                ))}
              </div>
            </div>

            {/* Inventory Listing Cards / Table */}
            {isLoading ? (
              <div className="p-12 text-center text-xs font-semibold text-[#4F6A52]">
                Loading farmer inventory from Supabase...
              </div>
            ) : filteredProducts.length === 0 ? (
              <div className="bg-white p-12 rounded-2xl border border-[#E5DBC7] text-center">
                <span className="text-4xl block mb-2">🌱</span>
                <h3 className="text-base font-bold text-[#0D2E1C]">No Produce Listings Found</h3>
                <p className="text-xs text-[#4F6A52] mt-1 max-w-sm mx-auto mb-4">
                  You haven&apos;t listed any harvest under this filter, or your stock is depleted.
                </p>
                <Link
                  href="/dashboard/farmer/new-listing"
                  className="inline-block px-5 py-2.5 bg-[#0D2E1C] text-[#FAF8F2] text-xs font-bold rounded-xl hover:bg-[#1B3B22] transition-colors"
                >
                  + Add New Produce
                </Link>
              </div>
            ) : (
              <div className="bg-white rounded-2xl border border-[#E5DBC7] shadow-xs overflow-hidden">
                <div className="divide-y divide-[#E5DBC7]">
                  {filteredProducts.map((product) => (
                    <div
                      key={product.id}
                      className="p-4 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-[#FFFDF9] transition-colors"
                    >
                      {/* Left: Thumbnail & Details */}
                      <div className="flex items-center space-x-4">
                        <div className="relative w-16 h-16 rounded-xl overflow-hidden bg-[#F2ECE0] shrink-0 border border-[#E5DBC7]">
                          <Image
                            src={product.imageUrl}
                            alt={product.name}
                            fill
                            className="object-cover"
                            sizes="64px"
                          />
                        </div>

                        <div>
                          <div className="flex items-center space-x-2">
                            <span className="text-xs">{product.categoryIcon}</span>
                            <span className="text-[10px] font-bold uppercase tracking-wider text-[#4F6A52]">
                              {product.categoryName}
                            </span>
                            <span className="text-[#E5DBC7]">•</span>
                            <span
                              className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                product.isAvailable && product.stock > 0
                                  ? "bg-[#EBF3E8] text-[#166534] border border-[#CDE1C8]"
                                  : "bg-[#FDE8E8] text-[#9B1C1C] border border-[#F8B4B4]"
                              }`}
                            >
                              {product.isAvailable && product.stock > 0 ? "Active Listing" : "Out of Stock / Paused"}
                            </span>
                          </div>

                          <h3 className="text-sm sm:text-base font-bold text-[#0D2E1C] mt-0.5">
                            {product.name}
                          </h3>

                          <p className="text-[11px] text-[#4F6A52] mt-0.5">
                            Unit: <strong className="text-[#0D2E1C]">{product.unit}</strong> • Freshness: {product.harvestTime}
                          </p>
                        </div>
                      </div>

                      {/* Right: Pricing, Quick Stock Stepper & Actions */}
                      <div className="flex flex-wrap sm:flex-nowrap items-center justify-between sm:justify-end gap-4 border-t sm:border-t-0 pt-3 sm:pt-0 border-[#E5DBC7]">
                        {/* Price Display */}
                        <div className="text-left sm:text-right">
                          <span className="text-xs font-black text-[#0D2E1C] block">
                            ₦{product.price.toLocaleString()}
                          </span>
                          <span className="text-[10px] text-[#4F6A52] font-semibold">
                            per {product.unit}
                          </span>
                        </div>

                        {/* Quick Stock Stepper (PRD FR-2.3) */}
                        <div className="bg-[#FAF8F2] border border-[#E5DBC7] rounded-xl p-1.5 flex items-center space-x-2">
                          <button
                            type="button"
                            onClick={() => handleQuickStockAdjust(product, -1)}
                            disabled={product.stock <= 0}
                            className="w-7 h-7 rounded-lg bg-white border border-[#E5DBC7] text-xs font-bold text-[#0D2E1C] hover:bg-[#F2ECE0] disabled:opacity-40 transition-colors flex items-center justify-center cursor-pointer"
                            title="Decrease Stock"
                          >
                            -
                          </button>
                          <span className="text-xs font-black text-[#0D2E1C] w-12 text-center">
                            {product.stock}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleQuickStockAdjust(product, 1)}
                            className="w-7 h-7 rounded-lg bg-white border border-[#E5DBC7] text-xs font-bold text-[#0D2E1C] hover:bg-[#F2ECE0] transition-colors flex items-center justify-center cursor-pointer"
                            title="Increase Stock"
                          >
                            +
                          </button>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex items-center space-x-1.5">
                          <button
                            onClick={() => handleToggleAvailability(product)}
                            className={`p-2 rounded-xl border text-xs font-semibold transition-colors cursor-pointer ${
                              product.isAvailable
                                ? "border-[#E5DBC7] text-[#4F6A52] hover:bg-[#F2ECE0]"
                                : "border-[#6A9B48] bg-[#EBF3E8] text-[#166534]"
                            }`}
                            title={product.isAvailable ? "Pause Listing" : "Activate Listing"}
                          >
                            {product.isAvailable ? "Pause" : "Activate"}
                          </button>

                          <button
                            onClick={() => openEditModal(product)}
                            className="p-2 rounded-xl border border-[#E5DBC7] text-xs font-semibold text-[#0D2E1C] hover:bg-[#F2ECE0] transition-colors cursor-pointer"
                            title="Edit Price & Stock"
                          >
                            ✏️ Edit
                          </button>

                          <button
                            onClick={() => setDeletingProductId(product.id)}
                            className="p-2 rounded-xl border border-[#F8B4B4] text-xs font-semibold text-[#9B1C1C] hover:bg-[#FDE8E8] transition-colors cursor-pointer"
                            title="Delete Listing"
                          >
                            🗑️
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 2: INBOUND ORDERS & DISPATCH TRACKER */}
        {activeTab === "orders" && (
          <div className="space-y-6">
            <div className="bg-[#FFFDF9] p-4 sm:p-6 rounded-2xl border border-[#E5DBC7] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-base font-bold text-[#0D2E1C]">Inbound Buyer Orders</h3>
                <p className="text-xs text-[#4F6A52] mt-0.5">
                  Orders placed by households, food caterers, and bulk retailers across Ekiti. Funds are secured in escrow.
                </p>
              </div>

              <div className="text-xs font-bold text-[#166534] bg-[#EBF3E8] px-3 py-1.5 rounded-full border border-[#CDE1C8] self-start sm:self-auto">
                🔒 Guaranteed Escrow Protected
              </div>
            </div>

            {orders.length === 0 ? (
              <div className="bg-white p-12 rounded-2xl border border-[#E5DBC7] text-center">
                <span className="text-4xl block mb-2">🚚</span>
                <h3 className="text-base font-bold text-[#0D2E1C]">No Inbound Orders Yet</h3>
                <p className="text-xs text-[#4F6A52] mt-1">
                  When buyers check out your produce, their dispatch instructions will appear here in real-time.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {orders.map((order) => {
                  const isConfirmed = order.status === "confirmed";
                  const isInTransit = order.status === "in_transit";
                  const isDelivered = order.status === "delivered";

                  return (
                    <div
                      key={order.id}
                      className="bg-white rounded-2xl border border-[#E5DBC7] p-5 sm:p-6 shadow-xs"
                    >
                      {/* Order Header */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-[#E5DBC7]">
                        <div>
                          <div className="flex items-center space-x-2">
                            <span className="text-xs font-mono font-black text-[#0D2E1C]">
                              {order.orderReference}
                            </span>
                            <span className="text-[#E5DBC7]">•</span>
                            <span className="text-xs font-semibold text-[#4F6A52]">
                              {new Date(order.createdAt).toLocaleDateString("en-NG", {
                                day: "numeric",
                                month: "short",
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </span>
                          </div>
                          <div className="text-xs text-[#4F6A52] mt-1">
                            Buyer: <strong className="text-[#0D2E1C]">{order.buyerName}</strong> ({order.deliveryPhone})
                          </div>
                        </div>

                        {/* Status Badge */}
                        <div>
                          {isConfirmed && (
                            <span className="px-3 py-1 rounded-full text-xs font-bold bg-[#FEF08A] text-[#854D0E] border border-[#FDE047]">
                              Ready for Dispatch
                            </span>
                          )}
                          {isInTransit && (
                            <span className="px-3 py-1 rounded-full text-xs font-bold bg-[#DBEAFE] text-[#1E40AF] border border-[#BFDBFE]">
                              🚚 In Transit / Dispatched
                            </span>
                          )}
                          {isDelivered && (
                            <span className="px-3 py-1 rounded-full text-xs font-bold bg-[#DCFCE7] text-[#166534] border border-[#BBF7D0]">
                              ✓ Delivered & Settled
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Items & Delivery Address */}
                      <div className="py-4 grid grid-cols-1 md:grid-cols-12 gap-4">
                        <div className="md:col-span-8 space-y-2">
                          <span className="text-[11px] font-bold uppercase tracking-wider text-[#4F6A52] block">
                            Ordered Produce Lines:
                          </span>
                          {order.items.map((item, idx) => (
                            <div
                              key={idx}
                              className="flex items-center justify-between bg-[#FAF8F2] px-3.5 py-2 rounded-xl text-xs"
                            >
                              <span className="font-bold text-[#0D2E1C]">
                                {item.productName} ({item.quantity} {item.unit})
                              </span>
                              <span className="font-black text-[#0D2E1C]">
                                ₦{item.subtotal.toLocaleString()}
                              </span>
                            </div>
                          ))}
                        </div>

                        <div className="md:col-span-4 bg-[#FAF8F2] p-4 rounded-xl border border-[#E5DBC7] text-xs">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-[#4F6A52] block mb-1">
                            Delivery Destination:
                          </span>
                          <p className="font-semibold text-[#0D2E1C]">{order.deliveryAddress}</p>
                          <div className="mt-3 pt-2 border-t border-[#E5DBC7] flex justify-between font-black text-[#0D2E1C]">
                            <span>Payout Total:</span>
                            <span className="text-[#166534]">₦{order.totalFarmerAmount.toLocaleString()}</span>
                          </div>
                        </div>
                      </div>

                      {/* Order Dispatch Actions */}
                      <div className="pt-3 border-t border-[#E5DBC7] flex flex-wrap items-center justify-between gap-3">
                        <span className="text-[11px] text-[#4F6A52]">
                          Transit coordination: Direct pickup from farm gate in {currentFarmerInfo.location}.
                        </span>

                        <div className="flex items-center space-x-2">
                          {isConfirmed && (
                            <button
                              onClick={() => handleUpdateOrderStatus(order.id, "in_transit")}
                              className="px-4 py-2 bg-[#0D2E1C] hover:bg-[#1B3B22] text-[#FAF8F2] text-xs font-bold rounded-xl transition-colors cursor-pointer"
                            >
                              🚚 Mark In Transit (Dispatched)
                            </button>
                          )}

                          {isInTransit && (
                            <button
                              onClick={() => handleUpdateOrderStatus(order.id, "delivered")}
                              className="px-4 py-2 bg-[#166534] hover:bg-[#14532D] text-white text-xs font-bold rounded-xl transition-colors cursor-pointer"
                            >
                              ✓ Confirm Buyer Delivery
                            </button>
                          )}

                          {isDelivered && (
                            <span className="text-xs font-bold text-[#166534]">
                              🎉 Payout Cleared to Farmer Account
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* TAB 3: FARM PROFILE & SETTINGS */}
        {activeTab === "profile" && (
          <div className="bg-white rounded-2xl border border-[#E5DBC7] p-6 sm:p-8 max-w-2xl shadow-xs">
            <h3 className="text-lg font-bold text-[#0D2E1C] mb-1">Farm Enterprise Credentials</h3>
            <p className="text-xs text-[#4F6A52] mb-6">
              Verified Ekiti smallholder record. Registered in accordance with PRD Section 2.
            </p>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[#4F6A52] mb-1">
                  Registered Farm Name
                </label>
                <div className="p-3 bg-[#FAF8F2] border border-[#E5DBC7] rounded-xl text-xs font-bold text-[#0D2E1C]">
                  {currentFarmerInfo.farmName}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[#4F6A52] mb-1">
                  Ekiti Farming Community
                </label>
                <div className="p-3 bg-[#FAF8F2] border border-[#E5DBC7] rounded-xl text-xs font-bold text-[#0D2E1C]">
                  {currentFarmerInfo.location}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[#4F6A52] mb-1">
                  Verification Status
                </label>
                <div className="p-3 bg-[#EBF3E8] border border-[#CDE1C8] rounded-xl text-xs font-bold text-[#166534] flex items-center gap-2">
                  <span>✓ Physical Farmland Verified</span>
                  <span>•</span>
                  <span>Ekiti State Agricultural Council Certified</span>
                </div>
              </div>

              <div className="pt-2 border-t border-[#E5DBC7]">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-[#4F6A52]">
                      Direct Settlement Bank Account
                    </label>
                    <span className="text-[11px] text-[#506155]">
                      Automated 92% farm-gate escrow clearance destination (PRD Section 2)
                    </span>
                  </div>
                  <button
                    onClick={handleOpenBankModal}
                    className="px-3 py-1.5 bg-[#0D2E1C] hover:bg-[#1B3B22] text-[#CFE73B] text-xs font-bold rounded-lg transition-colors cursor-pointer"
                  >
                    Edit Bank Details
                  </button>
                </div>

                <div className="p-4 bg-[#FAF8F2] border border-[#E5DBC7] rounded-xl space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 rounded-xl bg-[#EBF3E8] border border-[#CDE1C8] flex items-center justify-center text-lg">
                        🏦
                      </div>
                      <div>
                        <div className="text-sm font-bold text-[#0D2E1C]">
                          {bankDetails?.bankName || "First Bank of Nigeria"}
                        </div>
                        <div className="text-xs font-mono text-[#506155] flex items-center gap-1.5">
                          <span>
                            {showFullAccount
                              ? bankDetails?.accountNumber || "3098124451"
                              : `••••••${(bankDetails?.accountNumber || "4451").slice(-4)}`}
                          </span>
                          <button
                            type="button"
                            onClick={() => setShowFullAccount(!showFullAccount)}
                            className="text-[10px] text-[#6A9B48] font-bold hover:underline cursor-pointer"
                          >
                            {showFullAccount ? "Hide" : "Show"}
                          </button>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-[10px] bg-[#EBF3E8] text-[#166534] border border-[#CDE1C8] font-bold px-2.5 py-1 rounded-md flex items-center gap-1">
                        <span>✓</span> NUBAN Verified
                      </span>
                      <span className="text-[10px] bg-[#0D2E1C] text-[#CFE73B] font-bold px-2.5 py-1 rounded-md">
                        Paystack Linked
                      </span>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-[#E5DBC7]/60 flex flex-col sm:flex-row sm:items-center justify-between text-xs gap-1">
                    <span className="text-[#506155]">
                      Beneficiary Name:{" "}
                      <strong className="text-[#0D2E1C]">
                        {bankDetails?.accountName || currentFarmerInfo.name}
                      </strong>
                    </span>
                    <span className="text-[11px] text-[#6A9B48] font-semibold">
                      Direct transfer upon order delivery confirmation
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* EDIT PRODUCE MODAL */}
      {editingProduct && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-[#E5DBC7] max-w-md w-full p-6 shadow-xl animate-fade-in">
            <div className="flex items-center justify-between pb-3 border-b border-[#E5DBC7] mb-4">
              <h3 className="text-base font-bold text-[#0D2E1C]">
                Edit: {editingProduct.name}
              </h3>
              <button
                onClick={() => setEditingProduct(null)}
                className="text-xs text-[#4F6A52] hover:text-[#0D2E1C] font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[#4F6A52] mb-1">
                  Price per {editingProduct.unit} (₦)
                </label>
                <input
                  type="number"
                  min="1"
                  step="50"
                  value={editPrice}
                  onChange={(e) => setEditPrice(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-[#FAF8F2] border border-[#E5DBC7] rounded-xl text-sm font-bold text-[#0D2E1C] focus:outline-none focus:border-[#0D2E1C]"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#4F6A52] mb-1">
                  Available Stock ({editingProduct.unit}s)
                </label>
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={editStock}
                  onChange={(e) => setEditStock(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-[#FAF8F2] border border-[#E5DBC7] rounded-xl text-sm font-bold text-[#0D2E1C] focus:outline-none focus:border-[#0D2E1C]"
                  required
                />
                <p className="text-[10px] text-[#4F6A52] mt-1">
                  Setting stock to 0 will automatically mark listing as inactive.
                </p>
              </div>

              <div className="flex items-center justify-end space-x-3 pt-3 border-t border-[#E5DBC7]">
                <button
                  type="button"
                  onClick={() => setEditingProduct(null)}
                  className="px-4 py-2 rounded-xl border border-[#E5DBC7] text-xs font-bold text-[#4F6A52] hover:bg-[#F2ECE0] cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingEdit}
                  className="px-5 py-2 bg-[#0D2E1C] hover:bg-[#1B3B22] text-[#FAF8F2] text-xs font-bold rounded-xl transition-colors cursor-pointer disabled:opacity-50"
                >
                  {isSavingEdit ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION MODAL */}
      {deletingProductId && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-[#E5DBC7] max-w-sm w-full p-6 shadow-xl">
            <h3 className="text-base font-bold text-[#9B1C1C] mb-2">Delete Produce Listing?</h3>
            <p className="text-xs text-[#4F6A52] mb-4">
              This crop listing will be removed from the marketplace. Are you sure you want to proceed?
            </p>
            <div className="flex items-center justify-end space-x-3">
              <button
                onClick={() => setDeletingProductId(null)}
                className="px-4 py-2 rounded-xl border border-[#E5DBC7] text-xs font-bold text-[#4F6A52] hover:bg-[#F2ECE0] cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDeleteProduct(deletingProductId)}
                className="px-4 py-2 bg-[#9B1C1C] hover:bg-[#771D1D] text-white text-xs font-bold rounded-xl cursor-pointer"
              >
                Confirm Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* EDIT SETTLEMENT BANK ACCOUNT MODAL */}
      {isEditingBank && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-[#E5DBC7] max-w-md w-full p-6 shadow-xl animate-fade-in">
            <div className="flex items-center justify-between pb-3 border-b border-[#E5DBC7] mb-4">
              <div>
                <h3 className="text-base font-bold text-[#0D2E1C]">
                  Update Settlement Bank Account
                </h3>
                <p className="text-xs text-[#506155]">
                  Direct farm-gate payout clearance destination (PRD Section 2)
                </p>
              </div>
              <button
                onClick={() => setIsEditingBank(false)}
                className="text-xs text-[#4F6A52] hover:text-[#0D2E1C] font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            {bankError && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl font-medium">
                {bankError}
              </div>
            )}

            <form onSubmit={handleSaveBankDetails} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[#4F6A52] mb-1">
                  Financial Institution (Nigerian Bank)
                </label>
                <select
                  value={selectedBankName}
                  onChange={(e) => setSelectedBankName(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-[#FAF8F2] border border-[#E5DBC7] rounded-xl text-xs font-semibold text-[#0D2E1C] focus:outline-none focus:border-[#0D2E1C] cursor-pointer"
                >
                  {availableBanks.map((b) => (
                    <option key={b.code || b.name} value={b.name}>
                      {b.name}
                    </option>
                  ))}
                  {availableBanks.length === 0 && (
                    <>
                      <option value="First Bank of Nigeria">First Bank of Nigeria</option>
                      <option value="Access Bank">Access Bank</option>
                      <option value="Guaranty Trust Bank (GTBank)">Guaranty Trust Bank (GTBank)</option>
                      <option value="United Bank for Africa (UBA)">United Bank for Africa (UBA)</option>
                      <option value="Zenith Bank">Zenith Bank</option>
                      <option value="Kuda Microfinance Bank">Kuda Microfinance Bank</option>
                      <option value="Moniepoint Microfinance Bank">Moniepoint Microfinance Bank</option>
                      <option value="OPay Digital Services">OPay Digital Services</option>
                    </>
                  )}
                </select>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-bold uppercase tracking-wider text-[#4F6A52]">
                    NUBAN Account Number (10 Digits)
                  </label>
                  <span className="text-[10px] font-mono text-[#506155]">
                    {accountNumberInput.length} / 10
                  </span>
                </div>
                <input
                  type="text"
                  maxLength={10}
                  inputMode="numeric"
                  value={accountNumberInput}
                  onChange={(e) => setAccountNumberInput(e.target.value.replace(/\D/g, ""))}
                  placeholder="e.g. 0123456789"
                  className="w-full px-3.5 py-2.5 bg-[#FAF8F2] border border-[#E5DBC7] rounded-xl text-sm font-mono font-bold text-[#0D2E1C] tracking-widest focus:outline-none focus:border-[#0D2E1C]"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[#4F6A52] mb-1">
                  Account Beneficiary Name
                </label>
                <input
                  type="text"
                  value={accountNameInput}
                  onChange={(e) => setAccountNameInput(e.target.value)}
                  placeholder="Full name matching your bank account"
                  className="w-full px-3.5 py-2.5 bg-[#FAF8F2] border border-[#E5DBC7] rounded-xl text-xs font-bold text-[#0D2E1C] focus:outline-none focus:border-[#0D2E1C]"
                  required
                />
              </div>

              <div className="p-3 bg-[#EBF3E8] border border-[#CDE1C8] rounded-xl text-xs text-[#166534] space-y-1">
                <div className="font-bold flex items-center gap-1.5">
                  <span>🔒</span>
                  <span>Paystack Direct Transfer Integration</span>
                </div>
                <p className="text-[11px] text-[#4F6A52]">
                  When an order is confirmed delivered, 92% of gross sales is disbursed directly to this verified NUBAN destination.
                </p>
              </div>

              <div className="flex items-center justify-end space-x-3 pt-3 border-t border-[#E5DBC7]">
                <button
                  type="button"
                  onClick={() => setIsEditingBank(false)}
                  className="px-4 py-2 rounded-xl border border-[#E5DBC7] text-xs font-bold text-[#4F6A52] hover:bg-[#F2ECE0] cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingBank || accountNumberInput.length !== 10}
                  className="px-5 py-2 bg-[#0D2E1C] hover:bg-[#1B3B22] text-[#CFE73B] text-xs font-bold rounded-xl transition-colors cursor-pointer disabled:opacity-50"
                >
                  {isSavingBank ? "Verifying..." : "Save & Verify Account"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
