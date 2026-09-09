"use client";

import React, { useState, useEffect } from "react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export default function PwaInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstallable, setIsInstallable] = useState(false);
  const [isIos, setIsIos] = useState(false);
  const [showIosGuide, setShowIosGuide] = useState(false);
  const [isDismissed, setIsDismissed] = useState(true);

  useEffect(() => {
    // Check if dismissed previously
    const dismissed = localStorage.getItem("farm2door_pwa_dismissed");
    if (dismissed === "true") return;

    // Check if already running in standalone mode (installed)
    const isStandalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone === true;

    if (isStandalone) return;

    setIsDismissed(false);

    // 1. Android / Chrome beforeinstallprompt handler
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setIsInstallable(true);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

    // 2. Detect iOS Safari
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIosDevice = /iphone|ipad|ipod/.test(userAgent);
    const isSafari = /safari/.test(userAgent) && !/chrome|crios|fxios/.test(userAgent);

    if (isIosDevice && isSafari) {
      setIsIos(true);
    }

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      await deferredPrompt.prompt();
      const choiceResult = await deferredPrompt.userChoice;
      if (choiceResult.outcome === "accepted") {
        setIsDismissed(true);
      }
      setDeferredPrompt(null);
      setIsInstallable(false);
    } else if (isIos) {
      setShowIosGuide(!showIosGuide);
    }
  };

  const handleDismiss = () => {
    setIsDismissed(true);
    try {
      localStorage.setItem("farm2door_pwa_dismissed", "true");
    } catch {
      // Ignore localStorage error
    }
  };

  if (isDismissed || (!isInstallable && !isIos)) {
    return null;
  }

  return (
    <div className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-6 sm:max-w-md z-40 animate-fade-in">
      <div className="bg-[#0D2E1C] text-white p-4 sm:p-5 rounded-2xl border border-[#2B5436] shadow-2xl flex flex-col gap-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-[#FAF8F2] flex items-center justify-center text-xl shrink-0">
              🌱
            </div>
            <div>
              <h3 className="text-xs font-bold text-white flex items-center gap-1.5">
                <span>Install Farm2Door App</span>
                <span className="px-1.5 py-0.5 rounded-full bg-[#CFE73B] text-[#0D2E1C] text-[9px] font-black uppercase">
                  PWA
                </span>
              </h3>
              <p className="text-[11px] text-[#CFE73B]/90 mt-0.5">
                Fast, instant access to Ekiti fresh produce on your home screen.
              </p>
            </div>
          </div>

          <button
            onClick={handleDismiss}
            aria-label="Dismiss app install banner"
            className="text-white/60 hover:text-white text-xs p-1 cursor-pointer transition-colors"
          >
            ✕
          </button>
        </div>

        {/* iOS Step-by-Step Instructions if expanded */}
        {showIosGuide && (
          <div className="p-3 bg-[#1B3B22] rounded-xl border border-[#2B5436] text-[11px] text-[#FAF8F2] space-y-1.5">
            <p className="font-bold text-[#CFE73B]">How to install on iPhone / iPad:</p>
            <ol className="list-decimal list-inside space-y-1 text-white/90">
              <li>Tap the <strong className="text-white">Share button</strong> (⎋) in your Safari toolbar.</li>
              <li>Scroll down and select <strong className="text-white">Add to Home Screen</strong> (⊞).</li>
              <li>Tap <strong className="text-white">Add</strong> in the top right corner.</li>
            </ol>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex items-center justify-end space-x-2 pt-1">
          <button
            onClick={handleDismiss}
            className="px-3 py-1.5 text-xs text-white/70 hover:text-white transition-colors cursor-pointer"
          >
            Maybe Later
          </button>
          <button
            onClick={handleInstallClick}
            className="px-4 py-2 bg-[#CFE73B] hover:bg-[#b5ba3e] text-[#0D2E1C] text-xs font-black rounded-xl transition-colors shadow-xs flex items-center space-x-1.5 cursor-pointer"
          >
            <span>📲</span>
            <span>{isIos ? (showIosGuide ? "Hide Instructions" : "How to Install") : "Add to Home Screen"}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
