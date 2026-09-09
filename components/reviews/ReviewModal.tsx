"use client";

import React, { useState } from "react";
import { useAuth } from "@/lib/auth-context";

interface ReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  productId: string;
  productName: string;
  orderReference: string;
  farmerName?: string;
  onReviewSubmitted?: (newReview: any) => void;
}

const RATING_LABELS: Record<number, string> = {
  1: "1 Star — Poor Quality",
  2: "2 Stars — Fair Quality",
  3: "3 Stars — Good Harvest",
  4: "4 Stars — Very Good Quality",
  5: "5 Stars — Exceptional Harvest & Freshness",
};

export default function ReviewModal({
  isOpen,
  onClose,
  productId,
  productName,
  orderReference,
  farmerName,
  onReviewSubmitted,
}: ReviewModalProps) {
  const { user } = useAuth();

  const [rating, setRating] = useState<number>(5);
  const [hoverRating, setHoverRating] = useState<number | null>(null);
  const [comment, setComment] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);

  if (!isOpen) return null;

  const handleClose = () => {
    setErrorMessage(null);
    setIsSuccess(false);
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (comment.trim().length < 5) {
      setErrorMessage("Please write a comment of at least 5 characters.");
      return;
    }

    setIsSubmitting(true);

    try {
      const res = await fetch("/api/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          product_id: productId,
          order_reference: orderReference,
          rating,
          comment: comment.trim(),
          buyer_name: user?.full_name || "Verified Ekiti Buyer",
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to submit review.");
      }

      setIsSuccess(true);
      if (onReviewSubmitted && data.review) {
        onReviewSubmitted(data.review);
      }

      setTimeout(() => {
        handleClose();
      }, 1800);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error submitting review";
      setErrorMessage(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const activeRating = hoverRating !== null ? hoverRating : rating;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl border border-[#E5DBC7] max-w-lg w-full p-6 sm:p-7 shadow-2xl text-[#0D2E1C] animate-fade-in my-8">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-[#E5DBC7] mb-5">
          <div className="flex items-center space-x-2.5">
            <span className="text-2xl">⭐</span>
            <div>
              <h2 className="text-base sm:text-lg font-black text-[#0D2E1C]">
                Rate & Review Harvest
              </h2>
              <span className="text-[11px] text-[#4F6A52] font-semibold">
                PRD Module 5: Verified Buyer Quality Feedback
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

        {isSuccess ? (
          <div className="p-6 text-center space-y-3 bg-[#EBF3E8] border border-[#CDE1C8] rounded-2xl animate-fade-in">
            <span className="text-4xl block">🎉</span>
            <h3 className="text-base font-black text-[#166534]">Verified Review Published!</h3>
            <p className="text-xs text-[#2B5436] max-w-sm mx-auto">
              Thank you for supporting Ekiti smallholder agriculture. Your rating has been added to the public reputation score for <strong>{productName}</strong>.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Product & Order Context */}
            <div className="bg-[#FAF8F2] p-4 rounded-xl border border-[#E5DBC7] space-y-1.5 text-xs">
              <div className="flex items-center justify-between">
                <strong className="text-sm font-black text-[#0D2E1C]">{productName}</strong>
                <span className="px-2 py-0.5 bg-[#DCFCE7] text-[#166534] font-bold rounded-full text-[10px] border border-[#BBF7D0]">
                  ✓ Verified Delivery
                </span>
              </div>
              {farmerName && (
                <p className="text-[11px] text-[#4F6A52]">
                  Cultivated by: <span className="font-semibold text-[#0D2E1C]">{farmerName}</span>
                </p>
              )}
              <div className="text-[10px] font-mono text-[#4F6A52]">
                Order REF: {orderReference}
              </div>
            </div>

            {/* Star Rating Picker */}
            <div className="text-center space-y-2 py-2">
              <label className="block text-xs font-bold text-[#4F6A52] uppercase tracking-wider">
                Overall Quality & Harvest Freshness
              </label>

              <div className="flex items-center justify-center space-x-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setRating(star)}
                    onMouseEnter={() => setHoverRating(star)}
                    onMouseLeave={() => setHoverRating(null)}
                    className="text-3xl sm:text-4xl cursor-pointer transition-transform hover:scale-115 focus:outline-none"
                  >
                    <span className={star <= activeRating ? "text-[#EAB308]" : "text-gray-300"}>
                      ★
                    </span>
                  </button>
                ))}
              </div>

              <span className="inline-block text-xs font-bold text-[#0D2E1C] bg-[#FAF8F2] px-3 py-1 rounded-full border border-[#E5DBC7]">
                {RATING_LABELS[activeRating]}
              </span>
            </div>

            {/* Error Message */}
            {errorMessage && (
              <div className="p-3 bg-[#FDE8E8] border border-[#F8B4B4] rounded-xl text-xs text-[#9B1C1C]">
                ⚠️ {errorMessage}
              </div>
            )}

            {/* Feedback Comment */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-[11px] font-semibold text-[#4F6A52]">
                  Share Your Genuine Feedback <span className="text-red-500">*</span>
                </label>
                <span className="text-[10px] text-[#4F6A52]">{comment.length} / 500</span>
              </div>
              <textarea
                rows={3}
                maxLength={500}
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="How was the crop condition upon arrival? E.g., Yam tuber starchiness, pepper pungency, orange sweetness, or courier handling in Ekiti..."
                className="w-full px-3.5 py-2.5 bg-[#FAF8F2] border border-[#E5DBC7] rounded-xl text-xs font-medium text-[#0D2E1C] focus:outline-none focus:border-[#0D2E1C]"
                required
              />
            </div>

            {/* Actions */}
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
                disabled={isSubmitting || comment.trim().length < 5}
                className="px-6 py-2.5 bg-[#0D2E1C] hover:bg-[#1B3B22] text-[#CFE73B] text-xs font-bold rounded-xl transition-all shadow-sm flex items-center space-x-2 cursor-pointer disabled:opacity-50"
              >
                {isSubmitting ? (
                  <span>Verifying & Publishing...</span>
                ) : (
                  <span>Publish Verified Review</span>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
