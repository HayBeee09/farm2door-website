"use client";

import React, { useState } from "react";

interface OrderItemOption {
  name: string;
  farmerName?: string;
}

interface ReportIssueModalProps {
  isOpen: boolean;
  onClose: () => void;
  orderReference: string;
  orderItems?: OrderItemOption[];
  buyerName?: string;
  onDisputeSubmitted?: (dispute: unknown) => void;
}

const ISSUE_TYPES = [
  {
    id: "perishable_decay",
    label: "🍂 Perishable Spoilage / Bruised Produce",
    desc: "Crop arrived spoiled, wilted, or bruised due to environmental exposure or transit.",
  },
  {
    id: "transit_delay",
    label: "⏱️ Severe Transit Delay (> 24 Hours)",
    desc: "Produce was not delivered within the guaranteed intra-Ekiti freshness window.",
  },
  {
    id: "wrong_packaging_unit",
    label: "📦 Wrong Unit / Short Weight",
    desc: "Delivered packaging unit (e.g. basket, tuber) differs from farm listing specifications.",
  },
  {
    id: "missing_item",
    label: "❓ Missing Item from Parcel",
    desc: "An item included in your order was not received upon delivery.",
  },
];

export default function ReportIssueModal({
  isOpen,
  onClose,
  orderReference,
  orderItems = [],
  buyerName = "Verified Buyer",
  onDisputeSubmitted,
}: ReportIssueModalProps) {
  const [selectedType, setSelectedType] = useState<string>("perishable_decay");
  const [selectedCrop, setSelectedCrop] = useState<string>(
    orderItems.length > 0 ? orderItems[0].name : "All Produce in Order"
  );
  const [description, setDescription] = useState("");
  const [preferredResolution, setPreferredResolution] = useState("replacement");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (description.trim().length < 10) {
      setErrorMsg("Please provide more detail about the issue (minimum 10 characters).");
      return;
    }

    const matchedItem = orderItems.find((item) => item.name === selectedCrop);
    const farmerName = matchedItem?.farmerName || "Ekiti Smallholder";

    setIsSubmitting(true);
    try {
      const fullDescription = `${description.trim()} [Requested Resolution: ${
        preferredResolution === "refund" ? "Full Escrow Refund" : "Morning Harvest Replacement"
      }]`;

      const res = await fetch("/api/disputes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderReference,
          type: selectedType,
          cropName: selectedCrop,
          farmerName,
          buyerName,
          description: fullDescription,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        setErrorMsg(data.error || "Failed to submit dispute. Please try again.");
        return;
      }

      if (onDisputeSubmitted) {
        onDisputeSubmitted(data.dispute);
      }
      onClose();
    } catch {
      setErrorMsg("Network error connecting to platform dispute service.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
      <div className="bg-[#FAF8F2] w-full max-w-lg rounded-3xl border border-[#E5DBC7] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="bg-[#0D2E1C] text-white px-6 py-4 flex items-center justify-between border-b border-[#1B3B22]">
          <div>
            <h2 className="text-sm font-black flex items-center gap-2">
              <span>⚠️</span>
              <span>Report Quality Issue / Request Refund</span>
            </h2>
            <p className="text-[11px] text-[#CFE73B] font-mono mt-0.5">Order #{orderReference}</p>
          </div>
          <button
            onClick={onClose}
            aria-label="Close modal"
            className="text-white/70 hover:text-white text-base p-1 cursor-pointer transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Modal Form */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-5 text-xs text-[#0D2E1C]">
          {/* Informational banner */}
          <div className="p-3 bg-[#FFFDF9] rounded-xl border border-[#E5DBC7] text-[#4F6A52] leading-relaxed">
            Your payment is held in escrow. Our administration team reviews all perishable produce reports and coordinates with the farmer for immediate morning replacements or full refunds.
          </div>

          {errorMsg && (
            <div className="p-3 bg-red-50 text-red-800 rounded-xl border border-red-200 font-semibold">
              {errorMsg}
            </div>
          )}

          {/* Issue Category */}
          <div className="space-y-2">
            <label className="font-bold text-[#0D2E1C] block">Select Issue Category:</label>
            <div className="grid grid-cols-1 gap-2">
              {ISSUE_TYPES.map((type) => (
                <label
                  key={type.id}
                  className={`p-3 rounded-xl border cursor-pointer flex flex-col transition-all ${
                    selectedType === type.id
                      ? "bg-[#F2ECE0] border-[#0D2E1C] ring-1 ring-[#0D2E1C]"
                      : "bg-white border-[#E5DBC7] hover:bg-[#FAF8F2]"
                  }`}
                >
                  <div className="flex items-center space-x-2">
                    <input
                      type="radio"
                      name="dispute_type"
                      checked={selectedType === type.id}
                      onChange={() => setSelectedType(type.id)}
                      className="accent-[#0D2E1C]"
                    />
                    <span className="font-bold text-[#0D2E1C]">{type.label}</span>
                  </div>
                  <span className="text-[10px] text-[#4F6A52] mt-1 pl-5">{type.desc}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Affected Crop */}
          {orderItems.length > 0 && (
            <div className="space-y-1.5">
              <label className="font-bold text-[#0D2E1C] block">Affected Produce Item:</label>
              <select
                value={selectedCrop}
                onChange={(e) => setSelectedCrop(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-white rounded-xl border border-[#E5DBC7] text-xs font-semibold text-[#0D2E1C] focus:outline-none focus:border-[#0D2E1C]"
              >
                <option value="Entire Order">Entire Order (All Items)</option>
                {orderItems.map((item, idx) => (
                  <option key={idx} value={item.name}>
                    {item.name} {item.farmerName ? `(${item.farmerName})` : ""}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Detailed Description */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="font-bold text-[#0D2E1C]">Detailed Description of Problem:</label>
              <span className="text-[10px] text-[#4F6A52] font-mono">{description.length} chars (min 10)</span>
            </div>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g. 2 bundles of ugwu arrived bruised and wilted from transit; packaging was damp upon delivery."
              required
              className="w-full px-3.5 py-2.5 bg-white rounded-xl border border-[#E5DBC7] text-xs text-[#0D2E1C] placeholder-[#4F6A52]/60 focus:outline-none focus:border-[#0D2E1C]"
            />
          </div>

          {/* Preferred Resolution */}
          <div className="space-y-1.5">
            <label className="font-bold text-[#0D2E1C] block">Preferred Resolution:</label>
            <div className="grid grid-cols-2 gap-3">
              <label
                className={`p-3 rounded-xl border cursor-pointer text-center flex flex-col items-center justify-center transition-all ${
                  preferredResolution === "replacement"
                    ? "bg-[#0D2E1C] text-[#CFE73B] border-[#0D2E1C]"
                    : "bg-white text-[#0D2E1C] border-[#E5DBC7] hover:bg-[#FAF8F2]"
                }`}
              >
                <input
                  type="radio"
                  name="resolution_pref"
                  value="replacement"
                  checked={preferredResolution === "replacement"}
                  onChange={() => setPreferredResolution("replacement")}
                  className="sr-only"
                />
                <span className="text-base mb-0.5">🔄</span>
                <span className="font-bold text-[11px]">Morning Replacement</span>
                <span className="text-[9px] opacity-80 mt-0.5">Fresh harvest resend</span>
              </label>

              <label
                className={`p-3 rounded-xl border cursor-pointer text-center flex flex-col items-center justify-center transition-all ${
                  preferredResolution === "refund"
                    ? "bg-[#0D2E1C] text-[#CFE73B] border-[#0D2E1C]"
                    : "bg-white text-[#0D2E1C] border-[#E5DBC7] hover:bg-[#FAF8F2]"
                }`}
              >
                <input
                  type="radio"
                  name="resolution_pref"
                  value="refund"
                  checked={preferredResolution === "refund"}
                  onChange={() => setPreferredResolution("refund")}
                  className="sr-only"
                />
                <span className="text-base mb-0.5">💰</span>
                <span className="font-bold text-[11px]">Escrow Refund</span>
                <span className="text-[9px] opacity-80 mt-0.5">Return to payment source</span>
              </label>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-end space-x-3 pt-3 border-t border-[#E5DBC7]">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold text-[#4F6A52] hover:text-[#0D2E1C] cursor-pointer transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2.5 bg-[#0D2E1C] hover:bg-[#1B3B22] text-[#CFE73B] text-xs font-black rounded-xl transition-colors shadow-xs flex items-center space-x-2 cursor-pointer disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <svg className="animate-spin h-3.5 w-3.5 text-[#CFE73B]" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <span>Submitting Ticket...</span>
                </>
              ) : (
                <span>Submit Dispute Ticket</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
