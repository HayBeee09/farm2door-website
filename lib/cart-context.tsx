"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { ProduceUnit } from "@/lib/supabase/types";

export interface CartItem {
  productId: string;
  name: string;
  price: number;
  unit: ProduceUnit;
  quantity: number;
  stock: number;
  imageUrl: string;
  farmerName: string;
  location: string;
  categoryId: number;
  categoryName: string;
}

export interface PlacedOrder {
  orderId: string;
  orderReference: string;
  totalAmount: number;
  deliveryAddress: string;
  deliveryPhone: string;
  items: CartItem[];
  createdAt: string;
  status?: string;
  isPaid?: boolean;
  paymentChannel?: string;
}

interface CartContextType {
  items: CartItem[];
  totalCount: number;
  subtotal: number;
  transitFee: number;
  grandTotal: number;
  farmersCount: number;
  isCartOpen: boolean;
  setIsCartOpen: (open: boolean) => void;
  isCheckoutModalOpen: boolean;
  setIsCheckoutModalOpen: (open: boolean) => void;
  lastOrder: PlacedOrder | null;
  setLastOrder: (order: PlacedOrder | null) => void;
  addToCart: (product: {
    id: string;
    name: string;
    price: number;
    unit: ProduceUnit;
    stock: number;
    imageUrl: string;
    farmerName: string;
    location: string;
    categoryId: number;
    categoryName: string;
  }, quantity?: number) => boolean;
  updateQuantity: (productId: string, delta: number) => void;
  setQuantity: (productId: string, quantity: number) => void;
  removeFromCart: (productId: string) => void;
  clearCart: () => void;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

const STORAGE_KEY = "farm2door_cart_v1";
const STANDARD_TRANSIT_FEE = 1500; // ₦1,500 Intra-Ekiti standard delivery

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [isInitialized, setIsInitialized] = useState(false);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isCheckoutModalOpen, setIsCheckoutModalOpen] = useState(false);
  const [lastOrder, setLastOrder] = useState<PlacedOrder | null>(null);

  // Load cart from LocalStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          setItems(parsed);
        }
      }
    } catch (err) {
      console.warn("Could not parse saved cart:", err);
    } finally {
      setIsInitialized(true);
    }
  }, []);

  // Save cart to LocalStorage on updates
  useEffect(() => {
    if (!isInitialized) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch (err) {
      console.warn("Could not save cart to LocalStorage:", err);
    }
  }, [items, isInitialized]);

  const totalCount = items.reduce((sum, item) => sum + item.quantity, 0);
  const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const transitFee = items.length > 0 ? STANDARD_TRANSIT_FEE : 0;
  const grandTotal = subtotal + transitFee;

  // Distinct farmers calculation
  const uniqueFarmers = new Set(items.map((i) => i.farmerName));
  const farmersCount = uniqueFarmers.size;

  const addToCart = useCallback(
    (product: {
      id: string;
      name: string;
      price: number;
      unit: ProduceUnit;
      stock: number;
      imageUrl: string;
      farmerName: string;
      location: string;
      categoryId: number;
      categoryName: string;
    }, quantity: number = 1): boolean => {
      if (product.stock <= 0) return false;

      let success = true;
      setItems((prev) => {
        const existingIndex = prev.findIndex((i) => i.productId === product.id);
        if (existingIndex > -1) {
          const current = prev[existingIndex];
          const newQty = Math.min(product.stock, current.quantity + quantity);
          if (newQty === current.quantity) {
            success = false; // Max stock reached
            return prev;
          }
          const updated = [...prev];
          updated[existingIndex] = {
            ...current,
            quantity: newQty,
            stock: product.stock,
            price: product.price,
          };
          return updated;
        }

        // New item
        return [
          ...prev,
          {
            productId: product.id,
            name: product.name,
            price: product.price,
            unit: product.unit,
            quantity: Math.min(product.stock, Math.max(1, quantity)),
            stock: product.stock,
            imageUrl: product.imageUrl,
            farmerName: product.farmerName,
            location: product.location,
            categoryId: product.categoryId,
            categoryName: product.categoryName,
          },
        ];
      });

      return success;
    },
    []
  );

  const updateQuantity = useCallback((productId: string, delta: number) => {
    setItems((prev) =>
      prev
        .map((item) => {
          if (item.productId === productId) {
            const newQty = item.quantity + delta;
            if (newQty <= 0) return null;
            // Bound by available stock
            return { ...item, quantity: Math.min(item.stock, newQty) };
          }
          return item;
        })
        .filter(Boolean) as CartItem[]
    );
  }, []);

  const setQuantity = useCallback((productId: string, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(productId);
      return;
    }
    setItems((prev) =>
      prev.map((item) =>
        item.productId === productId
          ? { ...item, quantity: Math.min(item.stock, quantity) }
          : item
      )
    );
  }, []);

  const removeFromCart = useCallback((productId: string) => {
    setItems((prev) => prev.filter((i) => i.productId !== productId));
  }, []);

  const clearCart = useCallback(() => {
    setItems([]);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // Ignore
    }
  }, []);

  return (
    <CartContext.Provider
      value={{
        items,
        totalCount,
        subtotal,
        transitFee,
        grandTotal,
        farmersCount,
        isCartOpen,
        setIsCartOpen,
        isCheckoutModalOpen,
        setIsCheckoutModalOpen,
        lastOrder,
        setLastOrder,
        addToCart,
        updateQuantity,
        setQuantity,
        removeFromCart,
        clearCart,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error("useCart must be used within a CartProvider");
  }
  return context;
}
