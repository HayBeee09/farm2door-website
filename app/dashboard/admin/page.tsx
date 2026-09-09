"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { VerifiedFarmer, EscrowTransaction, DisputeReport } from "@/lib/admin-store";

export default function AdminDashboardPage() {
  const [activeTab, setActiveTab] = useState<"overview" | "farmers" | "escrow" | "spoilage" | "disputes">("overview");

  // State
  const [metrics, setMetrics] = useState<any>(null);
  const [farmers, setFarmers] = useState<VerifiedFarmer[]>([]);
  const [escrowList, setEscrowList] = useState<EscrowTransaction[]>([]);
  const [disputes, setDisputes] = useState<DisputeReport[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [actionNotice, setActionNotice] = useState<string | null>(null);

  // Dispute resolution modal state
  const [selectedDispute, setSelectedDispute] = useState<DisputeReport | null>(null);
  const [resolutionNotes, setResolutionNotes] = useState("");
  const [resolutionAction, setResolutionAction] = useState<"resolved" | "refunded">("resolved");
  const [isSubmittingResolution, setIsSubmittingResolution] = useState(false);

  // Load all admin data
  const loadData = async () => {
    setIsLoading(true);
    try {
      const [mRes, fRes, eRes, dRes] = await Promise.all([
        fetch("/api/admin/metrics"),
        fetch("/api/admin/farmers"),
        fetch("/api/admin/escrow"),
        fetch("/api/admin/disputes"),
      ]);

      if (mRes.ok) {
        const mData = await mRes.json();
        if (mData.metrics) setMetrics(mData.metrics);
      }
      if (fRes.ok) {
        const fData = await fRes.json();
        if (fData.farmers) setFarmers(fData.farmers);
      }
      if (eRes.ok) {
        const eData = await eRes.json();
        if (eData.transactions) setEscrowList(eData.transactions);
      }
      if (dRes.ok) {
        const dData = await dRes.json();
        if (dData.disputes) setDisputes(dData.disputes);
      }
    } catch (err) {
      console.warn("Failed to load admin data:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const showNotification = (msg: string) => {
    setActionNotice(msg);
    setTimeout(() => setActionNotice(null), 4000);
  };

  // Farmer verification toggle
  const handleToggleFarmer = async (farmerId: string, currentStatus: string) => {
    const newStatus = currentStatus === "verified" ? "suspended" : "verified";
    try {
      const res = await fetch("/api/admin/farmers", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ farmer_id: farmerId, verification_status: newStatus }),
      });
      if (res.ok) {
        showNotification(`Farmer status successfully updated to "${newStatus.toUpperCase()}"!`);
        loadData();
      }
    } catch (err) {
      console.error("Error toggling farmer status:", err);
    }
  };

  // 1-Click Escrow Release
  const handleReleaseEscrow = async (orderReference: string) => {
    try {
      const tx = escrowList.find((t) => t.orderReference === orderReference);
      const dest = tx?.farmerBankDetails
        ? ` to ${tx.farmerBankDetails.bankName} (${tx.farmerBankDetails.accountNumber})`
        : " to registered farmer bank account";

      const res = await fetch("/api/admin/escrow", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ order_reference: orderReference }),
      });
      if (res.ok) {
        showNotification(
          `Escrow payout (₦${tx?.farmerPayoutNgn?.toLocaleString() || ""}) for ${orderReference} disbursed${dest}!`
        );
        loadData();
      }
    } catch (err) {
      console.error("Error releasing escrow:", err);
    }
  };

  // Resolve Dispute
  const handleSubmitDisputeResolution = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDispute || !resolutionNotes.trim()) return;

    setIsSubmittingResolution(true);
    try {
      const res = await fetch("/api/admin/disputes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          dispute_id: selectedDispute.id,
          resolution_notes: resolutionNotes.trim(),
          status: resolutionAction,
        }),
      });
      if (res.ok) {
        showNotification(`Dispute ${selectedDispute.id} marked as ${resolutionAction.toUpperCase()}!`);
        setSelectedDispute(null);
        setResolutionNotes("");
        loadData();
      }
    } catch (err) {
      console.error("Error resolving dispute:", err);
    } finally {
      setIsSubmittingResolution(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FAF8F2] text-[#0D2E1C] pb-24 selection:bg-[#CFE73B] selection:text-[#0D2E1C]">
      {/* Top Admin Header Bar */}
      <header className="bg-[#0D2E1C] text-[#FAF8F2] border-b border-[#134229] sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center space-x-3">
            <Link href="/" className="flex items-center space-x-2">
              <span className="text-xl">🌾</span>
              <span className="font-black text-lg tracking-tight text-white">Farm2Door</span>
            </Link>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-[#CFE73B] text-[#0D2E1C] font-black uppercase tracking-wider">
              PRD Stage 8: Admin & Escrow
            </span>
          </div>

          <div className="flex items-center space-x-3 text-xs">
            <Link
              href="/dashboard/farmer"
              className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white font-semibold transition-colors flex items-center gap-1.5"
            >
              <span>🚜 Farmer Portal</span>
            </Link>
            <Link
              href="/orders"
              className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white font-semibold transition-colors flex items-center gap-1.5"
            >
              <span>📦 Buyer Orders</span>
            </Link>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
        {/* Floating Notification */}
        {actionNotice && (
          <div className="mb-6 p-4 rounded-2xl bg-[#0D2E1C] text-[#CFE73B] border-2 border-[#CFE73B] font-bold text-xs flex items-center justify-between shadow-lg animate-fade-in">
            <span className="flex items-center gap-2">
              <span>⚡</span> {actionNotice}
            </span>
            <button onClick={() => setActionNotice(null)} className="text-white hover:text-[#CFE73B] font-black ml-4">
              ✕
            </button>
          </div>
        )}

        {/* Title & Platform Health Banner */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-bold uppercase tracking-wider text-[#6A9B48]">
                Centralized Market Administration & Settlement Ledger
              </span>
              <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-[#6A9B48]/15 text-[#6A9B48]">
                ● Live Telemetry
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-[#0D2E1C] mt-1 tracking-tight">
              Ekiti Agricultural Market Control Desk
            </h1>
            <p className="text-xs text-[#506155] mt-1">
              Supervising farm-gate disintermediation, Paystack escrow release, smallholder credentials, and spoilage prevention across 16 Ekiti LGAs.
            </p>
          </div>

          <button
            onClick={loadData}
            disabled={isLoading}
            className="px-4 py-2 bg-[#FFFDF9] hover:bg-[#F2ECE0] border border-[#E5DBC7] text-[#0D2E1C] text-xs font-bold rounded-xl transition-colors self-start md:self-auto flex items-center gap-1.5 cursor-pointer shadow-xs"
          >
            <span>🔄</span> Refresh Audit Data
          </button>
        </div>

        {/* --- 4 EXECUTIVE KPI CARDS --- */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
          {/* GMV */}
          <div className="bg-[#FFFDF9] border border-[#E5DBC7] rounded-3xl p-5 shadow-xs">
            <div className="flex justify-between items-start">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#6E7E74]">
                Gross Merchandise (GMV)
              </span>
              <span className="p-2 rounded-xl bg-[#FAF8F2] text-sm">💰</span>
            </div>
            <div className="text-2xl font-black text-[#0D2E1C] mt-2">
              ₦{metrics?.gmvNgn ? metrics.gmvNgn.toLocaleString() : "348,500"}
            </div>
            <div className="text-[11px] text-[#6A9B48] font-semibold mt-1">
              100% Direct Transacted Value
            </div>
          </div>

          {/* Ekiti Smallholders */}
          <div className="bg-[#FFFDF9] border border-[#E5DBC7] rounded-3xl p-5 shadow-xs">
            <div className="flex justify-between items-start">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#6E7E74]">
                Ekiti Smallholders
              </span>
              <span className="p-2 rounded-xl bg-[#FAF8F2] text-sm">🚜</span>
            </div>
            <div className="text-2xl font-black text-[#0D2E1C] mt-2">
              {metrics?.verifiedFarmersCount ?? 4}{" "}
              <span className="text-xs font-normal text-[#506155]">
                / {metrics?.totalFarmersCount ?? 5} verified
              </span>
            </div>
            <div className="text-[11px] text-[#0D2E1C] font-semibold mt-1">
              Ikere, Ado, Igbemo, Ilawe clusters
            </div>
          </div>

          {/* Guaranteed Escrow Pool */}
          <div className="bg-[#FFFDF9] border border-[#E5DBC7] rounded-3xl p-5 shadow-xs">
            <div className="flex justify-between items-start">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#6E7E74]">
                Guaranteed Escrow Pool
              </span>
              <span className="p-2 rounded-xl bg-[#FAF8F2] text-sm">🛡️</span>
            </div>
            <div className="text-2xl font-black text-[#0D2E1C] mt-2">
              ₦{metrics?.totalEscrowHeldNgn ? metrics.totalEscrowHeldNgn.toLocaleString() : "92,400"}
            </div>
            <div className="text-[11px] text-[#B5BA3E] font-bold mt-1">
              Awaiting Doorstep Delivery Confirmation
            </div>
          </div>

          {/* Spoilage Loss Metric */}
          <div className="bg-[#0D2E1C] text-[#FAF8F2] border border-[#134229] rounded-3xl p-5 shadow-sm">
            <div className="flex justify-between items-start">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#CFE73B]">
                Post-Harvest Spoilage
              </span>
              <span className="p-2 rounded-xl bg-[#134229] text-sm">🥬</span>
            </div>
            <div className="text-2xl font-black text-[#CFE73B] mt-2">
              3.2%{" "}
              <span className="text-xs font-normal text-white/70 line-through">
                40% brokers
              </span>
            </div>
            <div className="text-[11px] text-white/90 font-medium mt-1">
              ~1,420 kg Perishables Saved from Rot
            </div>
          </div>
        </div>

        {/* --- NAVIGATION TABS --- */}
        <div className="flex items-center gap-2 border-b border-[#E5DBC7] pb-3 mb-6 overflow-x-auto">
          {[
            { id: "overview", label: "📊 System Telemetry & Metrics" },
            { id: "farmers", label: `🚜 Farmer Auditing (${farmers.length})` },
            { id: "escrow", label: `🛡️ Escrow Payout Audit (${escrowList.length})` },
            { id: "spoilage", label: "🌾 Spoilage & Cold-Chain Index" },
            { id: "disputes", label: `⚖️ Dispute Resolution (${disputes.length})` },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
                activeTab === tab.id
                  ? "bg-[#0D2E1C] text-[#CFE73B] shadow-sm"
                  : "bg-[#FFFDF9] hover:bg-[#F2ECE0] text-[#506155] border border-[#E5DBC7]"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* --- TAB 1: OVERVIEW & SYSTEM TELEMETRY --- */}
        {activeTab === "overview" && (
          <div className="space-y-8">
            {/* PRD Disintermediation Surplus Grid */}
            <div className="bg-[#FFFDF9] border border-[#E5DBC7] rounded-3xl p-6 sm:p-8 shadow-xs">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#E5DBC7] pb-4 mb-6">
                <div>
                  <span className="text-xs font-mono font-bold text-[#6A9B48] uppercase">
                    Economic Disintermediation Impact
                  </span>
                  <h3 className="text-xl font-bold text-[#0D2E1C]">Ekiti Supply Chain Efficiency Breakdown</h3>
                </div>
                <span className="text-xs font-bold text-[#0D2E1C] bg-[#FAF8F2] px-3 py-1 rounded-full border border-[#E5DBC7]">
                  PRD Section 1.2 Benchmark
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="p-5 rounded-2xl bg-[#FAF8F2] border border-[#E5DBC7]">
                  <span className="text-[11px] font-bold text-[#6E7E74] uppercase">Farmer Take-Home</span>
                  <div className="text-3xl font-black text-[#0D2E1C] mt-2">92.0%</div>
                  <p className="text-xs text-[#506155] mt-1.5 leading-relaxed">
                    Compared to 35% in traditional wholesale markets. Farmers retain direct profit without broker extortion.
                  </p>
                </div>

                <div className="p-5 rounded-2xl bg-[#FAF8F2] border border-[#E5DBC7]">
                  <span className="text-[11px] font-bold text-[#6E7E74] uppercase">Consumer Price Discount</span>
                  <div className="text-3xl font-black text-[#6A9B48] mt-2">-35.0%</div>
                  <p className="text-xs text-[#506155] mt-1.5 leading-relaxed">
                    Households in Ado, Ikere, and Oye purchase staple crops at genuine farm-gate value.
                  </p>
                </div>

                <div className="p-5 rounded-2xl bg-[#FAF8F2] border border-[#E5DBC7]">
                  <span className="text-[11px] font-bold text-[#6E7E74] uppercase">Direct Harvest Turnaround</span>
                  <div className="text-3xl font-black text-[#B5BA3E] mt-2">14.5 Hrs</div>
                  <p className="text-xs text-[#506155] mt-1.5 leading-relaxed">
                    Average time from 6:00 AM morning harvest to customer doorstep delivery, beating 96hr broker stagnation.
                  </p>
                </div>
              </div>
            </div>

            {/* Recent Escrow Ledger Preview */}
            <div className="bg-[#FFFDF9] border border-[#E5DBC7] rounded-3xl p-6 sm:p-8 shadow-xs">
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h3 className="text-lg font-bold text-[#0D2E1C]">Recent Financial Audit Feed</h3>
                  <p className="text-xs text-[#506155]">Live transaction references and Paystack settlement match.</p>
                </div>
                <button
                  onClick={() => setActiveTab("escrow")}
                  className="text-xs font-bold text-[#6A9B48] hover:underline"
                >
                  View Full Ledger →
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-[#E5DBC7] text-[#6E7E74] font-mono text-[11px]">
                      <th className="pb-3">Reference</th>
                      <th className="pb-3">Buyer</th>
                      <th className="pb-3">Farmer Beneficiary</th>
                      <th className="pb-3">Gross Total</th>
                      <th className="pb-3">Farmer Payout (92%)</th>
                      <th className="pb-3">Escrow Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E5DBC7]">
                    {escrowList.slice(0, 4).map((tx) => (
                      <tr key={tx.id} className="hover:bg-[#FAF8F2]/60 transition-colors">
                        <td className="py-3 font-mono font-bold text-[#0D2E1C]">{tx.orderReference}</td>
                        <td className="py-3 font-medium text-[#0D2E1C]">{tx.buyerName}</td>
                        <td className="py-3">
                          <div className="font-semibold text-[#0D2E1C]">{tx.farmerName}</div>
                          {tx.farmerBankDetails && (
                            <div className="text-[10px] text-[#506155] font-mono">
                              🏦 {tx.farmerBankDetails.bankName} • {tx.farmerBankDetails.accountNumber}
                            </div>
                          )}
                        </td>
                        <td className="py-3 font-bold text-[#0D2E1C]">₦{tx.amountNgn.toLocaleString()}</td>
                        <td className="py-3 font-bold text-[#6A9B48]">₦{tx.farmerPayoutNgn.toLocaleString()}</td>
                        <td className="py-3">
                          <span
                            className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase ${
                              tx.escrowStatus === "released_to_farmer"
                                ? "bg-[#6A9B48]/15 text-[#6A9B48]"
                                : tx.escrowStatus === "refunded"
                                ? "bg-red-100 text-red-700"
                                : "bg-[#B5BA3E]/20 text-[#0D2E1C]"
                            }`}
                          >
                            {tx.escrowStatus.replace(/_/g, " ")}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* --- TAB 2: FARMER CREDENTIAL AUDITING (PRD 8.2) --- */}
        {activeTab === "farmers" && (
          <div className="bg-[#FFFDF9] border border-[#E5DBC7] rounded-3xl p-6 sm:p-8 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
              <div>
                <span className="text-xs font-mono font-bold text-[#6A9B48] uppercase">
                  PRD FR-1.4 & Section 2 (Farmer Persona)
                </span>
                <h3 className="text-xl font-bold text-[#0D2E1C]">Ekiti Smallholder Physical Auditing</h3>
                <p className="text-xs text-[#506155] mt-0.5">
                  Confirm physical agrarian coordinates, crop specializations, and toggle verified provenance badges.
                </p>
              </div>
              <span className="text-xs font-bold text-[#0D2E1C] bg-[#FAF8F2] px-3 py-1.5 rounded-xl border border-[#E5DBC7]">
                {farmers.filter((f) => f.verificationStatus === "verified").length} / {farmers.length} Farms Verified
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-[#E5DBC7] text-[#6E7E74] font-mono text-[11px] uppercase">
                    <th className="pb-3">Farmer & Farm Name</th>
                    <th className="pb-3">Ekiti Community & LGA</th>
                    <th className="pb-3">GPS Coordinates</th>
                    <th className="pb-3">Crop Harvests</th>
                    <th className="pb-3">Audit Status</th>
                    <th className="pb-3 text-right">Administrative Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E5DBC7]">
                  {farmers.map((farmer) => (
                    <tr key={farmer.id} className="hover:bg-[#FAF8F2]/60 transition-colors">
                      <td className="py-4">
                        <div className="font-bold text-[#0D2E1C]">{farmer.farmName}</div>
                        <div className="text-[11px] text-[#506155]">
                          {farmer.fullName} • {farmer.phone}
                        </div>
                        {farmer.bankDetails && (
                          <div className="text-[10px] text-[#166534] font-mono mt-0.5 flex items-center gap-1">
                            <span>🏦 {farmer.bankDetails.bankName} • {farmer.bankDetails.accountNumber}</span>
                          </div>
                        )}
                      </td>
                      <td className="py-4">
                        <span className="font-semibold text-[#0D2E1C]">{farmer.farmLocation}</span>
                        <div className="text-[10px] text-[#6E7E74] font-mono">{farmer.lga}</div>
                      </td>
                      <td className="py-4 font-mono text-[11px] text-[#506155]">
                        📍 {farmer.coordinates}
                      </td>
                      <td className="py-4">
                        <div className="flex flex-wrap gap-1 max-w-[200px]">
                          {farmer.produceTypes.map((p, idx) => (
                            <span
                              key={idx}
                              className="px-2 py-0.5 rounded bg-[#FAF8F2] border border-[#E5DBC7] text-[10px] text-[#0D2E1C]"
                            >
                              {p}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="py-4">
                        <span
                          className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                            farmer.verificationStatus === "verified"
                              ? "bg-[#6A9B48]/15 text-[#6A9B48]"
                              : farmer.verificationStatus === "suspended"
                              ? "bg-red-100 text-red-700"
                              : "bg-[#B5BA3E]/20 text-[#0D2E1C]"
                          }`}
                        >
                          {farmer.verificationStatus === "verified"
                            ? "✓ Verified"
                            : farmer.verificationStatus.replace(/_/g, " ")}
                        </span>
                      </td>
                      <td className="py-4 text-right">
                        <button
                          onClick={() => handleToggleFarmer(farmer.id, farmer.verificationStatus)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                            farmer.verificationStatus === "verified"
                              ? "bg-red-50 hover:bg-red-100 text-red-700 border border-red-200"
                              : "bg-[#0D2E1C] hover:bg-[#134229] text-[#CFE73B]"
                          }`}
                        >
                          {farmer.verificationStatus === "verified" ? "Suspend Badge" : "✓ Grant Verified"}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* --- TAB 3: ESCROW & PAYMENT SETTLEMENT AUDIT (PRD 8.3) --- */}
        {activeTab === "escrow" && (
          <div className="bg-[#FFFDF9] border border-[#E5DBC7] rounded-3xl p-6 sm:p-8 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
              <div>
                <span className="text-xs font-mono font-bold text-[#6A9B48] uppercase">
                  PRD Module 4 & FR-4.3: Financial Ledger & Escrow Reconciliation
                </span>
                <h3 className="text-xl font-bold text-[#0D2E1C]">Paystack & Instant Settlement Auditing</h3>
                <p className="text-xs text-[#506155] mt-0.5">
                  Confirm order delivery status and trigger audited farmer bank payouts (92% take-home).
                </p>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-[#0D2E1C] bg-[#FAF8F2] px-3 py-1.5 rounded-xl border border-[#E5DBC7]">
                  Pool Held: ₦{metrics?.totalEscrowHeldNgn?.toLocaleString() ?? "92,400"}
                </span>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-[#E5DBC7] text-[#6E7E74] font-mono text-[11px] uppercase">
                    <th className="pb-3">Order Ref</th>
                    <th className="pb-3">Buyer & Email</th>
                    <th className="pb-3">Farmer Beneficiary</th>
                    <th className="pb-3">Gross / Payout</th>
                    <th className="pb-3">Fulfillment Status</th>
                    <th className="pb-3">Escrow Status</th>
                    <th className="pb-3 text-right">Settlement Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E5DBC7]">
                  {escrowList.map((tx) => {
                    const isReleased = tx.escrowStatus === "released_to_farmer";
                    return (
                      <tr key={tx.id} className="hover:bg-[#FAF8F2]/60 transition-colors">
                        <td className="py-4">
                          <span className="font-mono font-bold text-[#0D2E1C]">{tx.orderReference}</span>
                          <div className="text-[10px] text-[#6E7E74]">{tx.paymentChannel}</div>
                        </td>
                        <td className="py-4">
                          <div className="font-semibold text-[#0D2E1C]">{tx.buyerName}</div>
                          <div className="text-[11px] text-[#506155]">{tx.buyerEmail}</div>
                        </td>
                        <td className="py-4 font-semibold text-[#0D2E1C]">
                          <div>{tx.farmerName}</div>
                          {tx.farmerBankDetails ? (
                            <div className="text-[11px] text-[#506155] font-mono mt-0.5">
                              🏦 {tx.farmerBankDetails.bankName}
                              <div className="text-[10px] text-[#6E7E74]">
                                {tx.farmerBankDetails.accountNumber} ({tx.farmerBankDetails.accountName})
                              </div>
                            </div>
                          ) : (
                            <div className="text-[10px] text-[#6E7E74] italic">Bank details pending</div>
                          )}
                        </td>
                        <td className="py-4">
                          <div className="font-black text-[#0D2E1C]">₦{tx.amountNgn.toLocaleString()}</div>
                          <div className="text-[11px] font-bold text-[#6A9B48]">
                            Farmer: ₦{tx.farmerPayoutNgn.toLocaleString()} (92%)
                          </div>
                        </td>
                        <td className="py-4">
                          <span className="capitalize font-medium text-[#0D2E1C]">
                            {tx.orderStatus.replace(/_/g, " ")}
                          </span>
                        </td>
                        <td className="py-4">
                          <span
                            className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase ${
                              isReleased
                                ? "bg-[#6A9B48]/15 text-[#6A9B48]"
                                : tx.escrowStatus === "refunded"
                                ? "bg-red-100 text-red-700"
                                : "bg-[#B5BA3E]/20 text-[#0D2E1C]"
                            }`}
                          >
                            {tx.escrowStatus.replace(/_/g, " ")}
                          </span>
                        </td>
                        <td className="py-4 text-right">
                          {isReleased ? (
                            <span className="text-[11px] font-bold text-[#6A9B48] flex items-center justify-end gap-1">
                              <span>✓</span> Settled to Bank
                            </span>
                          ) : (
                            <button
                              onClick={() => handleReleaseEscrow(tx.orderReference)}
                              className="px-3 py-1.5 rounded-lg bg-[#0D2E1C] hover:bg-[#134229] text-[#CFE73B] text-xs font-bold transition-all cursor-pointer shadow-xs"
                            >
                              💰 Release Payout
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* --- TAB 4: SPOILAGE & COLD-CHAIN TELEMETRY --- */}
        {activeTab === "spoilage" && (
          <div className="space-y-8">
            <div className="bg-[#FFFDF9] border border-[#E5DBC7] rounded-3xl p-6 sm:p-8 shadow-xs">
              <div className="border-b border-[#E5DBC7] pb-4 mb-6">
                <span className="text-xs font-mono font-bold text-[#6A9B48] uppercase">
                  Agrarian Sustainability & Post-Harvest Waste Minimization
                </span>
                <h3 className="text-xl font-bold text-[#0D2E1C]">Ekiti Perishable Spoilage Prevention Telemetry</h3>
                <p className="text-xs text-[#506155] mt-1">
                  Comparing traditional broker-driven decay versus direct morning disintermediation turnaround.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-stretch mb-8">
                {/* Traditional Decay Model */}
                <div className="p-6 rounded-2xl bg-[#FAF8F2] border-2 border-red-200">
                  <div className="flex justify-between items-center text-xs font-bold text-red-800 mb-2">
                    <span>TRADITIONAL INTERMEDIARY BROKERS</span>
                    <span className="px-2 py-0.5 rounded bg-red-100 font-mono">40% DECAY</span>
                  </div>
                  <h4 className="text-lg font-black text-[#0D2E1C]">Severe Perishable Spoilage</h4>
                  <p className="text-xs text-[#506155] mt-2 leading-relaxed">
                    Smallholders are forced to leave harvest sitting in hot village squares for up to 4 days while haggling with traveling aggregators. Leafy greens (Ugwu, Waterleaf) and ripe peppers lose moisture, bruise, and rot.
                  </p>
                  <div className="mt-4 pt-4 border-t border-red-200 flex justify-between text-xs font-bold text-red-800">
                    <span>Average Waste per Harvest:</span>
                    <span>~400 kg out of 1,000 kg lost</span>
                  </div>
                </div>

                {/* Farm2Door Direct Turnaround */}
                <div className="p-6 rounded-2xl bg-[#0D2E1C] text-[#FAF8F2] border-2 border-[#134229]">
                  <div className="flex justify-between items-center text-xs font-bold text-[#CFE73B] mb-2">
                    <span>FARM2DOOR DIRECT PIPELINE</span>
                    <span className="px-2 py-0.5 rounded bg-[#134229] font-mono">3.2% DECAY</span>
                  </div>
                  <h4 className="text-lg font-black text-white">Rapid Same-Day Morning Fulfillment</h4>
                  <p className="text-xs text-white/85 mt-2 leading-relaxed">
                    Crops are listed online prior to cutting. Farmers harvest directly to order crates, loaded into intra-Ekiti dispatch transit, and delivered to consumer kitchens within 14.5 hours of cutting.
                  </p>
                  <div className="mt-4 pt-4 border-t border-[#134229] flex justify-between text-xs font-bold text-[#CFE73B]">
                    <span>Average Spoilage Reduction:</span>
                    <span>-92% Waste Eliminated</span>
                  </div>
                </div>
              </div>

              {/* Preservation Telemetry Metrics */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="p-4 rounded-xl bg-[#FAF8F2] border border-[#E5DBC7] text-center">
                  <div className="text-[10px] uppercase font-bold text-[#6E7E74]">Turnaround Time</div>
                  <div className="text-xl font-black text-[#0D2E1C] mt-1">14.5 Hours</div>
                  <div className="text-[10px] text-[#6A9B48] font-bold">Same-Day Transit</div>
                </div>
                <div className="p-4 rounded-xl bg-[#FAF8F2] border border-[#E5DBC7] text-center">
                  <div className="text-[10px] uppercase font-bold text-[#6E7E74]">Total Saved to Date</div>
                  <div className="text-xl font-black text-[#0D2E1C] mt-1">1,420 Kg</div>
                  <div className="text-[10px] text-[#6A9B48] font-bold">Edible Produce Preserved</div>
                </div>
                <div className="p-4 rounded-xl bg-[#FAF8F2] border border-[#E5DBC7] text-center">
                  <div className="text-[10px] uppercase font-bold text-[#6E7E74]">Economic Waste Saved</div>
                  <div className="text-xl font-black text-[#0D2E1C] mt-1">₦923,000</div>
                  <div className="text-[10px] text-[#6A9B48] font-bold">Kept in Farmer Pockets</div>
                </div>
                <div className="p-4 rounded-xl bg-[#FAF8F2] border border-[#E5DBC7] text-center">
                  <div className="text-[10px] uppercase font-bold text-[#6E7E74]">Transit Coverage</div>
                  <div className="text-xl font-black text-[#0D2E1C] mt-1">16 LGAs</div>
                  <div className="text-[10px] text-[#0D2E1C] font-bold">Ekiti Intra-State Corridor</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* --- TAB 5: DISPUTE RESOLUTION WORKFLOW (PRD 8.4) --- */}
        {activeTab === "disputes" && (
          <div className="bg-[#FFFDF9] border border-[#E5DBC7] rounded-3xl p-6 sm:p-8 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
              <div>
                <span className="text-xs font-mono font-bold text-[#6A9B48] uppercase">
                  PRD Section 3.1 & 8.4: Quality & Dispute Resolution
                </span>
                <h3 className="text-xl font-bold text-[#0D2E1C]">Transit Delays & Produce Quality Claims</h3>
                <p className="text-xs text-[#506155] mt-0.5">
                  Handle damaged perishable claims, road transit delay reports, and execute instant buyer refund authorizations.
                </p>
              </div>
              <span className="text-xs font-bold text-[#0D2E1C] bg-[#FAF8F2] px-3 py-1.5 rounded-xl border border-[#E5DBC7]">
                {disputes.filter((d) => d.status === "open").length} Open Claims
              </span>
            </div>

            <div className="space-y-4">
              {disputes.map((claim) => (
                <div
                  key={claim.id}
                  className="p-5 rounded-2xl bg-[#FAF8F2] border border-[#E5DBC7] flex flex-col md:flex-row items-start md:items-center justify-between gap-4"
                >
                  <div className="space-y-1.5 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-xs text-[#0D2E1C]">{claim.orderReference}</span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#FAF8F2] border border-[#E5DBC7] uppercase text-[#6E7E74]">
                        {claim.type.replace(/_/g, " ")}
                      </span>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                          claim.status === "resolved"
                            ? "bg-[#6A9B48]/15 text-[#6A9B48]"
                            : claim.status === "refunded"
                            ? "bg-red-100 text-red-700"
                            : "bg-[#B5BA3E]/20 text-[#0D2E1C]"
                        }`}
                      >
                        {claim.status}
                      </span>
                    </div>

                    <div className="text-xs font-bold text-[#0D2E1C]">
                      Produce: {claim.cropName} • Farmer: {claim.farmerName} • Buyer: {claim.buyerName}
                    </div>

                    <p className="text-xs text-[#506155] leading-relaxed italic">
                      &ldquo;{claim.description}&rdquo;
                    </p>

                    {claim.resolutionNotes && (
                      <div className="text-[11px] text-[#6A9B48] font-semibold pt-1">
                        Resolution: {claim.resolutionNotes}
                      </div>
                    )}
                  </div>

                  {claim.status === "open" ? (
                    <button
                      onClick={() => {
                        setSelectedDispute(claim);
                        setResolutionNotes("");
                      }}
                      className="px-4 py-2 bg-[#0D2E1C] hover:bg-[#134229] text-[#CFE73B] text-xs font-bold rounded-xl transition-colors cursor-pointer shrink-0"
                    >
                      ⚖️ Adjudicate Claim
                    </button>
                  ) : (
                    <span className="text-xs font-bold text-[#6A9B48] shrink-0">
                      ✓ Closed on {new Date(claim.resolvedAt || "").toLocaleDateString()}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Dispute Resolution Modal */}
        {selectedDispute && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-[#FFFDF9] border border-[#E5DBC7] rounded-3xl max-w-md w-full p-6 shadow-2xl animate-fade-in text-[#0D2E1C]">
              <div className="flex justify-between items-center border-b border-[#E5DBC7] pb-3 mb-4">
                <h3 className="text-base font-black text-[#0D2E1C]">Adjudicate Customer Dispute</h3>
                <button
                  onClick={() => setSelectedDispute(null)}
                  className="text-sm font-bold text-[#6E7E74] hover:text-[#0D2E1C]"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleSubmitDisputeResolution} className="space-y-4">
                <div className="p-3 bg-[#FAF8F2] rounded-xl border border-[#E5DBC7] text-xs space-y-1">
                  <div className="font-bold">Order: {selectedDispute.orderReference}</div>
                  <div>Crop: {selectedDispute.cropName}</div>
                  <div className="text-[#506155] italic">&ldquo;{selectedDispute.description}&rdquo;</div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#0D2E1C] uppercase tracking-wider mb-1">
                    Resolution Decision
                  </label>
                  <select
                    value={resolutionAction}
                    onChange={(e: any) => setResolutionAction(e.target.value)}
                    className="w-full px-3 py-2 bg-[#FAF8F2] border border-[#E5DBC7] rounded-xl text-xs font-semibold text-[#0D2E1C] focus:outline-none"
                  >
                    <option value="resolved">Approve Harvest Replacement Dispatch (Mark Resolved)</option>
                    <option value="refunded">Execute 100% Escrow Refund to Buyer</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#0D2E1C] uppercase tracking-wider mb-1">
                    Administrative Notes & Quality Memo
                  </label>
                  <textarea
                    rows={3}
                    value={resolutionNotes}
                    onChange={(e) => setResolutionNotes(e.target.value)}
                    placeholder="Enter details of action taken with farmer and customer..."
                    required
                    className="w-full px-3 py-2 bg-[#FAF8F2] border border-[#E5DBC7] rounded-xl text-xs text-[#0D2E1C] focus:outline-none"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setSelectedDispute(null)}
                    className="px-4 py-2 bg-[#FAF8F2] border border-[#E5DBC7] text-xs font-bold rounded-xl"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmittingResolution}
                    className="px-5 py-2 bg-[#0D2E1C] hover:bg-[#134229] text-[#CFE73B] text-xs font-bold rounded-xl transition-colors cursor-pointer"
                  >
                    {isSubmittingResolution ? "Saving..." : "Confirm Adjudication"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
