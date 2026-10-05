"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useAuth } from "@/lib/auth-context";
import ReviewModal from "@/components/reviews/ReviewModal";

interface OrderItem {
  productId: string;
  productName: string;
  unit: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
  imageUrl: string;
  farmName?: string;
  farmLocation?: string;
}

interface BuyerOrder {
  id: string;
  orderReference: string;
  status: "pending" | "confirmed" | "in_transit" | "delivered" | "cancelled";
  totalAmount: number;
  transitFee: number;
  deliveryAddress: string;
  deliveryPhone: string;
  createdAt: string;
  items: OrderItem[];
  payment?: {
    status: string;
    channel?: string;
    paidAt?: string;
  };
}

export default function BuyerOrdersPage() {
  const { user, isAuthenticated, openAuthModal } = useAuth();

  const [orders, setOrders] = useState<BuyerOrder[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [disputedOrderMap, setDisputedOrderMap] = useState<Record<string, { id: string; status: string }>>({});
  const [reviewingItem, setReviewingItem] = useState<{
    productId: string;
    productName: string;
    orderReference: string;
    farmerName?: string;
  } | null>(null);
  const [reviewedKeyMap, setReviewedKeyMap] = useState<Record<string, boolean>>({});

  useEffect(() => {
    async function fetchOrders() {
      setIsLoading(true);
      try {
        const res = await fetch("/api/buyer/orders", { cache: "no-store" });
        if (res.ok) {
          const data = await res.json();
          if (data.orders) {
            setOrders(data.orders);
          }
        }
        } catch (err) {
        console.warn("Buyer orders fetch notice:", err);
      } finally {
        setIsLoading(false);
      }

      // Fetch disputes to display status badges
      try {
        const dispRes = await fetch("/api/admin/disputes");
        if (dispRes.ok) {
          const dispData = await dispRes.json();
          if (Array.isArray(dispData.disputes)) {
            const map: Record<string, { id: string; status: string }> = {};
            dispData.disputes.forEach((d: { orderReference: string; id: string; status: string }) => {
              map[d.orderReference] = { id: d.id, status: d.status };
            });
            setDisputedOrderMap(map);
          }
        }
      } catch {
        // Ignore dispute fetch failure
      }
    }

    fetchOrders();
  }, [user]);

  const filteredOrders = orders.filter((ord) => {
    if (filterStatus === "all") return true;
    if (filterStatus === "active") return ord.status === "pending" || ord.status === "confirmed";
    return ord.status === filterStatus;
  });

  const totalSpent = orders.reduce((sum, o) => sum + (Number(o.totalAmount) || 0), 0);
  const deliveredCount = orders.filter((o) => o.status === "delivered").length;
  const inTransitCount = orders.filter((o) => o.status === "in_transit").length;

  // STRICT CATEGORY ISOLATION: Farmers cannot access the retail buyer orders page
  if (!isLoading && isAuthenticated && user?.role === "farmer") {
    return (
      <div className="min-h-screen bg-[#FAF8F2] flex flex-col justify-center items-center p-4 sm:p-6 text-[#0D2E1C]">
        <div className="w-full max-w-lg bg-white border border-[#E5DBC7] rounded-3xl p-6 sm:p-8 shadow-xl text-center space-y-6 animate-in fade-in zoom-in-95 duration-200">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-[#EBF3E8] border border-[#CDE1C8] flex items-center justify-center text-3xl">
            🚜
          </div>
          <div className="space-y-2">
            <span className="text-[11px] font-black uppercase tracking-wider text-[#166534] bg-[#DCFCE7] px-3 py-1 rounded-full border border-[#BBF7D0]">
              Farmer Category Account
            </span>
            <h1 className="text-xl sm:text-2xl font-black text-[#0D2E1C]">
              Farmer Category Portal
            </h1>
            <p className="text-xs text-[#4F6A52]">
              You are signed in as <span className="font-bold text-[#0D2E1C]">{user.full_name}</span> (Ekiti Farmer).
            </p>
            <p className="text-xs text-[#506155] leading-relaxed">
              Under platform category isolation rules, the retail buyer orders page is reserved for household consumers. Inbound purchase orders for your farm produce, inventory updates, and dispatch logistics are managed in your dedicated Farmer Dashboard.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            <Link
              href="/dashboard/farmer"
              className="w-full sm:w-auto px-6 py-3 bg-[#0D2E1C] hover:bg-[#1B3B22] text-[#CFE73B] font-bold text-xs rounded-xl transition-colors shadow-sm"
            >
              🚜 Open Farmer Dashboard &rarr;
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FAF8F2] text-[#0D2E1C]">
      {/* Top Header */}
      <header className="bg-[#0D2E1C] text-white px-6 py-4 border-b border-[#1B3B22]">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Link
              href="/"
              className="text-[#CFE73B] text-xs font-bold uppercase tracking-wider hover:underline flex items-center gap-1"
            >
              &larr; Farm2Door Marketplace
            </Link>
            <span className="text-white/30">•</span>
            <span className="text-xs text-white/80 font-medium">My Orders & Deliveries</span>
          </div>

          <div className="flex items-center space-x-3">
            {isAuthenticated ? (
              <>
                {user?.role === "farmer" && (
                  <Link
                    href="/dashboard/farmer"
                    className="text-xs text-[#0D2E1C] bg-[#CFE73B] hover:bg-[#BBD428] px-3 py-1.5 rounded-full font-bold transition-colors flex items-center gap-1"
                  >
                    <span>🚜</span>
                    <span>Farmer Dashboard</span>
                  </Link>
                )}
                {user?.role === "admin" && (
                  <Link
                    href="/dashboard/admin"
                    className="text-xs text-[#0D2E1C] bg-[#CFE73B] hover:bg-[#BBD428] px-3 py-1.5 rounded-full font-bold transition-colors flex items-center gap-1"
                  >
                    <span>🏛️</span>
                    <span>Admin Console</span>
                  </Link>
                )}
                <span className="text-xs text-[#FAF8F2] font-semibold bg-[#1B3B22] px-3 py-1.5 rounded-full border border-[#2B5436]">
                  👤 {user?.full_name?.split(" ")[0]} ({user?.role})
                </span>
              </>
            ) : (
              <button
                onClick={() => openAuthModal("login")}
                className="text-xs text-[#CFE73B] font-bold bg-[#1B3B22] px-3 py-1.5 rounded-xl hover:bg-[#234A2D] cursor-pointer"
              >
                Sign In
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
        {/* Farmer Account Redirect Notice */}
        {user?.role === "farmer" && (
          <div className="mb-6 p-5 rounded-2xl bg-[#0D2E1C] text-[#FAF8F2] border-2 border-[#CFE73B] flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-lg animate-in fade-in">
            <div className="flex items-start sm:items-center gap-3">
              <span className="text-2xl">🌱</span>
              <div>
                <h3 className="text-sm font-bold text-[#CFE73B]">You are signed in as an Ekiti Farmer</h3>
                <p className="text-xs text-white/80 mt-0.5">
                  This page tracks retail household purchases. Inbound orders from buyers for your produce and dispatch operations are managed in your dedicated Farmer Dashboard.
                </p>
              </div>
            </div>
            <Link
              href="/dashboard/farmer"
              className="px-4 py-2 bg-[#CFE73B] hover:bg-[#BBD428] text-[#0D2E1C] font-black text-xs rounded-xl transition-colors whitespace-nowrap self-start sm:self-auto"
            >
              🚜 Open Farmer Dashboard →
            </Link>
          </div>
        )}

        {/* Title & Summary */}
        <div className="mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-black text-[#0D2E1C]">
                📦 My Orders & Deliveries
              </h1>
              <p className="text-xs sm:text-sm text-[#4F6A52] mt-1">
                Track live harvest dispatch, farm-to-doorstep transit, and delivery receipts across Ekiti State.
              </p>
            </div>

            <Link
              href="/"
              className="inline-flex items-center space-x-2 px-5 py-2.5 bg-[#0D2E1C] text-[#CFE73B] text-xs font-bold rounded-xl hover:bg-[#1B3B22] transition-colors shrink-0"
            >
              <span>+ Order Fresh Harvest</span>
            </Link>
          </div>

          {/* Quick Metrics Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6">
            <div className="bg-white p-4 rounded-2xl border border-[#E5DBC7] shadow-xs">
              <span className="text-[11px] font-bold text-[#4F6A52] uppercase tracking-wider block">Total Orders</span>
              <span className="text-2xl font-black text-[#0D2E1C] mt-1 block">{orders.length}</span>
            </div>
            <div className="bg-white p-4 rounded-2xl border border-[#E5DBC7] shadow-xs">
              <span className="text-[11px] font-bold text-[#4F6A52] uppercase tracking-wider block">In Transit</span>
              <span className="text-2xl font-black text-[#1E40AF] mt-1 block">{inTransitCount}</span>
            </div>
            <div className="bg-white p-4 rounded-2xl border border-[#E5DBC7] shadow-xs">
              <span className="text-[11px] font-bold text-[#4F6A52] uppercase tracking-wider block">Delivered</span>
              <span className="text-2xl font-black text-[#166534] mt-1 block">{deliveredCount}</span>
            </div>
            <div className="bg-white p-4 rounded-2xl border border-[#E5DBC7] shadow-xs">
              <span className="text-[11px] font-bold text-[#4F6A52] uppercase tracking-wider block">Total Paid</span>
              <span className="text-2xl font-black text-[#0D2E1C] mt-1 block">₦{totalSpent.toLocaleString()}</span>
            </div>
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="flex items-center space-x-2 pb-4 border-b border-[#E5DBC7] mb-6 overflow-x-auto">
          {[
            { id: "all", label: `All Orders (${orders.length})` },
            { id: "active", label: "Confirmed / Processing" },
            { id: "in_transit", label: "In Transit 🚚" },
            { id: "delivered", label: "Delivered 📦" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setFilterStatus(tab.id)}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-colors cursor-pointer whitespace-nowrap ${
                filterStatus === tab.id
                  ? "bg-[#0D2E1C] text-[#CFE73B]"
                  : "bg-white text-[#4F6A52] border border-[#E5DBC7] hover:bg-[#F2ECE0]"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Loading State */}
        {isLoading ? (
          <div className="bg-white rounded-2xl border border-[#E5DBC7] p-12 text-center text-[#4F6A52]">
            <svg className="animate-spin h-6 w-6 text-[#6A9B48] mx-auto mb-2" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
            <span className="text-xs font-semibold">Loading your orders & transit updates...</span>
          </div>
        ) : filteredOrders.length === 0 ? (
          /* Empty State */
          <div className="bg-white rounded-2xl border border-[#E5DBC7] p-12 text-center max-w-lg mx-auto">
            <span className="text-5xl block mb-3">🧺</span>
            <h3 className="text-lg font-black text-[#0D2E1C]">No Orders in this View</h3>
            <p className="text-xs text-[#4F6A52] mt-1 mb-6">
              You haven't placed any harvest orders in this category yet. Explore fresh produce from certified Ekiti smallholders.
            </p>
            <Link
              href="/"
              className="px-6 py-3 bg-[#0D2E1C] text-[#CFE73B] text-xs font-bold rounded-xl hover:bg-[#1B3B22] transition-colors"
            >
              Browse Ekiti Produce
            </Link>
          </div>
        ) : (
          /* Orders List */
          <div className="space-y-6">
            {filteredOrders.map((ord) => {
              const statusColors = {
                pending: "bg-[#FEF08A] text-[#854D0E] border-[#FDE047]",
                confirmed: "bg-[#DCFCE7] text-[#166534] border-[#BBF7D0]",
                in_transit: "bg-[#DBEAFE] text-[#1E40AF] border-[#BFDBFE]",
                delivered: "bg-[#DCFCE7] text-[#166534] border-[#BBF7D0]",
                cancelled: "bg-[#FEE2E2] text-[#991B1B] border-[#FCA5A5]",
              };

              const statusLabels = {
                pending: "Payment Pending",
                confirmed: "Confirmed • Ready for Harvest",
                in_transit: "In Transit 🚚",
                delivered: "Delivered to Doorstep 📦",
                cancelled: "Cancelled",
              };

              return (
                <div
                  key={ord.orderReference}
                  className="bg-white rounded-2xl border border-[#E5DBC7] p-5 sm:p-6 shadow-xs space-y-4"
                >
                  {/* Card Top Row */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-[#E5DBC7] gap-2">
                    <div className="flex items-center space-x-3">
                      <span className="px-3 py-1 bg-[#0D2E1C] text-[#CFE73B] rounded-full text-xs font-mono font-bold">
                        REF: {ord.orderReference}
                      </span>
                      <span className="text-xs text-[#4F6A52]">
                        {new Date(ord.createdAt).toLocaleDateString("en-NG", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>

                    <div className="flex items-center space-x-2">
                      {disputedOrderMap[ord.orderReference] && (
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                            disputedOrderMap[ord.orderReference].status === "open"
                              ? "bg-amber-100 text-amber-900 border border-amber-300"
                              : "bg-emerald-100 text-emerald-900 border border-emerald-300"
                          }`}
                        >
                          ⚠️ Dispute: {disputedOrderMap[ord.orderReference].status}
                        </span>
                      )}
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-bold border ${
                          statusColors[ord.status] || "bg-gray-100 text-gray-800"
                        }`}
                      >
                        {statusLabels[ord.status] || ord.status}
                      </span>
                    </div>
                  </div>

                  {/* Produce Items Grid */}
                  <div className="divide-y divide-[#E5DBC7]">
                    {ord.items.map((item, idx) => (
                      <div key={idx} className="py-3 flex items-center justify-between gap-3">
                        <div className="flex items-center space-x-3">
                          <div className="relative w-12 h-12 rounded-xl bg-[#FAF8F2] overflow-hidden shrink-0 border border-[#E5DBC7]">
                            <Image
                              src={item.imageUrl || "/images/produce/yam-tubers.jpg"}
                              alt={item.productName}
                              fill
                              className="object-cover"
                              sizes="48px"
                            />
                          </div>
                          <div>
                            <h4 className="text-xs font-bold text-[#0D2E1C]">{item.productName}</h4>
                            <p className="text-[11px] text-[#4F6A52]">
                              {item.quantity} {item.unit} × ₦{Number(item.unitPrice).toLocaleString()}
                            </p>
                            {item.farmName && (
                              <p className="text-[10px] text-[#6A9B48]">
                                🚜 {item.farmName} {item.farmLocation ? `(${item.farmLocation})` : ""}
                              </p>
                            )}
                          </div>
                        </div>

                        <div className="flex flex-col items-end gap-1.5 shrink-0">
                          <span className="text-xs font-black text-[#0D2E1C]">
                            ₦{Number(item.subtotal).toLocaleString()}
                          </span>

                          {ord.status === "delivered" && (
                            <div>
                              {reviewedKeyMap[`${ord.orderReference}_${item.productId}`] ? (
                                <span className="text-[10px] font-bold text-[#166534] bg-[#DCFCE7] px-2 py-0.5 rounded-full border border-[#BBF7D0]">
                                  ✓ Reviewed ★
                                </span>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() =>
                                    setReviewingItem({
                                      productId: item.productId,
                                      productName: item.productName,
                                      orderReference: ord.orderReference,
                                      farmerName: item.farmName,
                                    })
                                  }
                                  className="px-2.5 py-1 bg-[#166534] hover:bg-[#14532D] text-white text-[10px] font-bold rounded-lg transition-colors cursor-pointer flex items-center gap-1 shadow-2xs"
                                >
                                  <span>⭐</span>
                                  <span>Rate Harvest</span>
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Order Footer Details & Action */}
                  <div className="pt-3 border-t border-[#E5DBC7] flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                    <div>
                      <span className="text-[#4F6A52]">Delivery Destination: </span>
                      <span className="font-semibold text-[#0D2E1C]">{ord.deliveryAddress}</span>
                    </div>

                    <div className="flex items-center space-x-4">
                      <div>
                        <span className="text-[#4F6A52]">Total Paid: </span>
                        <span className="text-sm font-black text-[#0D2E1C]">
                          ₦{Number(ord.totalAmount).toLocaleString()}
                        </span>
                      </div>

                      <Link
                        href={`/orders/${encodeURIComponent(ord.orderReference)}`}
                        className="px-4 py-2 bg-[#0D2E1C] hover:bg-[#1B3B22] text-[#CFE73B] text-xs font-bold rounded-xl transition-colors shrink-0 shadow-xs"
                      >
                        📦 Track Live Order &rarr;
                      </Link>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* Verified Peer Review Submission Modal (PRD Module 5) */}
      {reviewingItem && (
        <ReviewModal
          isOpen={!!reviewingItem}
          onClose={() => setReviewingItem(null)}
          productId={reviewingItem.productId}
          productName={reviewingItem.productName}
          orderReference={reviewingItem.orderReference}
          farmerName={reviewingItem.farmerName}
          onReviewSubmitted={() => {
            setReviewedKeyMap((prev) => ({
              ...prev,
              [`${reviewingItem.orderReference}_${reviewingItem.productId}`]: true,
            }));
          }}
        />
      )}
    </div>
  );
}
