"use client";

import React, { useEffect, useState } from "react";
import Image from "next/image";

interface Review {
  id: string;
  buyerName: string;
  rating: number;
  comment: string;
  createdAt: string;
  isVerifiedPurchase: boolean;
  orderReference?: string;
}

interface RatingStats {
  averageRating: number;
  totalReviews: number;
  distribution: {
    5: number;
    4: number;
    3: number;
    2: number;
    1: number;
  };
}

interface ProductReviewsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  productId: string | null;
  productName?: string;
  productImage?: string;
  farmerName?: string;
  location?: string;
}

export default function ProductReviewsDrawer({
  isOpen,
  onClose,
  productId,
  productName,
  productImage,
  farmerName,
  location,
}: ProductReviewsDrawerProps) {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [stats, setStats] = useState<RatingStats>({
    averageRating: 5.0,
    totalReviews: 0,
    distribution: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 },
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!isOpen || !productId) return;

    async function fetchReviews() {
      setIsLoading(true);
      try {
        const res = await fetch(`/api/reviews?product_id=${encodeURIComponent(productId as string)}`);
        if (res.ok) {
          const data = await res.json();
          if (data.reviews) setReviews(data.reviews);
          if (data.stats) setStats(data.stats);
        }
      } catch (err) {
        console.warn("Reviews fetch error:", err);
      } finally {
        setIsLoading(false);
      }
    }

    fetchReviews();
  }, [isOpen, productId]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-black/60 backdrop-blur-xs flex justify-end">
      <div className="bg-[#FFFDF9] w-full max-w-md h-full shadow-2xl border-l border-[#E5DBC7] flex flex-col animate-slide-in-right text-[#0D2E1C]">
        {/* Header */}
        <div className="p-5 border-b border-[#E5DBC7] flex items-center justify-between bg-white shrink-0">
          <div className="flex items-center space-x-2.5">
            <span className="text-xl">⭐</span>
            <div>
              <h2 className="text-base font-black text-[#0D2E1C]">Verified Harvest Reviews</h2>
              <span className="text-[11px] text-[#4F6A52] font-semibold">
                PRD Module 5: Customer Ratings & Feedback
              </span>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-[#FAF8F2] hover:bg-[#F2ECE0] text-[#4F6A52] flex items-center justify-center text-sm font-bold cursor-pointer transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Product Context Card */}
        {productName && (
          <div className="p-4 bg-[#FAF8F2] border-b border-[#E5DBC7] flex items-center space-x-3 shrink-0">
            {productImage && (
              <div className="relative w-12 h-12 rounded-xl bg-white overflow-hidden shrink-0 border border-[#E5DBC7]">
                <Image
                  src={productImage}
                  alt={productName}
                  fill
                  className="object-cover"
                  sizes="48px"
                />
              </div>
            )}
            <div>
              <h3 className="text-xs font-bold text-[#0D2E1C]">{productName}</h3>
              {farmerName && (
                <p className="text-[11px] text-[#6A9B48] font-semibold">
                  🚜 {farmerName} {location ? `(${location})` : ""}
                </p>
              )}
            </div>
          </div>
        )}

        {/* Reviews List & Distribution (Scrollable) */}
        <div className="flex-1 overflow-y-auto p-5 space-y-6">
          {/* Summary Arithmetic Mean Card */}
          <div className="bg-white p-5 rounded-2xl border border-[#E5DBC7] shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-3xl font-black text-[#0D2E1C] block">
                  {stats.averageRating.toFixed(1)}
                </span>
                <div className="flex items-center text-[#EAB308] text-sm mt-0.5">
                  {"★".repeat(Math.round(stats.averageRating))}
                  {"☆".repeat(5 - Math.round(stats.averageRating))}
                </div>
                <span className="text-[11px] text-[#4F6A52] font-medium block mt-1">
                  Based on {stats.totalReviews} verified purchase{stats.totalReviews === 1 ? "" : "s"}
                </span>
              </div>

              {/* Star Distribution Bars */}
              <div className="space-y-1 w-44 text-[11px]">
                {[5, 4, 3, 2, 1].map((star) => {
                  const count = stats.distribution[star as 1 | 2 | 3 | 4 | 5] || 0;
                  const pct = stats.totalReviews > 0 ? (count / stats.totalReviews) * 100 : 0;
                  return (
                    <div key={star} className="flex items-center space-x-2">
                      <span className="w-3 text-right text-[#4F6A52] font-bold">{star}</span>
                      <span className="text-[#EAB308] text-[10px]">★</span>
                      <div className="flex-1 h-2 bg-[#FAF8F2] rounded-full overflow-hidden border border-[#E5DBC7]">
                        <div
                          className="h-full bg-[#166534] rounded-full"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <span className="w-4 text-right text-[10px] text-[#4F6A52]">{count}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Loading */}
          {isLoading ? (
            <div className="py-12 text-center text-xs text-[#4F6A52]">
              <svg className="animate-spin h-6 w-6 text-[#6A9B48] mx-auto mb-2" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
              <span>Loading verified reviews...</span>
            </div>
          ) : reviews.length === 0 ? (
            <div className="py-12 text-center text-xs text-[#4F6A52] bg-white rounded-2xl border border-[#E5DBC7] p-6">
              <span className="text-3xl block mb-2">🌿</span>
              <p className="font-bold text-[#0D2E1C]">No Reviews Yet</p>
              <p className="text-[11px] mt-1">
                Be the first to review this harvest after your order is delivered!
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <h4 className="text-xs font-bold uppercase tracking-wider text-[#4F6A52]">
                Customer Testimonials ({reviews.length})
              </h4>

              {reviews.map((rev) => (
                <div
                  key={rev.id}
                  className="bg-white p-4 rounded-2xl border border-[#E5DBC7] space-y-2 text-xs shadow-xs"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="font-bold text-[#0D2E1C] block">{rev.buyerName}</span>
                      <div className="flex items-center text-[#EAB308] text-xs mt-0.5">
                        {"★".repeat(rev.rating)}
                        {"☆".repeat(5 - rev.rating)}
                      </div>
                    </div>

                    <span className="px-2 py-0.5 bg-[#DCFCE7] text-[#166534] text-[10px] font-bold rounded-full border border-[#BBF7D0]">
                      ✓ Verified Buyer
                    </span>
                  </div>

                  <p className="text-xs text-[#2B5436] leading-relaxed">
                    "{rev.comment}"
                  </p>

                  <div className="pt-2 border-t border-[#FAF8F2] flex items-center justify-between text-[10px] text-[#4F6A52]">
                    <span>
                      {new Date(rev.createdAt).toLocaleDateString("en-NG", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </span>
                    {rev.orderReference && (
                      <span className="font-mono text-[9px] text-[#6A9B48]">
                        REF: {rev.orderReference}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-[#E5DBC7] bg-white text-center shrink-0">
          <button
            onClick={onClose}
            className="w-full py-2.5 bg-[#0D2E1C] hover:bg-[#1B3B22] text-[#CFE73B] text-xs font-bold rounded-xl transition-colors cursor-pointer"
          >
            Close Reviews
          </button>
        </div>
      </div>
    </div>
  );
}
