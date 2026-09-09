import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const viewport: Viewport = {
  themeColor: "#0D2E1C",
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

export const metadata: Metadata = {
  title: "Farm2Door — Where Freshness Finds You...",
  description:
    "Direct-to-consumer agricultural marketplace connecting local smallholder farmers directly with households, restaurants, and retailers with transparent pricing.",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Farm2Door",
  },
  icons: {
    icon: "/icons/icon-192.svg",
    apple: "/icons/icon-192.svg",
  },
};

import { AuthProvider } from "@/lib/auth-context";
import { CartProvider } from "@/lib/cart-context";
import AuthModal from "@/components/auth/AuthModal";
import CartDrawer from "@/components/cart/CartDrawer";
import CheckoutModal from "@/components/cart/CheckoutModal";
import PwaInstallPrompt from "@/components/pwa/PwaInstallPrompt";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-[#FAF8F2] text-[#0D2E1C]">
        <AuthProvider>
          <CartProvider>
            {children}
            <AuthModal />
            <CartDrawer />
            <CheckoutModal />
            <PwaInstallPrompt />
          </CartProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
