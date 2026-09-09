"use client";

import React, { useState, useEffect } from "react";
import { useAuth, RegisterPayload } from "@/lib/auth-context";

const EKITI_COMMUNITIES = [
  "Ikere-Ekiti",
  "Ado-Ekiti",
  "Igbemo-Ekiti",
  "Oye-Ekiti",
  "Emure-Ekiti",
  "Ijero-Ekiti",
  "Ilawe-Ekiti",
  "Efon-Alaaye",
  "Other Ekiti Farmstead",
];

export default function AuthModal() {
  const {
    isAuthModalOpen,
    authModalMode,
    authModalDefaultRole,
    closeAuthModal,
    login,
    register,
  } = useAuth();

  const [mode, setMode] = useState<"login" | "register">("login");
  const [role, setRole] = useState<"buyer" | "farmer">("buyer");
  const [showPassword, setShowPassword] = useState(false);

  // Form Fields
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [farmName, setFarmName] = useState("");
  const [farmLocation, setFarmLocation] = useState(EKITI_COMMUNITIES[0]);
  const [address, setAddress] = useState("");

  // Status
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    if (isAuthModalOpen) {
      setMode(authModalMode);
      setRole(authModalDefaultRole);
      setErrorMessage(null);
      setSuccessMessage(null);
    }
  }, [isAuthModalOpen, authModalMode, authModalDefaultRole]);

  // Handle ESC key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isAuthModalOpen) {
        closeAuthModal();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isAuthModalOpen, closeAuthModal]);

  if (!isAuthModalOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);
    setIsLoading(true);

    try {
      if (mode === "login") {
        if (!email || !password) {
          setErrorMessage("Please enter both email and password.");
          setIsLoading(false);
          return;
        }

        const result = await login(email, password);
        if (!result.success) {
          setErrorMessage(result.error || "Failed to sign in. Please verify your credentials.");
        } else {
          setSuccessMessage("Signed in successfully! Welcome back.");
          setTimeout(() => {
            closeAuthModal();
          }, 800);
        }
      } else {
        // Register
        if (!email || !password || !fullName || !phone) {
          setErrorMessage("Please fill in all mandatory fields.");
          setIsLoading(false);
          return;
        }

        if (password.length < 6) {
          setErrorMessage("Password must be at least 6 characters long.");
          setIsLoading(false);
          return;
        }

        if (role === "farmer" && !farmName) {
          setErrorMessage("Please enter your farm or enterprise name.");
          setIsLoading(false);
          return;
        }

        const payload: RegisterPayload = {
          email,
          password,
          full_name: fullName,
          phone,
          role,
          farm_name: role === "farmer" ? farmName : undefined,
          farm_location: role === "farmer" ? farmLocation : undefined,
          address: role === "buyer" ? address : undefined,
        };

        const result = await register(payload);
        if (!result.success) {
          setErrorMessage(result.error || "Failed to create account. Please try again.");
        } else {
          setSuccessMessage("Account created successfully! Welcome to Farm2Door.");
          setTimeout(() => {
            closeAuthModal();
          }, 900);
        }
      }
    } catch {
      setErrorMessage("An unexpected error occurred. Please check your network connection.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0D2E1C]/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        className="relative w-full max-w-lg bg-[#FAF8F2] border border-[#E5DBC7] rounded-2xl shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Ribbon */}
        <div className="bg-[#0D2E1C] px-6 py-5 text-white flex items-center justify-between border-b border-[#1B3B22]">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-lg bg-[#1B3B22] border border-[#2B5436] flex items-center justify-center text-xl">
              🌾
            </div>
            <div>
              <h2 className="text-lg font-bold tracking-tight text-[#FAF8F2]">
                {mode === "login" ? "Sign In to Farm2Door" : "Join Farm2Door Nigeria"}
              </h2>
              <p className="text-xs text-[#E5DBC7]">
                {mode === "login"
                  ? "Access your buyer orders or farmer produce inventory"
                  : "Direct farm-to-door access across Ekiti State"}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={closeAuthModal}
            className="text-[#E5DBC7] hover:text-white p-1.5 rounded-lg hover:bg-[#1B3B22] transition-colors"
            aria-label="Close modal"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Mode Switcher Tabs */}
        <div className="grid grid-cols-2 p-1.5 bg-[#F2ECE0] border-b border-[#E5DBC7]">
          <button
            type="button"
            onClick={() => {
              setMode("login");
              setErrorMessage(null);
            }}
            className={`py-2 text-xs font-semibold rounded-lg transition-all ${
              mode === "login"
                ? "bg-[#0D2E1C] text-[#FAF8F2] shadow-xs"
                : "text-[#4F6A52] hover:text-[#0D2E1C]"
            }`}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => {
              setMode("register");
              setErrorMessage(null);
            }}
            className={`py-2 text-xs font-semibold rounded-lg transition-all ${
              mode === "register"
                ? "bg-[#0D2E1C] text-[#FAF8F2] shadow-xs"
                : "text-[#4F6A52] hover:text-[#0D2E1C]"
            }`}
          >
            Create Account
          </button>
        </div>

        <div className="p-6 max-h-[80vh] overflow-y-auto">
          {/* Status Feedback */}
          {errorMessage && (
            <div className="mb-4 p-3 bg-[#FEF2F2] border border-[#FCA5A5] rounded-xl text-xs text-[#991B1B] flex items-start space-x-2">
              <span className="font-bold">⚠️</span>
              <span>{errorMessage}</span>
            </div>
          )}

          {successMessage && (
            <div className="mb-4 p-3 bg-[#F0FDF4] border border-[#86EFAC] rounded-xl text-xs text-[#166534] flex items-start space-x-2">
              <span className="font-bold">✓</span>
              <span>{successMessage}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Registration Role Switcher */}
            {mode === "register" && (
              <div className="space-y-2">
                <label className="block text-xs font-semibold uppercase tracking-wider text-[#4F6A52]">
                  Select Your Account Type
                </label>
                <div className="grid grid-cols-2 gap-3">
                  {/* Buyer Option */}
                  <button
                    type="button"
                    onClick={() => setRole("buyer")}
                    className={`p-3 rounded-xl border text-left transition-all ${
                      role === "buyer"
                        ? "border-[#0D2E1C] bg-[#FFFDF9] ring-2 ring-[#0D2E1C]"
                        : "border-[#E5DBC7] bg-white hover:border-[#6A9B48]"
                    }`}
                  >
                    <div className="flex items-center space-x-2">
                      <span className="text-lg">🛒</span>
                      <span className="text-xs font-bold text-[#0D2E1C]">Buyer / Household</span>
                    </div>
                    <p className="text-[11px] text-[#4F6A52] mt-1 leading-snug">
                      Fresh farm produce delivered with escrow guarantee.
                    </p>
                  </button>

                  {/* Farmer Option */}
                  <button
                    type="button"
                    onClick={() => setRole("farmer")}
                    className={`p-3 rounded-xl border text-left transition-all ${
                      role === "farmer"
                        ? "border-[#0D2E1C] bg-[#FFFDF9] ring-2 ring-[#0D2E1C]"
                        : "border-[#E5DBC7] bg-white hover:border-[#6A9B48]"
                    }`}
                  >
                    <div className="flex items-center space-x-2">
                      <span className="text-lg">🚜</span>
                      <span className="text-xs font-bold text-[#0D2E1C]">Ekiti Farmer</span>
                    </div>
                    <p className="text-[11px] text-[#4F6A52] mt-1 leading-snug">
                      List harvests, set farm-gate price, reach buyers directly.
                    </p>
                  </button>
                </div>
              </div>
            )}

            {/* Registration Extra Fields */}
            {mode === "register" && (
              <>
                <div>
                  <label className="block text-xs font-semibold text-[#1B3B22] mb-1">
                    Full Name <span className="text-red-600">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="e.g. Babatunde Olawale"
                    className="w-full px-3.5 py-2.5 bg-white border border-[#E5DBC7] rounded-xl text-sm text-[#0D2E1C] focus:outline-none focus:border-[#0D2E1C] focus:ring-1 focus:ring-[#0D2E1C]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#1B3B22] mb-1">
                    Phone Number (WhatsApp preferred) <span className="text-red-600">*</span>
                  </label>
                  <input
                    type="tel"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="e.g. 0803 123 4567"
                    className="w-full px-3.5 py-2.5 bg-white border border-[#E5DBC7] rounded-xl text-sm text-[#0D2E1C] focus:outline-none focus:border-[#0D2E1C] focus:ring-1 focus:ring-[#0D2E1C]"
                  />
                </div>

                {role === "farmer" && (
                  <div className="p-3.5 bg-[#FFFDF9] border border-[#E5DBC7] rounded-xl space-y-3">
                    <div className="flex items-center space-x-2 text-xs font-bold text-[#0D2E1C]">
                      <span>🌱</span>
                      <span>Farmstead Credentials</span>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-[#1B3B22] mb-1">
                        Farm / Enterprise Name <span className="text-red-600">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={farmName}
                        onChange={(e) => setFarmName(e.target.value)}
                        placeholder="e.g. Babatunde Agro Allied Enterprises"
                        className="w-full px-3 py-2 bg-white border border-[#E5DBC7] rounded-lg text-xs text-[#0D2E1C] focus:outline-none focus:border-[#0D2E1C]"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-[#1B3B22] mb-1">
                        Farming Community in Ekiti <span className="text-red-600">*</span>
                      </label>
                      <select
                        value={farmLocation}
                        onChange={(e) => setFarmLocation(e.target.value)}
                        className="w-full px-3 py-2 bg-white border border-[#E5DBC7] rounded-lg text-xs text-[#0D2E1C] focus:outline-none focus:border-[#0D2E1C]"
                      >
                        {EKITI_COMMUNITIES.map((comm) => (
                          <option key={comm} value={comm}>
                            {comm}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                )}

                {role === "buyer" && (
                  <div>
                    <label className="block text-xs font-semibold text-[#1B3B22] mb-1">
                      Delivery Address / Town (Optional)
                    </label>
                    <input
                      type="text"
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      placeholder="e.g. Adebayo Area, Ado-Ekiti"
                      className="w-full px-3.5 py-2.5 bg-white border border-[#E5DBC7] rounded-xl text-sm text-[#0D2E1C] focus:outline-none focus:border-[#0D2E1C]"
                    />
                  </div>
                )}
              </>
            )}

            {/* Email & Password (Common) */}
            <div>
              <label className="block text-xs font-semibold text-[#1B3B22] mb-1">
                Email Address <span className="text-red-600">*</span>
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com"
                className="w-full px-3.5 py-2.5 bg-white border border-[#E5DBC7] rounded-xl text-sm text-[#0D2E1C] focus:outline-none focus:border-[#0D2E1C] focus:ring-1 focus:ring-[#0D2E1C]"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-semibold text-[#1B3B22]">
                  Password <span className="text-red-600">*</span>
                </label>
                {mode === "login" && (
                  <span className="text-[11px] text-[#6A9B48] hover:underline cursor-pointer">
                    Forgot password?
                  </span>
                )}
              </div>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Min. 6 characters"
                  className="w-full px-3.5 py-2.5 bg-white border border-[#E5DBC7] rounded-xl text-sm text-[#0D2E1C] focus:outline-none focus:border-[#0D2E1C] focus:ring-1 focus:ring-[#0D2E1C] pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#4F6A52] hover:text-[#0D2E1C] text-xs font-medium"
                >
                  {showPassword ? "Hide" : "Show"}
                </button>
              </div>
            </div>

            {/* Submit CTA */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full mt-2 py-3 bg-[#0D2E1C] hover:bg-[#1B3B22] text-[#FAF8F2] font-semibold text-sm rounded-xl transition-all shadow-sm flex items-center justify-center space-x-2 disabled:opacity-60 cursor-pointer"
            >
              {isLoading ? (
                <>
                  <svg className="animate-spin h-4 w-4 text-[#CFE73B]" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                  <span>Processing...</span>
                </>
              ) : mode === "login" ? (
                <span>Sign In to Your Account</span>
              ) : (
                <span>Complete {role === "farmer" ? "Farmer" : "Buyer"} Registration</span>
              )}
            </button>

            {/* Switch Mode Prompt */}
            <div className="pt-2 text-center text-xs text-[#4F6A52]">
              {mode === "login" ? (
                <span>
                  Don&apos;t have an account?{" "}
                  <button
                    type="button"
                    onClick={() => {
                      setMode("register");
                      setErrorMessage(null);
                    }}
                    className="font-bold text-[#0D2E1C] hover:underline cursor-pointer"
                  >
                    Create one now
                  </button>
                </span>
              ) : (
                <span>
                  Already registered?{" "}
                  <button
                    type="button"
                    onClick={() => {
                      setMode("login");
                      setErrorMessage(null);
                    }}
                    className="font-bold text-[#0D2E1C] hover:underline cursor-pointer"
                  >
                    Sign In
                  </button>
                </span>
              )}
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
