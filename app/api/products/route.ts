import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase } from "@/utils/supabase/server";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const categoryId = searchParams.get("category_id");
    const unit = searchParams.get("unit");
    const search = searchParams.get("search");
    const minPrice = searchParams.get("min_price");
    const maxPrice = searchParams.get("max_price");
    const sort = searchParams.get("sort") || "newest";
    const limit = parseInt(searchParams.get("limit") || "50", 10);

    const supabase = await createServerSupabase();

    // Base query selecting produce and relational joined entities
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let query = (supabase as any)
      .from("products")
      .select(`
        id,
        farmer_id,
        category_id,
        name,
        description,
        unit,
        price_per_unit,
        stock_quantity,
        is_available,
        image_url,
        harvest_time,
        created_at,
        categories (
          id,
          name,
          slug,
          icon
        ),
        users!farmer_id (
          id,
          full_name,
          farm_name,
          farm_location,
          is_verified
        )
      `)
      .eq("is_available", true);

    // 1. Category Filter
    if (categoryId && categoryId !== "all" && categoryId !== "0") {
      const parsedCatId = parseInt(categoryId, 10);
      if (!isNaN(parsedCatId)) {
        query = query.eq("category_id", parsedCatId);
      }
    }

    // 2. Unit Filter (tuber, basket, crate, bundle, 50kg bag)
    if (unit && unit !== "all") {
      query = query.eq("unit", unit.trim());
    }

    // 3. Price Bounds Filter
    if (minPrice) {
      const min = parseFloat(minPrice);
      if (!isNaN(min)) query = query.gte("price_per_unit", min);
    }

    if (maxPrice) {
      const max = parseFloat(maxPrice);
      if (!isNaN(max)) query = query.lte("price_per_unit", max);
    }

    // 4. Keyword Search (Matches produce name, description, farmer, or Ekiti community)
    if (search && search.trim()) {
      // Sanitize input: strip SQL meta-characters, quotes, semicolons, and commas
      const sanitized = search.trim().replace(/['",;%\\()\-]/g, " ").replace(/\s+/g, " ").trim().slice(0, 100);
      if (sanitized.length > 0) {
        try {
          const { data: matchingFarmers } = await supabase
            .from("users")
            .select("id")
            .or(`full_name.ilike.%${sanitized}%,farm_name.ilike.%${sanitized}%,farm_location.ilike.%${sanitized}%`);

          const farmerIds = matchingFarmers?.map((f: { id: string }) => f.id) || [];
          if (farmerIds.length > 0) {
            query = query.or(`name.ilike.%${sanitized}%,description.ilike.%${sanitized}%,farmer_id.in.(${farmerIds.join(",")})`);
          } else {
            query = query.or(`name.ilike.%${sanitized}%,description.ilike.%${sanitized}%`);
          }
        } catch (searchErr) {
          console.warn("Search filter sanitized notice:", searchErr);
        }
      }
    }

    // 5. Sorting
    if (sort === "price_asc") {
      query = query.order("price_per_unit", { ascending: true });
    } else if (sort === "price_desc") {
      query = query.order("price_per_unit", { ascending: false });
    } else if (sort === "stock") {
      query = query.order("stock_quantity", { ascending: false });
    } else {
      // Default: newest harvest
      query = query.order("created_at", { ascending: false });
    }

    query = query.limit(limit);

    const { data, error } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Post-filter for search across farmer name or location if search is provided
    let items = data || [];
    if (search && search.trim()) {
      const s = search.toLowerCase();
      // If direct SQL search already matched items, we also check if other items match farmer location/name
      items = items.filter((item: any) => {
        const matchName = item.name?.toLowerCase().includes(s);
        const matchDesc = item.description?.toLowerCase().includes(s);
        const matchFarmer = item.users?.full_name?.toLowerCase().includes(s);
        const matchFarm = item.users?.farm_name?.toLowerCase().includes(s);
        const matchLoc = item.users?.farm_location?.toLowerCase().includes(s);
        const matchCat = item.categories?.name?.toLowerCase().includes(s);
        return matchName || matchDesc || matchFarmer || matchFarm || matchLoc || matchCat;
      });
    }

    // Map to unified frontend Product shape with dynamic arithmetic mean ratings
    const { getReviewsForProduct } = await import("@/lib/reviews-store");

    const formattedProducts = items.map((p: any) => {
      const { stats } = getReviewsForProduct(p.id);
      return {
        id: p.id,
        name: p.name,
        description: p.description || "",
        unit: p.unit,
        price: Number(p.price_per_unit),
        stock: p.stock_quantity,
        imageUrl: p.image_url,
        harvestTime: p.harvest_time || "Harvested Recently",
        categoryId: p.category_id,
        categoryName: p.categories?.name || "Produce",
        categoryIcon: p.categories?.icon || "🌱",
        farmerName: p.users?.farm_name || p.users?.full_name || "Ekiti Smallholder Farmer",
        location: p.users?.farm_location || "Ekiti State",
        isVerifiedFarmer: p.users?.is_verified ?? true,
        rating: stats.totalReviews > 0 ? stats.averageRating : 5.0,
        reviewCount: stats.totalReviews,
      };
    });

    return NextResponse.json(
      {
        success: true,
        count: formattedProducts.length,
        products: formattedProducts,
      },
      {
        headers: {
          "Cache-Control": "public, s-maxage=10, stale-while-revalidate=59",
        },
      }
    );
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Internal server error fetching products";
    return NextResponse.json({ error: errorMsg }, { status: 500 });
  }
}
