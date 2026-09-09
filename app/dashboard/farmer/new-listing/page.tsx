"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { useAuth } from "@/lib/auth-context";
import { ProduceUnit } from "@/lib/supabase/types";

const CATEGORIES = [
  { id: 1, name: "Tubers & Roots", icon: "🥔", desc: "Yam, Cassava, Sweet Potatoes" },
  { id: 2, name: "Vegetables", icon: "🥬", desc: "Ugwu, Waterleaf, Bitterleaf, Scent Leaf" },
  { id: 3, name: "Fruits", icon: "🍊", desc: "Oranges, Plantains, Pawpaw, Pineapples" },
  { id: 4, name: "Grains & Cereals", icon: "🌾", desc: "Igbemo Ofada Rice, Maize, Millet" },
  { id: 5, name: "Legumes & Beans", icon: "🫘", desc: "Honey Beans (Oloyin), Cowpeas, Soy" },
  { id: 6, name: "Peppers & Spices", icon: "🌶️", desc: "Scotch Bonnet (Rodo), Tatase, Shombo" },
];

const PACKAGING_UNITS: { unit: ProduceUnit; label: string; icon: string; example: string }[] = [
  { unit: "tuber", label: "Per Tuber", icon: "🥔", example: "Large White/Yellow Yam" },
  { unit: "basket", label: "Per Basket", icon: "🧺", example: "Peppers, Tomatoes, Garden Eggs" },
  { unit: "crate", label: "Per Crate", icon: "🍊", example: "Oranges, Citrus, Apples" },
  { unit: "bundle", label: "Per Bundle", icon: "🥬", example: "Ugwu, Waterleaf, Green Greens" },
  { unit: "50kg bag", label: "Per 50kg Bag", icon: "🌾", example: "Ofada Rice, Dry Grains, Beans" },
];

const PHOTO_PRESETS = [
  { name: "Ekiti White Yam", path: "/images/produce/yam-tubers.jpg", unit: "tuber" as ProduceUnit, catId: 1 },
  { name: "Scotch Bonnet (Rodo)", path: "/images/produce/scotch-bonnet.jpg", unit: "basket" as ProduceUnit, catId: 6 },
  { name: "Fluted Pumpkin (Ugwu)", path: "/images/produce/ugwu-leaves.jpg", unit: "bundle" as ProduceUnit, catId: 2 },
  { name: "Igbemo Ofada Rice", path: "/images/produce/ofada-rice.jpg", unit: "50kg bag" as ProduceUnit, catId: 4 },
  { name: "Valencia Oranges", path: "/images/produce/valencia-oranges.jpg", unit: "crate" as ProduceUnit, catId: 3 },
  { name: "Brown Honey Beans", path: "/images/produce/honey-beans.jpg", unit: "50kg bag" as ProduceUnit, catId: 5 },
  { name: "Crisp Waterleaf (Gbure)", path: "/images/produce/waterleaf.jpg", unit: "bundle" as ProduceUnit, catId: 2 },
  { name: "Red Sweet Peppers (Tatase)", path: "/images/produce/tatase-peppers.jpg", unit: "basket" as ProduceUnit, catId: 6 },
];

const HARVEST_PRESETS = [
  "Harvested 6:00 AM Today",
  "Picked Yesterday Afternoon",
  "Cut Fresh This Morning",
  "Milled Fresh This Week",
  "New Season Harvest",
];

export default function NewProduceListingPage() {
  const router = useRouter();
  const { user } = useAuth();

  const [name, setName] = useState("");
  const [categoryId, setCategoryId] = useState<number>(1);
  const [unit, setUnit] = useState<ProduceUnit>("tuber");
  const [price, setPrice] = useState("");
  const [stock, setStock] = useState("");
  const [harvestTime, setHarvestTime] = useState(HARVEST_PRESETS[0]);
  const [imageUrl, setImageUrl] = useState("/images/produce/yam-tubers.jpg");
  const [description, setDescription] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const selectedCategory = CATEGORIES.find((c) => c.id === categoryId) || CATEGORIES[0];

  const handleSelectPresetPhoto = (preset: (typeof PHOTO_PRESETS)[0]) => {
    setImageUrl(preset.path);
    if (!name) setName(preset.name);
    setUnit(preset.unit);
    setCategoryId(preset.catId);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage("");

    if (!name.trim()) {
      setErrorMessage("Please provide a name for the produce.");
      return;
    }

    const parsedPrice = parseFloat(price);
    if (isNaN(parsedPrice) || parsedPrice <= 0) {
      setErrorMessage("Please enter a valid price in Naira (₦).");
      return;
    }

    const parsedStock = parseInt(stock, 10);
    if (isNaN(parsedStock) || parsedStock < 0) {
      setErrorMessage("Please specify available stock quantity.");
      return;
    }

    setIsSubmitting(true);

    try {
      const res = await fetch("/api/farmer/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          category_id: categoryId,
          unit,
          price_per_unit: parsedPrice,
          stock_quantity: parsedStock,
          harvest_time: harvestTime,
          image_url: imageUrl,
          description: description.trim(),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to publish listing");
      }

      // Success: redirect to farmer dashboard
      router.push("/dashboard/farmer?published=true");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error publishing produce listing";
      setErrorMessage(msg);
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FAF8F2] text-[#0D2E1C]">
      {/* Top Header */}
      <header className="bg-[#0D2E1C] text-white px-6 py-4 border-b border-[#1B3B22] sticky top-0 z-30">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Link
              href="/dashboard/farmer"
              className="text-[#CFE73B] text-xs font-bold uppercase tracking-wider hover:underline flex items-center gap-1"
            >
              &larr; Back to Console
            </Link>
            <span className="text-white/30">•</span>
            <span className="text-xs text-white/80 font-medium">New Produce Listing</span>
          </div>

          <div className="text-xs text-[#FAF8F2] font-semibold bg-[#1B3B22] px-3 py-1 rounded-full border border-[#2B5436]">
            🚜 {user?.farm_name || "Ekiti Smallholder"}
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
        <div className="mb-8">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#EBF3E8] border border-[#CDE1C8] text-[#1B3B22] text-xs font-bold mb-2">
            <span>🌾 PRD Module 2: Rapid Mobile Harvest Publishing</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-[#0D2E1C] tracking-tight">
            Publish New Harvest to Marketplace
          </h1>
          <p className="text-xs sm:text-sm text-[#4F6A52] mt-1">
            List your crop directly with transparent farm-gate pricing. Buyers across Ekiti and regional hubs can order immediately.
          </p>
        </div>

        {errorMessage && (
          <div className="mb-6 p-4 rounded-xl bg-[#FDE8E8] border border-[#F8B4B4] text-[#9B1C1C] text-xs font-semibold flex items-center justify-between">
            <span>⚠️ {errorMessage}</span>
            <button onClick={() => setErrorMessage("")} className="font-bold text-sm cursor-pointer">
              ✕
            </button>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Main Form (7 cols) */}
          <form onSubmit={handleSubmit} className="lg:col-span-7 space-y-6">
            {/* 1. Produce Name */}
            <div className="bg-white p-5 sm:p-6 rounded-2xl border border-[#E5DBC7] shadow-xs">
              <label className="block text-xs font-bold uppercase tracking-wider text-[#0D2E1C] mb-2">
                1. Produce Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Premium Ekiti White Yam, Red Bell Peppers (Tatase)"
                className="w-full px-4 py-3 bg-[#FAF8F2] border border-[#E5DBC7] rounded-xl text-sm font-semibold text-[#0D2E1C] placeholder-[#4F6A52]/60 focus:outline-none focus:border-[#0D2E1C]"
                required
              />
            </div>

            {/* 2. Category Selection (PRD 6 Categories) */}
            <div className="bg-white p-5 sm:p-6 rounded-2xl border border-[#E5DBC7] shadow-xs">
              <label className="block text-xs font-bold uppercase tracking-wider text-[#0D2E1C] mb-2">
                2. Agricultural Category (PRD FR-2.1) <span className="text-red-500">*</span>
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                {CATEGORIES.map((cat) => {
                  const isSelected = categoryId === cat.id;
                  return (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setCategoryId(cat.id)}
                      className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                        isSelected
                          ? "bg-[#0D2E1C] text-white border-[#0D2E1C] shadow-xs"
                          : "bg-[#FAF8F2] text-[#0D2E1C] border-[#E5DBC7] hover:bg-[#F2ECE0]"
                      }`}
                    >
                      <span className="text-xl block mb-1">{cat.icon}</span>
                      <span className="text-xs font-bold block">{cat.name}</span>
                      <span className={`text-[10px] block line-clamp-1 ${isSelected ? "text-white/70" : "text-[#4F6A52]"}`}>
                        {cat.desc}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 3. Packaging Unit (5 PRD Units) */}
            <div className="bg-white p-5 sm:p-6 rounded-2xl border border-[#E5DBC7] shadow-xs">
              <label className="block text-xs font-bold uppercase tracking-wider text-[#0D2E1C] mb-2">
                3. Harvest Packaging Unit (PRD FR-2.2) <span className="text-red-500">*</span>
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                {PACKAGING_UNITS.map((u) => {
                  const isSelected = unit === u.unit;
                  return (
                    <button
                      key={u.unit}
                      type="button"
                      onClick={() => setUnit(u.unit)}
                      className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                        isSelected
                          ? "bg-[#6A9B48] text-white border-[#6A9B48] shadow-xs"
                          : "bg-[#FAF8F2] text-[#0D2E1C] border-[#E5DBC7] hover:bg-[#F2ECE0]"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-base">{u.icon}</span>
                        <span className="text-[10px] font-bold uppercase tracking-wider">
                          {isSelected ? "Selected" : ""}
                        </span>
                      </div>
                      <span className="text-xs font-bold block mt-1">{u.label}</span>
                      <span className={`text-[10px] block ${isSelected ? "text-white/80" : "text-[#4F6A52]"}`}>
                        {u.example}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 4. Pricing & Initial Stock */}
            <div className="bg-white p-5 sm:p-6 rounded-2xl border border-[#E5DBC7] shadow-xs">
              <label className="block text-xs font-bold uppercase tracking-wider text-[#0D2E1C] mb-3">
                4. Farm-Gate Price & Available Stock <span className="text-red-500">*</span>
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-semibold text-[#4F6A52] mb-1">
                    Price per {unit} (₦ Naira)
                  </label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-3 text-sm font-bold text-[#4F6A52]">₦</span>
                    <input
                      type="number"
                      min="1"
                      step="50"
                      value={price}
                      onChange={(e) => setPrice(e.target.value)}
                      placeholder="3500"
                      className="w-full pl-8 pr-4 py-3 bg-[#FAF8F2] border border-[#E5DBC7] rounded-xl text-sm font-bold text-[#0D2E1C] focus:outline-none focus:border-[#0D2E1C]"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-[#4F6A52] mb-1">
                    Available Stock Count (Units)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={stock}
                    onChange={(e) => setStock(e.target.value)}
                    placeholder="25"
                    className="w-full px-4 py-3 bg-[#FAF8F2] border border-[#E5DBC7] rounded-xl text-sm font-bold text-[#0D2E1C] focus:outline-none focus:border-[#0D2E1C]"
                    required
                  />
                  <p className="text-[10px] text-[#4F6A52] mt-1">
                    * If stock is set to 0, listing automatically deactivates (PRD FR-2.3).
                  </p>
                </div>
              </div>
            </div>

            {/* 5. Harvest Freshness & Timing */}
            <div className="bg-white p-5 sm:p-6 rounded-2xl border border-[#E5DBC7] shadow-xs">
              <label className="block text-xs font-bold uppercase tracking-wider text-[#0D2E1C] mb-2">
                5. Freshness / Harvest Timing
              </label>
              <div className="flex flex-wrap gap-2 mb-3">
                {HARVEST_PRESETS.map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setHarvestTime(preset)}
                    className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-colors cursor-pointer ${
                      harvestTime === preset
                        ? "bg-[#0D2E1C] text-[#CFE73B]"
                        : "bg-[#FAF8F2] text-[#4F6A52] border border-[#E5DBC7] hover:bg-[#F2ECE0]"
                    }`}
                  >
                    {preset}
                  </button>
                ))}
              </div>
              <input
                type="text"
                value={harvestTime}
                onChange={(e) => setHarvestTime(e.target.value)}
                placeholder="Or type custom harvest timestamp..."
                className="w-full px-4 py-2.5 bg-[#FAF8F2] border border-[#E5DBC7] rounded-xl text-xs font-semibold text-[#0D2E1C] focus:outline-none focus:border-[#0D2E1C]"
              />
            </div>

            {/* 6. Produce Photography Presets & Custom URL */}
            <div className="bg-white p-5 sm:p-6 rounded-2xl border border-[#E5DBC7] shadow-xs">
              <label className="block text-xs font-bold uppercase tracking-wider text-[#0D2E1C] mb-2">
                6. Produce Photography
              </label>
              <p className="text-xs text-[#4F6A52] mb-3">
                Choose from our verified local crop library or enter an image URL:
              </p>
              <div className="grid grid-cols-4 sm:grid-cols-8 gap-2 mb-4">
                {PHOTO_PRESETS.map((preset) => {
                  const isSelected = imageUrl === preset.path;
                  return (
                    <button
                      key={preset.path}
                      type="button"
                      onClick={() => handleSelectPresetPhoto(preset)}
                      className={`relative aspect-square rounded-xl overflow-hidden border-2 transition-all cursor-pointer ${
                        isSelected
                          ? "border-[#6A9B48] ring-2 ring-[#6A9B48]/30 scale-105"
                          : "border-[#E5DBC7] opacity-70 hover:opacity-100"
                      }`}
                      title={preset.name}
                    >
                      <Image
                        src={preset.path}
                        alt={preset.name}
                        fill
                        className="object-cover"
                        sizes="80px"
                      />
                    </button>
                  );
                })}
              </div>

              <input
                type="text"
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                placeholder="https://... or /images/produce/..."
                className="w-full px-4 py-2.5 bg-[#FAF8F2] border border-[#E5DBC7] rounded-xl text-xs font-mono text-[#0D2E1C] focus:outline-none focus:border-[#0D2E1C]"
              />
            </div>

            {/* 7. Crop Description & Farming Details */}
            <div className="bg-white p-5 sm:p-6 rounded-2xl border border-[#E5DBC7] shadow-xs">
              <label className="block text-xs font-bold uppercase tracking-wider text-[#0D2E1C] mb-2">
                7. Description & Organic Farming Notes
              </label>
              <textarea
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="e.g. Grown on rich loamy soil in Ikere-Ekiti. Completely free of synthetic chemical pesticides. Suitable for bulk food caterers and households."
                className="w-full px-4 py-3 bg-[#FAF8F2] border border-[#E5DBC7] rounded-xl text-xs font-medium text-[#0D2E1C] focus:outline-none focus:border-[#0D2E1C]"
              />
            </div>

            {/* Submit Action */}
            <div className="flex items-center justify-end space-x-4 pt-2">
              <Link
                href="/dashboard/farmer"
                className="px-5 py-3 rounded-xl border border-[#E5DBC7] text-xs font-bold text-[#4F6A52] hover:bg-[#F2ECE0] transition-colors"
              >
                Cancel
              </Link>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-8 py-3 bg-[#0D2E1C] hover:bg-[#1B3B22] text-[#FAF8F2] text-xs font-bold rounded-xl transition-all shadow-sm flex items-center justify-center space-x-2 cursor-pointer disabled:opacity-60"
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
                    <span>Publishing to Marketplace...</span>
                  </>
                ) : (
                  <span>✓ Publish Harvest Listing</span>
                )}
              </button>
            </div>
          </form>

          {/* Live Marketplace Preview Card (5 cols) */}
          <div className="lg:col-span-5">
            <div className="sticky top-24">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold uppercase tracking-wider text-[#4F6A52]">
                  Live Marketplace Preview
                </span>
                <span className="text-[11px] text-[#6A9B48] font-semibold bg-[#EBF3E8] px-2.5 py-0.5 rounded-full border border-[#CDE1C8]">
                  Buyer View
                </span>
              </div>

              {/* Produce Card (matching landing page styling) */}
              <div className="bg-white rounded-2xl border border-[#E5DBC7] overflow-hidden shadow-sm">
                <div className="relative aspect-4/3 w-full bg-[#F2ECE0]">
                  <Image
                    src={imageUrl || "/images/produce/yam-tubers.jpg"}
                    alt={name || "Crop Preview"}
                    fill
                    className="object-cover"
                    sizes="(max-width: 768px) 100vw, 400px"
                  />
                  <div className="absolute top-3 left-3 bg-[#0D2E1C]/90 backdrop-blur-xs text-white text-[10px] font-bold px-2.5 py-1 rounded-full border border-white/20 flex items-center gap-1">
                    <span>{selectedCategory.icon}</span>
                    <span>{selectedCategory.name}</span>
                  </div>

                  <div className="absolute top-3 right-3 bg-[#FAF8F2] text-[#0D2E1C] text-[10px] font-bold px-2 py-1 rounded-md border border-[#E5DBC7] shadow-xs">
                    per {unit}
                  </div>

                  {stock && parseInt(stock, 10) <= 5 && parseInt(stock, 10) > 0 && (
                    <div className="absolute bottom-3 left-3 bg-[#FEF08A] text-[#854D0E] text-[10px] font-bold px-2 py-0.5 rounded-full border border-[#FDE047]">
                      Only {stock} left!
                    </div>
                  )}
                </div>

                <div className="p-5">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <h3 className="text-base font-bold text-[#0D2E1C] leading-snug">
                      {name || "Ekiti White Yam"}
                    </h3>
                  </div>

                  <p className="text-xs text-[#4F6A52] line-clamp-2 mb-4">
                    {description || "Freshly harvested, zero chemical preservatives from local Ekiti farmland."}
                  </p>

                  <div className="flex items-center justify-between py-2 border-t border-[#E5DBC7] text-xs text-[#4F6A52] mb-4">
                    <div className="flex items-center space-x-1.5">
                      <span className="w-2 h-2 rounded-full bg-[#6A9B48]"></span>
                      <span className="font-semibold text-[#0D2E1C]">
                        {user?.farm_name || "Babatunde Organic Farms"}
                      </span>
                    </div>
                    <span className="text-[11px]">{user?.farm_location || "Ikere-Ekiti"}</span>
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-[10px] uppercase tracking-wider text-[#4F6A52] block font-semibold">
                        Farm-Gate Price
                      </span>
                      <div className="flex items-baseline space-x-1">
                        <span className="text-xl font-black text-[#0D2E1C]">
                          ₦{price ? Number(price).toLocaleString() : "3,500"}
                        </span>
                        <span className="text-xs text-[#4F6A52] font-semibold">/ {unit}</span>
                      </div>
                    </div>

                    <span className="px-3 py-1.5 rounded-lg bg-[#EBF3E8] text-[#166534] text-[11px] font-bold">
                      {stock ? `${stock} In Stock` : "25 In Stock"}
                    </span>
                  </div>
                </div>
              </div>

              <div className="mt-4 p-4 rounded-xl bg-[#FFFDF9] border border-[#E5DBC7] text-xs text-[#4F6A52]">
                <span className="font-bold text-[#0D2E1C] block mb-1">💡 Farm2Door Direct-Settlement Guarantee:</span>
                All orders are pre-paid through Paystack and held in guaranteed escrow until the buyer confirms delivery.
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
