"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useCart, PlacedOrder } from "@/lib/cart-context";
import { useAuth } from "@/lib/auth-context";

export default function CheckoutModal() {
  const {
    items,
    subtotal,
    transitFee,
    grandTotal,
    isCheckoutModalOpen,
    setIsCheckoutModalOpen,
    clearCart,
    setLastOrder,
  } = useCart();

  const { user } = useAuth();

  const [fullName, setFullName] = useState(user?.full_name || "");
  const [phone, setPhone] = useState(user?.phone || "");
  const [address, setAddress] = useState(user?.address || "");
  const [paymentChannel, setPaymentChannel] = useState<"card" | "bank_transfer" | "cash">("card");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [stockConflictError, setStockConflictError] = useState<string | null>(null);
  const [confirmedOrder, setConfirmedOrder] = useState<PlacedOrder | null>(null);
  const [isCopied, setIsCopied] = useState(false);

  if (!isCheckoutModalOpen) return null;

  const handleClose = () => {
    setIsCheckoutModalOpen(false);
    setStockConflictError(null);
    setConfirmedOrder(null);
  };

  const handleFillSampleAddress = () => {
    setFullName("Mrs. Folashade Adeleke");
    setPhone("08031234567");
    setAddress("No. 14 Oba Adebayo Way, GRA Extension, Ikere-Ekiti");
  };

  const handleSubmitCheckout = async (e: React.FormEvent) => {
    e.preventDefault();
    setStockConflictError(null);

    if (!address.trim()) {
      alert("Please provide a delivery address in Ekiti State.");
      return;
    }

    if (!phone.trim()) {
      alert("Please provide a contact phone number for transit.");
      return;
    }

    setIsSubmitting(true);

    try {
      // Execute dummy checkout with atomic PostgreSQL stock deduction
      const res = await fetch("/api/orders/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: items.map((i) => ({
            productId: i.productId,
            quantity: i.quantity,
            price: i.price,
            name: i.name,
            unit: i.unit,
            imageUrl: i.imageUrl,
            farmerId: (i as any).farmerId,
            farmName: i.farmerName,
            farmLocation: i.location,
          })),
          delivery_address: address.trim(),
          delivery_phone: phone.trim(),
          buyer_name: fullName.trim() || user?.full_name || "Ekiti Household Buyer",
          buyer_email: user?.email || "customer@farm2door.ng",
          transit_fee: transitFee,
          dummy_payment: true,
          payment_channel: paymentChannel,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        if (res.status === 409 || data.isStockConflict) {
          setStockConflictError(
            data.message || data.error || "ACID Concurrency Rollback: Item stock is no longer available."
          );
          return;
        }
        throw new Error(data.error || "Order placement failed");
      }

      // Success: create confirmed placed order record
      const newPlacedOrder: PlacedOrder = {
        orderId: data.orderId,
        orderReference: data.orderReference,
        totalAmount: data.totalAmount,
        deliveryAddress: data.deliveryAddress,
        deliveryPhone: data.deliveryPhone,
        items: [...items],
        status: data.status || "confirmed",
        isPaid: true,
        paymentChannel,
        createdAt: data.createdAt || new Date().toISOString(),
      };

      setConfirmedOrder(newPlacedOrder);
      setLastOrder(newPlacedOrder);
      clearCart();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error executing checkout";
      alert(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCopyRef = () => {
    if (!confirmedOrder) return;
    navigator.clipboard.writeText(confirmedOrder.orderReference);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl border border-[#E5DBC7] max-w-xl w-full p-6 sm:p-8 shadow-2xl text-[#0D2E1C] animate-fade-in my-8 max-h-[92vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-[#E5DBC7] mb-6">
          <div className="flex items-center space-x-2.5">
            <span className="text-2xl">⚡</span>
            <div>
              <h2 className="text-base sm:text-lg font-black text-[#0D2E1C]">
                {confirmedOrder ? "Order Placed & Payment Confirmed" : "Fast Dummy Checkout (Simulated Settlement)"}
              </h2>
              <span className="text-[11px] text-[#4F6A52] font-semibold">
                {confirmedOrder
                  ? "PostgreSQL row-level lock committed • Funds secured in simulated escrow"
                  : "PRD Modules 3 & 4: Instant Auto-Approved Payment & ACID Concurrency"}
              </span>
            </div>
          </div>

          <button
            onClick={handleClose}
            className="w-8 h-8 rounded-lg bg-[#FAF8F2] hover:bg-[#F2ECE0] text-[#4F6A52] flex items-center justify-center text-sm font-bold cursor-pointer transition-colors"
          >
            ✕
          </button>
        </div>

        {/* VIEW 1: CONCURRENCY CONFLICT ERROR ALERT */}
        {stockConflictError && (
          <div className="mb-6 p-4 rounded-xl bg-[#FDE8E8] border border-[#F8B4B4] text-[#9B1C1C] text-xs">
            <div className="flex items-start space-x-2.5">
              <span className="text-base">⚠️</span>
              <div>
                <strong className="block font-bold">ACID Transaction Rollback Executed:</strong>
                <p className="mt-0.5">{stockConflictError}</p>
                <p className="mt-1 text-[11px] text-[#771D1D]">
                  PostgreSQL successfully aborted the checkout transaction to prevent negative inventory.
                  Please adjust the quantity in your basket and try again.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* VIEW 2: CONFIRMED ORDER RECEIPT */}
        {confirmedOrder ? (
          <div className="space-y-6">
            <div className="bg-[#EBF3E8] border border-[#CDE1C8] rounded-2xl p-5 text-center">
              <span className="text-4xl block mb-2">🎉</span>
              <div className="inline-flex items-center space-x-2 px-3 py-1 bg-[#166534] text-[#FAF8F2] rounded-full text-xs font-mono font-bold mb-2">
                <span>REF: {confirmedOrder.orderReference}</span>
                <button
                  type="button"
                  onClick={handleCopyRef}
                  className="hover:text-[#CFE73B] cursor-pointer text-[10px] uppercase font-bold"
                >
                  {isCopied ? "✓ Copied" : "Copy"}
                </button>
              </div>
              <h3 className="text-lg font-black text-[#166534]">
                Payment Approved & Order Confirmed!
              </h3>
              <p className="text-xs text-[#2B5436] mt-1 max-w-md mx-auto">
                Crop inventory was atomically deducted in PostgreSQL (<code className="font-mono text-[11px] font-bold">FOR UPDATE</code>).
                Funds are held in simulated Paystack escrow awaiting buyer delivery confirmation.
              </p>
            </div>

            {/* Order Summary Details */}
            <div className="bg-[#FAF8F2] p-5 rounded-2xl border border-[#E5DBC7] space-y-3 text-xs">
              <div className="flex justify-between font-bold border-b border-[#E5DBC7] pb-2">
                <span>Total Amount Paid:</span>
                <span className="text-sm font-black text-[#0D2E1C]">
                  ₦{confirmedOrder.totalAmount.toLocaleString()}
                </span>
              </div>

              <div className="flex justify-between text-[#4F6A52]">
                <span>Payment Settlement:</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#DCFCE7] text-[#166534] border border-[#BBF7D0]">
                  ✓ Instant Simulated Approval ({confirmedOrder.paymentChannel === "card" ? "Dummy Debit Card" : confirmedOrder.paymentChannel === "bank_transfer" ? "Dummy Bank Transfer" : "Pay on Delivery"})
                </span>
              </div>

              <div className="flex justify-between text-[#4F6A52]">
                <span>Order Status:</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#E0E7FF] text-[#3730A3] border border-[#C7D2FE]">
                  Confirmed • In Farmer Dispatch Queue
                </span>
              </div>

              <div className="flex justify-between text-[#4F6A52]">
                <span>Delivery Destination:</span>
                <span className="font-semibold text-[#0D2E1C] text-right max-w-xs truncate">
                  {confirmedOrder.deliveryAddress}
                </span>
              </div>

              <div className="flex justify-between text-[#4F6A52]">
                <span>Contact Phone:</span>
                <span className="font-semibold text-[#0D2E1C]">{confirmedOrder.deliveryPhone}</span>
              </div>
            </div>

            {/* Next Steps Buttons */}
            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <Link
                href={`/orders/${encodeURIComponent(confirmedOrder.orderReference)}`}
                onClick={handleClose}
                className="flex-1 py-3 bg-[#0D2E1C] hover:bg-[#1B3B22] text-[#CFE73B] text-xs font-bold rounded-xl transition-colors text-center flex items-center justify-center space-x-2 shadow-xs"
              >
                <span>📦 Track Order Lifecycle</span>
              </Link>
              <Link
                href="/dashboard/farmer"
                onClick={handleClose}
                className="flex-1 py-3 bg-[#166534] hover:bg-[#14532D] text-white text-xs font-bold rounded-xl transition-colors text-center flex items-center justify-center space-x-2 shadow-xs"
              >
                <span>🚜 View In Farmer Portal</span>
              </Link>
            </div>
            <button
              type="button"
              onClick={handleClose}
              className="w-full py-2.5 bg-[#FAF8F2] hover:bg-[#F2ECE0] text-[#4F6A52] text-xs font-bold rounded-xl transition-colors cursor-pointer"
            >
              Continue Shopping
            </button>
          </div>
        ) : (
          /* VIEW 3: DUMMY CHECKOUT FORM */
          <form onSubmit={handleSubmitCheckout} className="space-y-5">
            {/* Quick-fill helper for instant sample address */}
            <div className="flex items-center justify-between p-3 bg-[#FAF8F2] border border-[#E5DBC7] rounded-xl text-xs">
              <span className="text-[11px] text-[#4F6A52] font-semibold">
                💡 Need a sample Ekiti delivery address? Fill in 1 click:
              </span>
              <button
                type="button"
                onClick={handleFillSampleAddress}
                className="px-2.5 py-1 bg-[#0D2E1C] text-[#CFE73B] text-[10px] font-bold rounded-lg hover:bg-[#1B3B22] cursor-pointer transition-colors"
              >
                Auto-Fill Sample
              </button>
            </div>

            {/* Delivery Details */}
            <div className="space-y-3.5">
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#4F6A52]">
                1. Ekiti Delivery Destination & Contact
              </h3>

              <div>
                <label className="block text-[11px] font-semibold text-[#4F6A52] mb-1">
                  Recipient Full Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="e.g. Mrs. Folashade Adeleke"
                  className="w-full px-3.5 py-2.5 bg-[#FAF8F2] border border-[#E5DBC7] rounded-xl text-xs font-semibold text-[#0D2E1C] focus:outline-none focus:border-[#0D2E1C]"
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-[#4F6A52] mb-1">
                    Contact Phone Number <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+234 803 123 4567"
                    className="w-full px-3.5 py-2.5 bg-[#FAF8F2] border border-[#E5DBC7] rounded-xl text-xs font-semibold text-[#0D2E1C] focus:outline-none focus:border-[#0D2E1C]"
                    required
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-[#4F6A52] mb-1">
                    Town / Local Government (Ekiti)
                  </label>
                  <select
                    className="w-full px-3.5 py-2.5 bg-[#FAF8F2] border border-[#E5DBC7] rounded-xl text-xs font-semibold text-[#0D2E1C] focus:outline-none focus:border-[#0D2E1C] cursor-pointer"
                    onChange={(e) => {
                      if (e.target.value && !address.includes(e.target.value)) {
                        setAddress((prev) => (prev ? `${prev}, ${e.target.value}` : e.target.value));
                      }
                    }}
                  >
                    <option value="">Select Ekiti Town...</option>
                    <option value="Ikere-Ekiti">Ikere-Ekiti Central</option>
                    <option value="Ado-Ekiti">Ado-Ekiti (State Capital)</option>
                    <option value="Igbemo-Ekiti">Igbemo-Ekiti (Rice Belt)</option>
                    <option value="Oye-Ekiti">Oye-Ekiti Central</option>
                    <option value="Ilawe-Ekiti">Ilawe-Ekiti (Banana Belt)</option>
                    <option value="Efon-Alaaye">Efon-Alaaye</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-[#4F6A52] mb-1">
                  Complete Street / Residential Address <span className="text-red-500">*</span>
                </label>
                <textarea
                  rows={2}
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="e.g. Plot 14, Federal Housing Estate, Afao Road, Ado-Ekiti"
                  className="w-full px-3.5 py-2.5 bg-[#FAF8F2] border border-[#E5DBC7] rounded-xl text-xs font-medium text-[#0D2E1C] focus:outline-none focus:border-[#0D2E1C]"
                  required
                />
              </div>
            </div>

            {/* PAYMENT METHOD SELECTOR (DUMMY IMPLEMENTATION) */}
            <div className="space-y-3 pt-2 border-t border-[#E5DBC7]">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase tracking-wider text-[#4F6A52]">
                  2. Payment Method (Simulated Settlement)
                </h3>
                <span className="text-[10px] px-2 py-0.5 bg-[#FEF08A] text-[#854D0E] font-bold rounded-full border border-[#FDE047]">
                  Instant Approval Mode
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                {/* Option 1: Card */}
                <button
                  type="button"
                  onClick={() => setPaymentChannel("card")}
                  className={`p-3 rounded-xl border text-left cursor-pointer transition-all ${
                    paymentChannel === "card"
                      ? "bg-[#0D2E1C] border-[#0D2E1C] text-[#FAF8F2]"
                      : "bg-[#FAF8F2] border-[#E5DBC7] text-[#0D2E1C] hover:bg-[#F2ECE0]"
                  }`}
                >
                  <span className="text-base block mb-1">💳</span>
                  <strong className="block text-xs font-bold">Simulated Card</strong>
                  <span className={`text-[10px] block mt-0.5 ${paymentChannel === "card" ? "text-[#CFE73B]" : "text-[#4F6A52]"}`}>
                    Instant Auto-Approved
                  </span>
                </button>

                {/* Option 2: Bank Transfer */}
                <button
                  type="button"
                  onClick={() => setPaymentChannel("bank_transfer")}
                  className={`p-3 rounded-xl border text-left cursor-pointer transition-all ${
                    paymentChannel === "bank_transfer"
                      ? "bg-[#0D2E1C] border-[#0D2E1C] text-[#FAF8F2]"
                      : "bg-[#FAF8F2] border-[#E5DBC7] text-[#0D2E1C] hover:bg-[#F2ECE0]"
                  }`}
                >
                  <span className="text-base block mb-1">🏦</span>
                  <strong className="block text-xs font-bold">Simulated Transfer</strong>
                  <span className={`text-[10px] block mt-0.5 ${paymentChannel === "bank_transfer" ? "text-[#CFE73B]" : "text-[#4F6A52]"}`}>
                    NIP Direct Verification
                  </span>
                </button>

                {/* Option 3: Pay on Delivery */}
                <button
                  type="button"
                  onClick={() => setPaymentChannel("cash")}
                  className={`p-3 rounded-xl border text-left cursor-pointer transition-all ${
                    paymentChannel === "cash"
                      ? "bg-[#0D2E1C] border-[#0D2E1C] text-[#FAF8F2]"
                      : "bg-[#FAF8F2] border-[#E5DBC7] text-[#0D2E1C] hover:bg-[#F2ECE0]"
                  }`}
                >
                  <span className="text-base block mb-1">🚚</span>
                  <strong className="block text-xs font-bold">Pay on Delivery</strong>
                  <span className={`text-[10px] block mt-0.5 ${paymentChannel === "cash" ? "text-[#CFE73B]" : "text-[#4F6A52]"}`}>
                    Ekiti Farm Escrow
                  </span>
                </button>
              </div>
            </div>

            {/* Financial Totals */}
            <div className="bg-[#FAF8F2] p-4 rounded-xl border border-[#E5DBC7] space-y-2 text-xs">
              <div className="flex justify-between text-[#4F6A52]">
                <span>Produce Items ({items.length}):</span>
                <span className="font-semibold text-[#0D2E1C]">₦{subtotal.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-[#4F6A52]">
                <span>Intra-Ekiti Transit Fee:</span>
                <span className="font-semibold text-[#0D2E1C]">₦{transitFee.toLocaleString()}</span>
              </div>
              <div className="pt-2 border-t border-[#E5DBC7] flex justify-between font-black text-sm text-[#0D2E1C]">
                <span>Total Amount to Settle:</span>
                <span className="text-base text-[#166534]">₦{grandTotal.toLocaleString()}</span>
              </div>
            </div>

            {/* ACID Security Note */}
            <div className="p-3 rounded-xl bg-[#FFFDF9] border border-[#E5DBC7] text-[11px] text-[#4F6A52] flex items-center space-x-2">
              <span className="text-sm">🛡️</span>
              <span>
                <strong>Zero Overselling Guarantee:</strong> PostgreSQL executes row-level locking (<code className="font-mono text-[#0D2E1C]">SELECT ... FOR UPDATE</code>) on each crop before payment is confirmed.
              </span>
            </div>

            {/* Submit Action */}
            <div className="flex items-center justify-end space-x-3 pt-2">
              <button
                type="button"
                onClick={handleClose}
                className="px-4 py-2.5 rounded-xl border border-[#E5DBC7] text-xs font-bold text-[#4F6A52] hover:bg-[#F2ECE0] cursor-pointer transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting || items.length === 0}
                className="px-6 py-3 bg-[#0D2E1C] hover:bg-[#1B3B22] text-[#CFE73B] text-xs font-bold rounded-xl transition-all shadow-sm flex items-center space-x-2 cursor-pointer disabled:opacity-50"
              >
                {isSubmitting ? (
                  <>
                    <svg className="animate-spin h-4 w-4 text-[#CFE73B]" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      />
                    </svg>
                    <span>Acquiring Concurrency Lock & Settle...</span>
                  </>
                ) : (
                  <span>⚡ Complete Checkout (₦{grandTotal.toLocaleString()})</span>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
