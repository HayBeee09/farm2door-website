"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";

const EKITI_COMMUNITIES = [
  "Ikere-Ekiti",
  "Ado-Ekiti",
  "Oye-Ekiti",
  "Igbemo-Ekiti",
  "Ilawe-Ekiti",
  "Ijero-Ekiti",
  "Emure-Ekiti",
  "Ise-Ekiti",
  "Efon-Alaaye",
  "Ikole-Ekiti",
  "Aramoko-Ekiti",
  "Other Ekiti Community",
];

export default function ProfilePage() {
  const { user, isAuthenticated, isLoading, openAuthModal, updateProfile } = useAuth();

  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [farmName, setFarmName] = useState("");
  const [farmLocation, setFarmLocation] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);

  // Sync state when user object loads
  useEffect(() => {
    if (user) {
      setFullName(user.full_name || "");
      setPhone(user.phone || "");
      setAddress(user.address || "");
      setFarmName(user.farm_name || "");
      setFarmLocation(user.farm_location || "Ikere-Ekiti");
    }
  }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);

    if (!fullName.trim()) {
      setFeedback({ type: "error", message: "Please provide your full name." });
      return;
    }

    if (!phone.trim()) {
      setFeedback({ type: "error", message: "Please provide a valid contact phone number." });
      return;
    }

    setIsSaving(true);
    try {
      const res = await updateProfile({
        full_name: fullName.trim(),
        phone: phone.trim(),
        address: address.trim() || undefined,
        farm_name: user?.role === "farmer" ? farmName.trim() : undefined,
        farm_location: user?.role === "farmer" ? farmLocation.trim() : undefined,
      });

      if (res.success) {
        setFeedback({ type: "success", message: "Profile & account settings saved successfully!" });
        // Auto dismiss feedback after 4 seconds
        setTimeout(() => setFeedback(null), 4000);
      } else {
        setFeedback({ type: "error", message: res.error || "Failed to update profile." });
      }
    } catch {
      setFeedback({ type: "error", message: "An unexpected error occurred while saving." });
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#FAF8F2] flex items-center justify-center p-6">
        <div className="flex items-center space-x-3 text-[#0D2E1C] font-semibold text-sm">
          <svg className="animate-spin h-5 w-5 text-[#6A9B48]" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <span>Loading your profile details...</span>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-[#FAF8F2] text-[#0D2E1C] flex flex-col">
        {/* Navigation Bar */}
        <header className="bg-[#0D2E1C] text-white px-6 py-4 border-b border-[#1B3B22]">
          <div className="max-w-5xl mx-auto flex items-center justify-between">
            <Link
              href="/"
              className="text-[#CFE73B] text-xs font-bold uppercase tracking-wider hover:underline flex items-center gap-1"
            >
              &larr; Farm2Door Marketplace
            </Link>
            <span className="text-xs text-white/70">Profile & Settings</span>
          </div>
        </header>

        <main className="flex-1 flex items-center justify-center p-6">
          <div className="max-w-md w-full bg-white rounded-3xl border border-[#E5DBC7] p-8 text-center shadow-xs space-y-5">
            <div className="w-16 h-16 rounded-full bg-[#FAF8F2] border border-[#E5DBC7] text-2xl flex items-center justify-center mx-auto text-[#0D2E1C]">
              👤
            </div>
            <div className="space-y-1.5">
              <h2 className="text-lg font-black text-[#0D2E1C]">Sign In Required</h2>
              <p className="text-xs text-[#4F6A52] leading-relaxed">
                Please sign in to view and manage your contact details, delivery destination, and farm credentials.
              </p>
            </div>
            <button
              onClick={() => openAuthModal("login")}
              className="w-full py-3 bg-[#0D2E1C] hover:bg-[#1B3B22] text-[#CFE73B] text-xs font-bold rounded-xl transition-colors cursor-pointer"
            >
              Sign In to Your Account
            </button>
            <div className="text-[11px] text-[#4F6A52]">
              Don&apos;t have an account?{" "}
              <button
                onClick={() => openAuthModal("register")}
                className="text-[#0D2E1C] font-bold underline cursor-pointer"
              >
                Register Here
              </button>
            </div>
          </div>
        </main>
      </div>
    );
  }

  const isFarmer = user?.role === "farmer";

  return (
    <div className="min-h-screen bg-[#FAF8F2] text-[#0D2E1C] flex flex-col">
      {/* Header */}
      <header className="bg-[#0D2E1C] text-white px-6 py-4 border-b border-[#1B3B22] sticky top-0 z-30">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Link
              href="/"
              className="text-[#CFE73B] text-xs font-bold uppercase tracking-wider hover:underline flex items-center gap-1"
            >
              &larr; Farm2Door Marketplace
            </Link>
            <span className="text-white/30">•</span>
            <span className="text-xs text-white/80 font-medium">Account Settings</span>
          </div>

          <div className="flex items-center space-x-3">
            {isFarmer && (
              <Link
                href="/dashboard/farmer"
                className="text-xs text-[#FAF8F2] bg-[#1B3B22] hover:bg-[#234A2D] px-3 py-1.5 rounded-full border border-[#2B5436] font-semibold transition-colors"
              >
                🚜 Farmer Dashboard
              </Link>
            )}
            <Link
              href="/orders"
              className="text-xs text-[#FAF8F2] bg-[#1B3B22] hover:bg-[#234A2D] px-3 py-1.5 rounded-full border border-[#2B5436] font-semibold transition-colors"
            >
              📦 My Orders
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 py-8 space-y-6">
        {/* Profile Identity Card */}
        <div className="bg-white rounded-3xl border border-[#E5DBC7] p-6 sm:p-8 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
          <div className="flex items-center space-x-4">
            <div className="w-16 h-16 rounded-2xl bg-[#0D2E1C] text-[#CFE73B] font-black text-2xl flex items-center justify-center uppercase shadow-xs">
              {user?.full_name?.charAt(0) || "U"}
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h1 className="text-xl font-black text-[#0D2E1C]">{user?.full_name}</h1>
                {user?.is_verified && (
                  <span className="px-2 py-0.5 bg-[#CFE73B] text-[#0D2E1C] text-[10px] font-black rounded-full uppercase tracking-wider">
                    ✓ Verified
                  </span>
                )}
              </div>
              <p className="text-xs text-[#4F6A52] font-medium">{user?.email}</p>
              {isFarmer && user?.farm_name && (
                <p className="text-xs text-[#6A9B48] font-bold mt-1">🌱 {user.farm_name}</p>
              )}
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <span className="px-3 py-1 bg-[#FAF8F2] border border-[#E5DBC7] text-[#0D2E1C] text-xs font-bold rounded-xl uppercase tracking-wider">
              Role: {user?.role}
            </span>
            <span className="px-3 py-1 bg-[#FAF8F2] border border-[#E5DBC7] text-[#4F6A52] text-xs font-medium rounded-xl">
              📍 {user?.farm_location || "Ekiti State, NG"}
            </span>
          </div>
        </div>

        {/* Feedback Alert Banner */}
        {feedback && (
          <div
            className={`p-4 rounded-2xl text-xs font-semibold flex items-center justify-between border ${
              feedback.type === "success"
                ? "bg-[#F2ECE0] text-[#0D2E1C] border-[#6A9B48]"
                : "bg-red-50 text-red-800 border-red-200"
            }`}
          >
            <span>{feedback.message}</span>
            <button
              onClick={() => setFeedback(null)}
              className="text-xs font-bold hover:opacity-75 cursor-pointer ml-3"
            >
              ✕
            </button>
          </div>
        )}

        {/* Profile Edit Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Section 1: Contact Information */}
          <div className="bg-white rounded-3xl border border-[#E5DBC7] p-6 sm:p-8 shadow-xs space-y-5">
            <div className="border-b border-[#E5DBC7] pb-3">
              <h2 className="text-sm font-black uppercase tracking-wider text-[#0D2E1C]">
                1. Personal Contact Information
              </h2>
              <p className="text-xs text-[#4F6A52] mt-0.5">
                Keep your communication phone and full name up to date for order coordination.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-[#0D2E1C]">
                  Full Name <span className="text-red-600">*</span>
                </label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="e.g. Adeyemi Adeleke"
                  required
                  className="w-full px-4 py-2.5 bg-[#FAF8F2] rounded-xl border border-[#E5DBC7] text-xs font-medium text-[#0D2E1C] focus:outline-none focus:border-[#0D2E1C] transition-colors"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-[#0D2E1C]">
                  Phone Number <span className="text-red-600">*</span>
                </label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="e.g. +234 803 123 4567"
                  required
                  className="w-full px-4 py-2.5 bg-[#FAF8F2] rounded-xl border border-[#E5DBC7] text-xs font-medium text-[#0D2E1C] focus:outline-none focus:border-[#0D2E1C] transition-colors"
                />
              </div>

              <div className="space-y-1.5 sm:col-span-2">
                <label className="text-xs font-bold text-[#0D2E1C]">
                  Account Email Address
                </label>
                <input
                  type="email"
                  value={user?.email || ""}
                  disabled
                  className="w-full px-4 py-2.5 bg-[#F2ECE0] rounded-xl border border-[#E5DBC7] text-xs font-medium text-[#4F6A52] cursor-not-allowed"
                />
                <span className="text-[10px] text-[#4F6A52]">
                  Email is locked to your authenticated credentials for account security.
                </span>
              </div>
            </div>
          </div>

          {/* Section 2: Delivery Destination (for all accounts, especially Buyers) */}
          <div className="bg-white rounded-3xl border border-[#E5DBC7] p-6 sm:p-8 shadow-xs space-y-5">
            <div className="border-b border-[#E5DBC7] pb-3">
              <h2 className="text-sm font-black uppercase tracking-wider text-[#0D2E1C]">
                2. Default Delivery Destination (Ekiti State)
              </h2>
              <p className="text-xs text-[#4F6A52] mt-0.5">
                Pre-fills your delivery location at checkout for seamless transit dispatch.
              </p>
            </div>

            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-[#0D2E1C]">
                  Street Address & Prominent Landmark
                </label>
                <input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="e.g. No. 14 Oba Adebayo Way, Near Central Mosque"
                  className="w-full px-4 py-2.5 bg-[#FAF8F2] rounded-xl border border-[#E5DBC7] text-xs font-medium text-[#0D2E1C] focus:outline-none focus:border-[#0D2E1C] transition-colors"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-[#0D2E1C]">
                  Ekiti Town / Community
                </label>
                <select
                  value={farmLocation}
                  onChange={(e) => setFarmLocation(e.target.value)}
                  className="w-full px-4 py-2.5 bg-[#FAF8F2] rounded-xl border border-[#E5DBC7] text-xs font-medium text-[#0D2E1C] focus:outline-none focus:border-[#0D2E1C] transition-colors"
                >
                  {EKITI_COMMUNITIES.map((town) => (
                    <option key={town} value={town}>
                      {town}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Section 3: Farm Operations & Branding (Only visible for Farmers) */}
          {isFarmer && (
            <div className="bg-white rounded-3xl border border-[#E5DBC7] p-6 sm:p-8 shadow-xs space-y-5">
              <div className="border-b border-[#E5DBC7] pb-3">
                <h2 className="text-sm font-black uppercase tracking-wider text-[#0D2E1C]">
                  3. Farm & Commercial Operations
                </h2>
                <p className="text-xs text-[#4F6A52] mt-0.5">
                  Displayed on your marketplace produce cards to establish direct provenance with buyers.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-[#0D2E1C]">
                    Farm / Enterprise Name
                  </label>
                  <input
                    type="text"
                    value={farmName}
                    onChange={(e) => setFarmName(e.target.value)}
                    placeholder="e.g. Ikere Central Commercial Agro"
                    className="w-full px-4 py-2.5 bg-[#FAF8F2] rounded-xl border border-[#E5DBC7] text-xs font-medium text-[#0D2E1C] focus:outline-none focus:border-[#0D2E1C] transition-colors"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-[#0D2E1C]">
                    Farming Community in Ekiti
                  </label>
                  <select
                    value={farmLocation}
                    onChange={(e) => setFarmLocation(e.target.value)}
                    className="w-full px-4 py-2.5 bg-[#FAF8F2] rounded-xl border border-[#E5DBC7] text-xs font-medium text-[#0D2E1C] focus:outline-none focus:border-[#0D2E1C] transition-colors"
                  >
                    {EKITI_COMMUNITIES.map((town) => (
                      <option key={town} value={town}>
                        {town}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* Action Bar */}
          <div className="flex items-center justify-end space-x-4 pt-2">
            <Link
              href="/"
              className="px-5 py-2.5 border border-[#E5DBC7] hover:bg-[#F2ECE0] text-[#0D2E1C] text-xs font-bold rounded-xl transition-colors"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={isSaving}
              className="px-6 py-2.5 bg-[#0D2E1C] hover:bg-[#1B3B22] text-[#CFE73B] text-xs font-bold rounded-xl transition-colors shadow-xs flex items-center space-x-2 cursor-pointer disabled:opacity-50"
            >
              {isSaving ? (
                <>
                  <svg className="animate-spin h-4 w-4 text-[#CFE73B]" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <span>Saving Updates...</span>
                </>
              ) : (
                <span>Save Profile Changes</span>
              )}
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}
