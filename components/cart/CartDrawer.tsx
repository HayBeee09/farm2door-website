"use client";

import React from "react";
import Image from "next/image";
import { useCart } from "@/lib/cart-context";

export default function CartDrawer() {
  const {
    items,
    totalCount,
    subtotal,
    transitFee,
    grandTotal,
    farmersCount,
    isCartOpen,
    setIsCartOpen,
    setIsCheckoutModalOpen,
    updateQuantity,
    removeFromCart,
    clearCart,
  } = useCart();

  if (!isCartOpen) return null;

  const handleProceedToCheckout = () => {
    setIsCartOpen(false);
    setIsCheckoutModalOpen(true);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div
        onClick={() => setIsCartOpen(false)}
        className="absolute inset-0 bg-black/60 backdrop-blur-xs transition-opacity animate-fade-in"
      />

      <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-md bg-[#FAF8F2] border-l border-[#E5DBC7] shadow-2xl flex flex-col text-[#0D2E1C] animate-slide-in">
          {/* Header */}
          <div className="p-5 bg-[#0D2E1C] text-white flex items-center justify-between border-b border-[#1B3B22]">
            <div className="flex items-center space-x-2.5">
              <span className="text-xl">🧺</span>
              <div>
                <h2 className="text-sm font-bold uppercase tracking-wider text-[#FAF8F2]">
                  Your Harvest Basket
                </h2>
                <span className="text-[11px] text-[#CFE73B] font-semibold">
                  {totalCount} item{totalCount === 1 ? "" : "s"} staged
                </span>
              </div>
            </div>

            <button
              onClick={() => setIsCartOpen(false)}
              className="w-8 h-8 rounded-lg bg-[#1B3B22] hover:bg-[#2B5436] text-white/80 hover:text-white flex items-center justify-center transition-colors cursor-pointer text-sm font-bold"
              aria-label="Close Basket"
            >
              ✕
            </button>
          </div>

          {/* Multi-Farmer Origin Banner */}
          {items.length > 0 && (
            <div className="bg-[#FFFDF9] px-5 py-2.5 border-b border-[#E5DBC7] flex items-center justify-between text-xs">
              <div className="flex items-center space-x-1.5 text-[#166534]">
                <span>🌱</span>
                <span className="font-bold">
                  Direct from {farmersCount} Ekiti Farm{farmersCount === 1 ? "" : "s"}
                </span>
              </div>
              <button
                onClick={clearCart}
                className="text-[11px] text-[#9B1C1C] hover:underline font-semibold cursor-pointer"
              >
                Clear All
              </button>
            </div>
          )}

          {/* Body: Items List */}
          <div className="flex-1 overflow-y-auto p-5 space-y-4">
            {items.length === 0 ? (
              <div className="py-16 text-center">
                <span className="text-5xl block mb-3">🧺</span>
                <h3 className="text-base font-bold text-[#0D2E1C]">Your basket is empty</h3>
                <p className="text-xs text-[#4F6A52] max-w-xs mx-auto mt-1 mb-6">
                  Select fresh produce harvested directly by local smallholders across Ekiti State.
                </p>
                <button
                  onClick={() => setIsCartOpen(false)}
                  className="px-6 py-2.5 bg-[#0D2E1C] hover:bg-[#1B3B22] text-[#FAF8F2] text-xs font-bold rounded-xl transition-colors cursor-pointer"
                >
                  Explore Fresh Produce
                </button>
              </div>
            ) : (
              items.map((item) => (
                <div
                  key={item.productId}
                  className="bg-white rounded-2xl border border-[#E5DBC7] p-3.5 shadow-xs flex items-start space-x-3"
                >
                  {/* Image Thumbnail */}
                  <div className="relative w-16 h-16 rounded-xl overflow-hidden bg-[#F2ECE0] shrink-0 border border-[#E5DBC7]">
                    <Image
                      src={item.imageUrl}
                      alt={item.name}
                      fill
                      className="object-cover"
                      sizes="64px"
                    />
                  </div>

                  {/* Details */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-1">
                      <h4 className="text-xs font-bold text-[#0D2E1C] leading-snug truncate">
                        {item.name}
                      </h4>
                      <button
                        onClick={() => removeFromCart(item.productId)}
                        className="text-xs text-[#4F6A52] hover:text-[#9B1C1C] p-0.5 cursor-pointer"
                        title="Remove"
                      >
                        ✕
                      </button>
                    </div>

                    <p className="text-[10px] text-[#4F6A52] mt-0.5">
                      🚜 {item.farmerName} • <span className="text-[#6A9B48]">{item.location}</span>
                    </p>

                    <div className="flex items-center justify-between mt-2.5 pt-2 border-t border-[#E5DBC7]">
                      <div>
                        <span className="text-xs font-black text-[#0D2E1C]">
                          ₦{(item.price * item.quantity).toLocaleString()}
                        </span>
                        <span className="text-[10px] text-[#4F6A52] block font-semibold">
                          ₦{item.price.toLocaleString()} / {item.unit}
                        </span>
                      </div>

                      {/* Stepper with stock protection */}
                      <div className="flex items-center space-x-1.5 bg-[#FAF8F2] border border-[#E5DBC7] rounded-lg p-1">
                        <button
                          type="button"
                          onClick={() => updateQuantity(item.productId, -1)}
                          className="w-5 h-5 rounded bg-white border border-[#E5DBC7] text-xs font-bold text-[#0D2E1C] hover:bg-[#F2ECE0] flex items-center justify-center cursor-pointer"
                        >
                          -
                        </button>
                        <span className="text-xs font-black text-[#0D2E1C] w-6 text-center">
                          {item.quantity}
                        </span>
                        <button
                          type="button"
                          onClick={() => updateQuantity(item.productId, 1)}
                          disabled={item.quantity >= item.stock}
                          className="w-5 h-5 rounded bg-white border border-[#E5DBC7] text-xs font-bold text-[#0D2E1C] hover:bg-[#F2ECE0] disabled:opacity-30 flex items-center justify-center cursor-pointer"
                          title={item.quantity >= item.stock ? "Max available stock reached" : "Add one"}
                        >
                          +
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Footer: Financials & Checkout CTA */}
          {items.length > 0 && (
            <div className="p-5 bg-white border-t border-[#E5DBC7] shadow-lg space-y-3">
              <div className="space-y-1.5 text-xs">
                <div className="flex justify-between text-[#4F6A52]">
                  <span>Produce Subtotal:</span>
                  <span className="font-semibold text-[#0D2E1C]">₦{subtotal.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-[#4F6A52]">
                  <span>Intra-Ekiti Transit Fee:</span>
                  <span className="font-semibold text-[#0D2E1C]">₦{transitFee.toLocaleString()}</span>
                </div>
                <div className="pt-2 border-t border-[#E5DBC7] flex justify-between items-baseline text-sm font-black text-[#0D2E1C]">
                  <span>Grand Total:</span>
                  <span className="text-lg text-[#0D2E1C]">₦{grandTotal.toLocaleString()}</span>
                </div>
              </div>

              <button
                type="button"
                onClick={handleProceedToCheckout}
                className="w-full py-3.5 bg-[#0D2E1C] hover:bg-[#1B3B22] text-[#CFE73B] text-xs font-bold uppercase tracking-wider rounded-xl transition-all shadow-sm flex items-center justify-center space-x-2 cursor-pointer"
              >
                <span>Proceed to Concurrency-Safe Checkout &rarr;</span>
              </button>

              <div className="flex items-center justify-center space-x-2 text-[10px] text-[#4F6A52] text-center pt-1">
                <span>🔒 Paystack Escrow Protected</span>
                <span>•</span>
                <span>ACID Concurrency Locking</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
