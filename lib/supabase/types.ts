/**
 * Farm2Door — Supabase Database Types Definition
 * PRD References: Section 4, Section 6 (Data Persistence Layer)
 * System Architecture: Farm2Door Engineering Team
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type UserRole = "farmer" | "buyer" | "admin";
export type ProduceUnit = "tuber" | "basket" | "crate" | "bundle" | "50kg bag";
export type OrderStatus = "pending" | "confirmed" | "in_transit" | "delivered" | "cancelled";
export type PaymentStatus = "pending" | "successful" | "failed";

export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string;
          full_name: string;
          email: string;
          phone: string;
          password_hash: string;
          role: UserRole;
          farm_name: string | null;
          farm_location: string | null;
          address: string | null;
          is_verified: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          full_name: string;
          email: string;
          phone: string;
          password_hash?: string;
          role: UserRole;
          farm_name?: string | null;
          farm_location?: string | null;
          address?: string | null;
          is_verified?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          full_name?: string;
          email?: string;
          phone?: string;
          password_hash?: string;
          role?: UserRole;
          farm_name?: string | null;
          farm_location?: string | null;
          address?: string | null;
          is_verified?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      categories: {
        Row: {
          id: number;
          name: string;
          slug: string;
          icon: string;
          description: string;
          created_at: string;
        };
        Insert: {
          id?: number;
          name: string;
          slug: string;
          icon: string;
          description: string;
          created_at?: string;
        };
        Update: {
          id?: number;
          name?: string;
          slug?: string;
          icon?: string;
          description?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      products: {
        Row: {
          id: string;
          farmer_id: string;
          category_id: number;
          name: string;
          description: string | null;
          unit: ProduceUnit;
          price_per_unit: number;
          stock_quantity: number;
          is_available: boolean;
          image_url: string;
          harvest_time: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          farmer_id: string;
          category_id: number;
          name: string;
          description?: string | null;
          unit: ProduceUnit;
          price_per_unit: number;
          stock_quantity?: number;
          is_available?: boolean;
          image_url: string;
          harvest_time?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          farmer_id?: string;
          category_id?: number;
          name?: string;
          description?: string | null;
          unit?: ProduceUnit;
          price_per_unit?: number;
          stock_quantity?: number;
          is_available?: boolean;
          image_url?: string;
          harvest_time?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      orders: {
        Row: {
          id: string;
          buyer_id: string;
          order_reference: string;
          status: OrderStatus;
          total_amount: number;
          transit_fee: number;
          delivery_address: string;
          delivery_phone: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          buyer_id: string;
          order_reference: string;
          status?: OrderStatus;
          total_amount: number;
          transit_fee?: number;
          delivery_address: string;
          delivery_phone?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          buyer_id?: string;
          order_reference?: string;
          status?: OrderStatus;
          total_amount?: number;
          transit_fee?: number;
          delivery_address?: string;
          delivery_phone?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      order_items: {
        Row: {
          id: string;
          order_id: string;
          product_id: string;
          quantity: number;
          unit_price: number;
          subtotal: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          order_id: string;
          product_id: string;
          quantity: number;
          unit_price: number;
          subtotal: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          order_id?: string;
          product_id?: string;
          quantity?: number;
          unit_price?: number;
          subtotal?: number;
          created_at?: string;
        };
        Relationships: [];
      };
      payments: {
        Row: {
          id: string;
          order_id: string;
          payment_reference: string;
          paystack_reference: string | null;
          amount: number;
          status: PaymentStatus;
          channel: string | null;
          paid_at: string | null;
          raw_payload: Json | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          order_id: string;
          payment_reference: string;
          paystack_reference?: string | null;
          amount: number;
          status?: PaymentStatus;
          channel?: string | null;
          paid_at?: string | null;
          raw_payload?: Json | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          order_id?: string;
          payment_reference?: string;
          paystack_reference?: string | null;
          amount?: number;
          status?: PaymentStatus;
          channel?: string | null;
          paid_at?: string | null;
          raw_payload?: Json | null;
          created_at?: string;
        };
        Relationships: [];
      };
      reviews: {
        Row: {
          id: string;
          product_id: string;
          buyer_id: string;
          order_id: string | null;
          rating: number;
          comment: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          product_id: string;
          buyer_id: string;
          order_id?: string | null;
          rating: number;
          comment?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          product_id?: string;
          buyer_id?: string;
          order_id?: string | null;
          rating?: number;
          comment?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      execute_atomic_checkout: {
        Args: {
          p_buyer_id: string;
          p_order_ref: string;
          p_delivery_address: string;
          p_delivery_phone: string | null;
          p_transit_fee: number;
          p_items: Json;
        };
        Returns: Json;
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
}
