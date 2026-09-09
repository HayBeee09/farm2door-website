import { supabase } from "./client";
import { Database, ProduceUnit } from "./types";

export type ProductRow = Database["public"]["Tables"]["products"]["Row"];
export type CategoryRow = Database["public"]["Tables"]["categories"]["Row"];

export interface ProductFilters {
  categoryId?: number;
  unit?: ProduceUnit | "all";
  searchQuery?: string;
  minPrice?: number;
  maxPrice?: number;
  page?: number;
  limit?: number;
}

/**
 * Parameterized prepared query to fetch available categories.
 * Read-only, cached on CDN / client.
 */
export async function getCategories() {
  const { data, error } = await supabase
    .from("categories")
    .select("*")
    .order("id", { ascending: true });

  if (error) throw error;
  return data;
}

/**
 * Parameterized query to fetch available products with composite filtering.
 * Leverages PostgreSQL composite indexes:
 * - idx_products_category_avail (category_id, is_available)
 * - idx_products_unit_avail (unit, is_available)
 */
export async function getFilteredProducts(filters: ProductFilters = {}) {
  const {
    categoryId,
    unit,
    searchQuery,
    minPrice,
    maxPrice,
    page = 1,
    limit = 20,
  } = filters;

  let query = supabase
    .from("products")
    .select("*, farmer:farmer_id(full_name, farm_name, farm_location)")
    .eq("is_available", true);

  if (categoryId && categoryId > 0) {
    query = query.eq("category_id", categoryId);
  }

  if (unit && unit !== "all") {
    query = query.eq("unit", unit as ProduceUnit);
  }

  if (minPrice !== undefined) {
    query = query.gte("price_per_unit", minPrice);
  }

  if (maxPrice !== undefined) {
    query = query.lte("price_per_unit", maxPrice);
  }

  // Parameterized text search (safe from SQL injection)
  if (searchQuery && searchQuery.trim().length > 0) {
    const cleanSearch = searchQuery.trim();
    query = query.ilike("name", `%${cleanSearch}%`);
  }

  // Pagination bounds
  const from = (page - 1) * limit;
  const to = from + limit - 1;

  const { data, error, count } = await query
    .range(from, to)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return { products: data, totalCount: count };
}

/**
 * ACID Concurrency-locked Atomic Checkout invocation.
 * Calls PostgreSQL stored procedure `execute_atomic_checkout` which executes
 * `SELECT ... FOR UPDATE` row locks, preventing race conditions during simultaneous orders.
 */
export async function executeAtomicCheckout(params: {
  buyerId: string;
  orderReference: string;
  deliveryAddress: string;
  deliveryPhone?: string;
  transitFee: number;
  items: Array<{ product_id: string; quantity: number }>;
}) {
  const { data, error } = await (supabase.rpc as any)("execute_atomic_checkout", {
    p_buyer_id: params.buyerId,
    p_order_ref: params.orderReference,
    p_delivery_address: params.deliveryAddress,
    p_delivery_phone: params.deliveryPhone || null,
    p_transit_fee: params.transitFee,
    p_items: params.items,
  });

  if (error) throw error;
  return data;
}
