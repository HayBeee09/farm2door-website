"use client";

import React, { useEffect, useState, use } from "react";
import Link from "next/link";
import Image from "next/image";
import ReviewModal from "@/components/reviews/ReviewModal";
import ReportIssueModal from "@/components/orders/ReportIssueModal";

interface DisputeData {
  id: string;
  orderReference: string;
  cropName: string;
  buyerName: string;
  farmerName: string;
  type: string;
  status: "open" | "investigating" | "resolved" | "refunded";
  reportedAt: string;
  description: string;
  resolutionNotes?: string;
  resolvedAt?: string;
}

interface OrderItem {
  id: string;
  product_id: string;
  quantity: number;
  unit_price: number;
  subtotal: number;
  products: {
    name: string;
    unit: string;
    image_url: string;
    users?: {
      farm_name?: string;
      farm_location?: string;
    };
  };
}

interface OrderData {
  id: string;
  order_reference: string;
  status: "pending" | "confirmed" | "in_transit" | "delivered" | "cancelled";
  total_amount: number;
  transit_fee: number;
  delivery_address: string;
  delivery_phone: string;
  created_at: string;
  users?: {
    full_name?: string;
    email?: string;
    phone?: string;
  };
  order_items: OrderItem[];
}

export default function OrderDetailsPage({
  params,
}: {
  params: Promise<{ reference: string }>;
}) {
  const { reference } = use(params);

  const [order, setOrder] = useState<OrderData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationSuccess, setVerificationSuccess] = useState(false);
  const [paymentDetails, setPaymentDetails] = useState<{
    channel?: string;
    paidAt?: string;
    amountPaid?: number;
  } | null>(null);
  const [reviewingProduct, setReviewingProduct] = useState<{
    productId: string;
    productName: string;
    farmerName?: string;
  } | null>(null);
  const [reviewedProductIds, setReviewedProductIds] = useState<string[]>([]);
  const [dispute, setDispute] = useState<DisputeData | null>(null);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);

  // Load and verify order on mount
  useEffect(() => {
    async function fetchAndVerify() {
      setIsLoading(true);
      try {
        // 1. Call verification endpoint
        const verifyRes = await fetch(`/api/payments/verify/${encodeURIComponent(reference)}`);
        const verifyData = await verifyRes.json();

        if (verifyRes.ok && verifyData.success && verifyData.verified) {
          setVerificationSuccess(true);
          setPaymentDetails({
            channel: verifyData.channel,
            paidAt: verifyData.paidAt,
            amountPaid: verifyData.amountPaid,
          });
          if (verifyData.order) {
            setOrder(verifyData.order);
          }
        } else {
          // If verify didn't resolve, fetch order status
          const statusRes = await fetch(`/api/orders/${encodeURIComponent(reference)}/status`);
          if (statusRes.ok) {
            const statusData = await statusRes.json();
            if (statusData.order) {
              setOrder(statusData.order);
            }
          }
        }
      } catch (err) {
        console.warn("Order fetch notice:", err);
      } finally {
        setIsLoading(false);
      }

      // 2. Fetch existing dispute status for this order
      try {
        const dispRes = await fetch(`/api/disputes?orderReference=${encodeURIComponent(reference)}`);
        if (dispRes.ok) {
          const dispData = await dispRes.json();
          if (dispData.hasDispute && dispData.dispute) {
            setDispute(dispData.dispute);
          }
        }
      } catch (err) {
        console.warn("Dispute fetch notice:", err);
      }
    }

    if (reference) {
      fetchAndVerify();
    }
  }, [reference]);

  const handleInstantDummyPayment = async () => {
    setIsVerifying(true);
    try {
      const res = await fetch(`/api/payments/verify/${encodeURIComponent(reference)}`);
      const data = await res.json();
      if (res.ok && data.success) {
        setVerificationSuccess(true);
        setPaymentDetails({
          channel: data.channel || "Simulated Card",
          paidAt: data.paidAt || new Date().toISOString(),
          amountPaid: data.amountPaid || order?.total_amount,
        });
        if (data.order) {
          setOrder(data.order);
        } else if (order) {
          setOrder({ ...order, status: "confirmed" });
        }
      } else {
        throw new Error(data.message || "Simulated payment verification failed");
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error verifying dummy payment";
      alert(msg);
    } finally {
      setIsVerifying(false);
    }
  };

  const handleUpdateStatus = async (newStatus: "in_transit" | "delivered") => {
    if (!order) return;
    try {
      const res = await fetch(`/api/orders/${encodeURIComponent(order.id || reference)}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setOrder((prev) => (prev ? { ...prev, status: newStatus } : null));
      } else {
        alert(data.error || "Failed to update status");
      }
    } catch (err) {
      console.warn("Status update error:", err);
    }
  };

  const handleTriggerPaystack = async () => {
    setIsVerifying(true);
    try {
      const res = await fetch("/api/payments/initialize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          order_reference: reference,
          email: order?.users?.email || "buyer@farm2door.ng",
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Initialization failed");

      if (data.authorizationUrl) {
        window.location.href = data.authorizationUrl;
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error initiating payment";
      alert(msg);
      setIsVerifying(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#FAF8F2] flex items-center justify-center p-6">
        <div className="flex items-center space-x-3 text-[#0D2E1C]">
          <svg className="animate-spin h-6 w-6 text-[#6A9B48]" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
          <span className="font-semibold text-sm">Verifying Paystack Settlement with Supabase...</span>
        </div>
      </div>
    );
  }

  const isPaid = order?.status === "confirmed" || order?.status === "in_transit" || order?.status === "delivered" || verificationSuccess;

  return (
    <div className="min-h-screen bg-[#FAF8F2] text-[#0D2E1C]">
      {/* Top Header */}
      <header className="bg-[#0D2E1C] text-white px-6 py-4 border-b border-[#1B3B22]">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Link
              href="/"
              className="text-[#CFE73B] text-xs font-bold uppercase tracking-wider hover:underline flex items-center gap-1"
            >
              &larr; Public Marketplace
            </Link>
            <span className="text-white/30">•</span>
            <span className="text-xs text-white/80 font-medium">Order Receipt & Tracking</span>
          </div>

          <div className="flex items-center space-x-3">
            <button
              onClick={() => window.print()}
              className="text-xs bg-[#CFE73B] text-[#0D2E1C] font-bold px-3 py-1.5 rounded-lg hover:bg-[#b5ba3e] transition-colors cursor-pointer flex items-center gap-1.5 no-print"
            >
              <span>🖨️</span>
              <span>Print Invoice</span>
            </button>
            <div className="text-xs text-[#FAF8F2] font-semibold bg-[#1B3B22] px-3 py-1.5 rounded-lg border border-[#2B5436] hidden sm:inline-block">
              🔒 Paystack Verified Escrow
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-8 print:p-0 print:max-w-full">
        {/* Printable Official Invoice Header (Visible on print) */}
        <div className="hidden print:block border-b-2 border-[#0D2E1C] pb-6 mb-6">
          <div className="flex justify-between items-start">
            <div>
              <div className="text-2xl font-black tracking-tight text-[#0D2E1C]">FARM2DOOR</div>
              <div className="text-xs font-semibold text-[#4F6A52]">Fresh Farm-to-Door Agrarian Commerce Network</div>
              <div className="text-[11px] text-[#4F6A52] mt-1">Ekiti State Commercial Corridor, Nigeria • support@farm2door.ng</div>
            </div>
            <div className="text-right">
              <div className="text-xs font-mono font-bold text-[#0D2E1C]">OFFICIAL SETTLEMENT INVOICE</div>
              <div className="text-sm font-mono font-black text-[#0D2E1C] mt-0.5">REF: {reference}</div>
              <div className="text-[11px] text-[#4F6A52] mt-1">
                Date: {order?.created_at ? new Date(order.created_at).toLocaleDateString("en-NG", { day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" }) : new Date().toLocaleDateString()}
              </div>
            </div>
          </div>
        </div>

        {/* Status Confirmation Banner */}
        <div className={`p-6 sm:p-8 rounded-3xl border mb-8 text-center shadow-xs ${
          isPaid
            ? "bg-[#EBF3E8] border-[#CDE1C8]"
            : "bg-[#FFFDF9] border-[#E5DBC7]"
        }`}>
          <div className="w-14 h-14 rounded-full bg-[#0D2E1C] text-[#CFE73B] text-2xl font-black flex items-center justify-center mx-auto mb-3">
            {isPaid ? "✓" : "💳"}
          </div>

          <div className="inline-block px-3 py-1 rounded-full text-xs font-mono font-bold bg-[#0D2E1C] text-[#CFE73B] mb-2">
            REF: {reference}
          </div>

          <h1 className="text-2xl sm:text-3xl font-black text-[#0D2E1C]">
            {isPaid ? "Payment Verified & Escrow Guaranteed" : "Awaiting Paystack Payment"}
          </h1>

          <p className="text-xs sm:text-sm text-[#4F6A52] max-w-lg mx-auto mt-1">
            {isPaid
              ? "Your funds have been received and deposited into Paystack Escrow. The farmer has been notified to harvest and prepare your produce for dispatch."
              : "Complete payment to secure your harvest reservation. Produce stock is currently reserved under ACID concurrency locks."}
          </p>

          {!isPaid && (
            <div className="mt-5 flex flex-col sm:flex-row items-center justify-center gap-3">
              <button
                onClick={handleInstantDummyPayment}
                disabled={isVerifying}
                className="px-6 py-3.5 bg-[#166534] hover:bg-[#14532D] text-white text-xs font-bold uppercase tracking-wider rounded-xl transition-all shadow-sm cursor-pointer disabled:opacity-50 flex items-center space-x-2"
              >
                <span>⚡ Instant Dummy Payment (Simulate ₦{order?.total_amount ? Number(order.total_amount).toLocaleString() : ""} Approval)</span>
              </button>
              <button
                onClick={handleTriggerPaystack}
                disabled={isVerifying}
                className="px-6 py-3.5 bg-[#0D2E1C] hover:bg-[#1B3B22] text-[#CFE73B] text-xs font-bold uppercase tracking-wider rounded-xl transition-all shadow-sm cursor-pointer disabled:opacity-50"
              >
                {isVerifying ? "Redirecting..." : "💳 Pay via Paystack Modal"}
              </button>
            </div>
          )}
          {/* Dispute Status Banner if Active / Resolved */}
          {dispute && (
            <div className="mt-6 p-4 rounded-2xl bg-[#FFFDF9] border border-[#E5DBC7] shadow-xs space-y-2.5 text-left">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center space-x-2">
                  <span className="text-base">⚠️</span>
                  <span className="text-xs font-black uppercase tracking-wider text-[#0D2E1C]">
                    Escrow Dispute #{dispute.id}
                  </span>
                  <span className="text-[11px] text-[#4F6A52]">
                    ({dispute.cropName})
                  </span>
                </div>
                <span
                  className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                    dispute.status === "open"
                      ? "bg-amber-100 text-amber-900 border border-amber-300"
                      : dispute.status === "investigating"
                      ? "bg-blue-100 text-blue-900 border border-blue-300"
                      : dispute.status === "refunded"
                      ? "bg-purple-100 text-purple-900 border border-purple-300"
                      : "bg-emerald-100 text-emerald-900 border border-emerald-300"
                  }`}
                >
                  Status: {dispute.status}
                </span>
              </div>
              <p className="text-xs text-[#4F6A52] leading-relaxed">
                <strong className="text-[#0D2E1C]">Issue Reported:</strong> {dispute.description}
              </p>
              {dispute.resolutionNotes && (
                <div className="p-3 bg-[#FAF8F2] rounded-xl border border-[#E5DBC7] text-xs space-y-1">
                  <div className="font-bold text-[#0D2E1C]">🏛️ Platform Admin Resolution:</div>
                  <div className="text-[#4F6A52]">{dispute.resolutionNotes}</div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* 3-Step Dispatch Fulfillment Tracker */}
        <div className="bg-white rounded-2xl border border-[#E5DBC7] p-6 mb-8 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#4F6A52]">
              Transit & Fulfillment Lifecycle
            </h3>
            {isPaid && (
              <span className="text-[10px] px-2.5 py-0.5 rounded-full font-bold bg-[#DCFCE7] text-[#166534] border border-[#BBF7D0]">
                ✓ Escrow Funded
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
            {/* Step 1 */}
            <div className={`p-4 rounded-xl border flex items-center space-x-3 ${
              isPaid
                ? "bg-[#EBF3E8] border-[#CDE1C8] text-[#166534]"
                : "bg-[#FAF8F2] border-[#E5DBC7] text-[#4F6A52]"
            }`}>
              <span className="text-lg">✓</span>
              <div>
                <span className="text-xs font-bold block">1. Payment Escrowed</span>
                <span className="text-[10px]">{isPaid ? "Simulated / Paystack Approval" : "Awaiting settlement"}</span>
              </div>
            </div>

            {/* Step 2 */}
            <div className={`p-4 rounded-xl border flex items-center space-x-3 ${
              order?.status === "in_transit" || order?.status === "delivered"
                ? "bg-[#DBEAFE] border-[#BFDBFE] text-[#1E40AF]"
                : "bg-[#FAF8F2] border-[#E5DBC7] text-[#4F6A52]"
            }`}>
              <span className="text-lg">🚚</span>
              <div>
                <span className="text-xs font-bold block">2. In Transit (Dispatched)</span>
                <span className="text-[10px]">{order?.status === "in_transit" || order?.status === "delivered" ? "En route from Ekiti farm" : "Pending farmer dispatch"}</span>
              </div>
            </div>

            {/* Step 3 */}
            <div className={`p-4 rounded-xl border flex items-center space-x-3 ${
              order?.status === "delivered"
                ? "bg-[#DCFCE7] border-[#BBF7D0] text-[#166534]"
                : "bg-[#FAF8F2] border-[#E5DBC7] text-[#4F6A52]"
            }`}>
              <span className="text-lg">📦</span>
              <div>
                <span className="text-xs font-bold block">3. Delivered & Settled</span>
                <span className="text-[10px]">{order?.status === "delivered" ? "Doorstep confirmed & reviewed" : "Awaiting delivery"}</span>
              </div>
            </div>
          </div>

          {/* Demonstration Simulation Controls */}
          {isPaid && (
            <div className="pt-4 border-t border-[#E5DBC7] flex flex-wrap items-center justify-between gap-3 bg-[#FAF8F2] p-3 rounded-xl">
              <div className="text-xs">
                <span className="font-bold text-[#0D2E1C] block">Academic Demonstration Lifecycle Controls:</span>
                <span className="text-[11px] text-[#4F6A52]">Advance this order through fulfillment stages:</span>
              </div>

              <div className="flex items-center gap-2">
                {order?.status === "confirmed" && (
                  <button
                    type="button"
                    onClick={() => handleUpdateStatus("in_transit")}
                    className="px-3 py-1.5 bg-[#1E40AF] hover:bg-[#1E3A8A] text-white text-xs font-bold rounded-lg cursor-pointer transition-colors"
                  >
                    🚚 Simulate Farmer Dispatch (In Transit)
                  </button>
                )}

                {(order?.status === "confirmed" || order?.status === "in_transit") && (
                  <button
                    type="button"
                    onClick={() => handleUpdateStatus("delivered")}
                    className="px-3 py-1.5 bg-[#166534] hover:bg-[#14532D] text-white text-xs font-bold rounded-lg cursor-pointer transition-colors"
                  >
                    📦 Simulate Delivery (Doorstep Received)
                  </button>
                )}

                {order?.status === "delivered" && (
                  <span className="text-xs font-bold text-[#166534] bg-[#DCFCE7] px-3 py-1.5 rounded-lg border border-[#BBF7D0]">
                    🎉 Order Delivered! Verified Review Eligible (PRD Module 5)
                  </span>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Order Details & Line Items */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 mb-8">
          {/* Produce Items (7 cols) */}
          <div className="md:col-span-7 bg-white rounded-2xl border border-[#E5DBC7] p-5 sm:p-6 shadow-xs space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#4F6A52]">
              Harvest Produce Ordered
            </h3>

            <div className="divide-y divide-[#E5DBC7]">
              {order?.order_items?.map((item) => (
                <div key={item.id} className="py-3 flex items-center justify-between gap-3">
                  <div className="flex items-center space-x-3">
                    <div className="relative w-12 h-12 rounded-xl bg-[#F2ECE0] overflow-hidden shrink-0 border border-[#E5DBC7]">
                      <Image
                        src={item.products?.image_url || "/images/produce/yam-tubers.jpg"}
                        alt={item.products?.name || "Produce"}
                        fill
                        className="object-cover"
                        sizes="48px"
                      />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-[#0D2E1C]">{item.products?.name}</h4>
                      <p className="text-[11px] text-[#4F6A52]">
                        {item.quantity} {item.products?.unit} × ₦{Number(item.unit_price).toLocaleString()}
                      </p>
                      {item.products?.users?.farm_name && (
                        <p className="text-[10px] text-[#6A9B48]">
                          🚜 {item.products.users.farm_name} ({item.products.users.farm_location})
                        </p>
                      )}
                    </div>
                  </div>

                    <div className="flex flex-col items-end gap-1.5 shrink-0">
                      <span className="text-xs font-black text-[#0D2E1C]">
                        ₦{Number(item.subtotal).toLocaleString()}
                      </span>

                      {order?.status === "delivered" &&
                        (reviewedProductIds.includes(item.product_id) ? (
                          <span className="text-[10px] font-bold text-[#166534] bg-[#DCFCE7] px-2 py-0.5 rounded-full border border-[#BBF7D0]">
                            ✓ Reviewed ★
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={() =>
                              setReviewingProduct({
                                productId: item.product_id,
                                productName: item.products?.name || "Produce Item",
                                farmerName: item.products?.users?.farm_name,
                              })
                            }
                            className="px-2.5 py-1 bg-[#0D2E1C] hover:bg-[#1B3B22] text-[#CFE73B] text-[10px] font-bold rounded-lg cursor-pointer transition-colors shadow-xs flex items-center space-x-1"
                          >
                            <span>⭐ Rate Harvest</span>
                          </button>
                        ))}
                    </div>
                  </div>
                ))}
            </div>

            <div className="pt-3 border-t border-[#E5DBC7] space-y-1.5 text-xs">
              <div className="flex justify-between text-[#4F6A52]">
                <span>Flat Intra-Ekiti Transit Fee:</span>
                <span className="font-semibold text-[#0D2E1C]">
                  ₦{order?.transit_fee ? Number(order.transit_fee).toLocaleString() : "1,500"}
                </span>
              </div>
              <div className="pt-2 border-t border-[#E5DBC7] flex justify-between font-black text-sm text-[#0D2E1C]">
                <span>Total Paid:</span>
                <span className="text-base text-[#0D2E1C]">
                  ₦{order?.total_amount ? Number(order.total_amount).toLocaleString() : ""}
                </span>
              </div>
            </div>
          </div>

          {/* Delivery & Audit Ledger (5 cols) */}
          <div className="md:col-span-5 space-y-6">
            <div className="bg-white rounded-2xl border border-[#E5DBC7] p-5 shadow-xs space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#4F6A52]">
                Delivery Destination
              </h3>
              <div className="p-3.5 bg-[#FAF8F2] rounded-xl border border-[#E5DBC7] text-xs space-y-1">
                <div className="font-bold text-[#0D2E1C]">{order?.users?.full_name || "Verified Buyer"}</div>
                <div className="text-[#4F6A52]">{order?.delivery_phone}</div>
                <div className="text-[#0D2E1C] font-medium mt-1">{order?.delivery_address}</div>
              </div>
            </div>

            {/* Financial Ledger Audit Card */}
            <div className="bg-white rounded-2xl border border-[#E5DBC7] p-5 shadow-xs space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#4F6A52]">
                Financial Ledger Record
              </h3>
              <div className="space-y-2 text-xs font-mono">
                <div className="flex justify-between text-[11px]">
                  <span className="text-[#4F6A52]">Gateway:</span>
                  <span className="font-bold text-[#0D2E1C]">Paystack Checkout</span>
                </div>
                <div className="flex justify-between text-[11px]">
                  <span className="text-[#4F6A52]">Channel:</span>
                  <span className="capitalize text-[#0D2E1C]">{paymentDetails?.channel || "Card / Transfer"}</span>
                </div>
                <div className="flex justify-between text-[11px]">
                  <span className="text-[#4F6A52]">Ledger Status:</span>
                  <span className="font-bold text-[#166534]">successful</span>
                </div>
                <div className="flex justify-between text-[11px]">
                  <span className="text-[#4F6A52]">Settlement:</span>
                  <span className="text-[#0D2E1C]">Escrow Protected</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Back & Dispute Action */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 no-print">
          <Link
            href="/"
            className="w-full sm:w-auto px-6 py-3 bg-[#0D2E1C] hover:bg-[#1B3B22] text-[#CFE73B] text-xs font-bold rounded-xl transition-colors text-center"
          >
            &larr; Return to Marketplace
          </Link>

          <button
            onClick={() => window.print()}
            className="w-full sm:w-auto px-6 py-3 bg-[#0D2E1C] hover:bg-[#1B3B22] text-[#FAF8F2] text-xs font-bold rounded-xl transition-colors flex items-center justify-center space-x-1.5 cursor-pointer shadow-xs"
          >
            <span>🖨️</span>
            <span>Print / Save PDF Receipt</span>
          </button>

          {(!dispute || dispute.status === "resolved") && isPaid && (
            <button
              onClick={() => setIsReportModalOpen(true)}
              className="w-full sm:w-auto px-6 py-3 bg-white hover:bg-[#F2ECE0] border border-[#E5DBC7] text-[#0D2E1C] text-xs font-bold rounded-xl transition-colors flex items-center justify-center space-x-1.5 cursor-pointer shadow-xs"
            >
              <span>⚠️</span>
              <span>Report Quality / Transit Problem</span>
            </button>
          )}
        </div>

        {/* Printable Official Invoice Footer (Visible on print) */}
        <div className="hidden print:block mt-8 pt-6 border-t-2 border-[#0D2E1C] text-xs text-[#4F6A52] space-y-2">
          <div className="flex justify-between items-center">
            <div>
              <span className="font-bold text-[#0D2E1C]">Quality & Traceability Seal:</span> Direct farm-gate procurement from certified Ekiti smallholder cooperatives.
            </div>
            <div className="font-mono text-[10px] font-bold text-[#166534] border border-[#166534] px-2.5 py-1 rounded">
              ✓ 100% PAYSTACK ESCROW GUARANTEE
            </div>
          </div>
          <div className="text-[10px] text-[#6E7E74]">
            This document serves as an official commercial invoice and delivery receipt for fresh agricultural commodities. Intra-Ekiti transit handled under direct cooperative logistics.
          </div>
        </div>

        {/* Print Stylesheet */}
        <style dangerouslySetInnerHTML={{ __html: `
          @media print {
            .no-print, header, nav {
              display: none !important;
            }
            body, main {
              background: white !important;
              color: #0D2E1C !important;
              padding: 0 !important;
              margin: 0 !important;
              max-width: 100% !important;
            }
            .shadow-xs, .shadow-sm, .shadow-md, .shadow-lg {
              box-shadow: none !important;
            }
          }
        `}} />
      </main>

      {/* Review Modal */}
      {reviewingProduct && (
        <ReviewModal
          isOpen={Boolean(reviewingProduct)}
          onClose={() => setReviewingProduct(null)}
          productId={reviewingProduct.productId}
          productName={reviewingProduct.productName}
          orderReference={reference}
          farmerName={reviewingProduct.farmerName}
          onReviewSubmitted={(newRev) => {
            setReviewedProductIds((prev) => [...prev, reviewingProduct.productId]);
          }}
        />
      )}

      {/* Dispute Modal */}
      <ReportIssueModal
        isOpen={isReportModalOpen}
        onClose={() => setIsReportModalOpen(false)}
        orderReference={reference}
        orderItems={order?.order_items.map((i) => ({
          name: i.products?.name || "Produce Item",
          farmerName: i.products?.users?.farm_name,
        }))}
        buyerName={order?.users?.full_name || "Verified Buyer"}
        onDisputeSubmitted={(newDispute) => {
          setDispute(newDispute as DisputeData);
        }}
      />
    </div>
  );
}
