import { NextResponse } from "next/server";
import { createServerSupabase } from "@/utils/supabase/server";

export async function GET() {
  try {
    const supabase = await createServerSupabase();

    // 1. Fetch categories
    const { data: categories, error: catError } = await supabase
      .from("categories")
      .select("id, name, slug, icon, description")
      .order("id", { ascending: true });

    if (catError) {
      return NextResponse.json({ error: catError.message }, { status: 500 });
    }

    // 2. Fetch available products to calculate counts per category
    const { data: products } = await supabase
      .from("products")
      .select("category_id")
      .eq("is_available", true);

    const counts: Record<number, number> = {};
    let totalActive = 0;

    if (products) {
      products.forEach((p) => {
        counts[p.category_id] = (counts[p.category_id] || 0) + 1;
        totalActive++;
      });
    }

    const categoriesWithCounts = (categories || []).map((cat) => ({
      ...cat,
      product_count: counts[cat.id] || 0,
    }));

    return NextResponse.json(
      {
        success: true,
        total_products: totalActive,
        categories: categoriesWithCounts,
      },
      {
        headers: {
          "Cache-Control": "public, s-maxage=30, stale-while-revalidate=60",
        },
      }
    );
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Internal server error fetching categories";
    return NextResponse.json({ error: errorMsg }, { status: 500 });
  }
}
