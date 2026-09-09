import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase } from "@/utils/supabase/server";
import { ProduceUnit } from "@/lib/supabase/types";

const VALID_UNITS: ProduceUnit[] = ["tuber", "basket", "crate", "bundle", "50kg bag"];
// Fallback demo farmer ID from seed data (Babatunde Agro) for developer evaluation
const DEMO_FARMER_ID = "11111111-1111-1111-1111-111111111111";

export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerSupabase();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const { searchParams } = new URL(request.url);
    const requestedFarmerId = searchParams.get("farmer_id");

    // Resolve farmer identity: user's authenticated ID or explicit demo/seed ID
    const farmerId = user?.id || requestedFarmerId || DEMO_FARMER_ID;

    // Fetch products belonging to this farmer
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
        updated_at,
        categories (
          id,
          name,
          slug,
          icon
        )
      `)
      .eq("farmer_id", farmerId)
      .order("created_at", { ascending: false });

    const status = searchParams.get("status");
    if (status === "active") {
      query = query.eq("is_available", true);
    } else if (status === "inactive") {
      query = query.eq("is_available", false);
    }

    const { data: products, error } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Format products for frontend consumption
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const formatted = (products || []).map((p: any) => ({
      id: p.id,
      farmerId: p.farmer_id,
      name: p.name,
      description: p.description || "",
      unit: p.unit as ProduceUnit,
      price: Number(p.price_per_unit),
      stock: p.stock_quantity,
      isAvailable: p.is_available,
      imageUrl: p.image_url,
      harvestTime: p.harvest_time || "Freshly Harvested",
      categoryId: p.category_id,
      categoryName: p.categories?.name || "Produce",
      categoryIcon: p.categories?.icon || "🌱",
      createdAt: p.created_at,
      updatedAt: p.updated_at,
    }));

    return NextResponse.json({
      success: true,
      farmerId,
      count: formatted.length,
      products: formatted,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Error fetching farmer products";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabase();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const body = await request.json();
    const {
      name,
      category_id,
      unit,
      price_per_unit,
      stock_quantity,
      harvest_time,
      image_url,
      description,
      demo_farmer_id,
    } = body;

    // Resolve farmer identity
    const farmerId = user?.id || demo_farmer_id || DEMO_FARMER_ID;

    // Validation
    if (!name || typeof name !== "string" || name.trim().length < 2) {
      return NextResponse.json(
        { error: "Valid produce name is required (min 2 characters)" },
        { status: 400 }
      );
    }

    const categoryIdNum = parseInt(category_id, 10);
    if (isNaN(categoryIdNum) || categoryIdNum < 1 || categoryIdNum > 6) {
      return NextResponse.json(
        { error: "Category ID must be between 1 and 6 (PRD Categories)" },
        { status: 400 }
      );
    }

    if (!unit || !VALID_UNITS.includes(unit)) {
      return NextResponse.json(
        { error: `Invalid harvest unit. Must be one of: ${VALID_UNITS.join(", ")}` },
        { status: 400 }
      );
    }

    const priceNum = parseFloat(price_per_unit);
    if (isNaN(priceNum) || priceNum <= 0) {
      return NextResponse.json(
        { error: "Price per unit must be a positive number in Naira (₦)" },
        { status: 400 }
      );
    }

    const stockNum = parseInt(stock_quantity, 10);
    if (isNaN(stockNum) || stockNum < 0) {
      return NextResponse.json(
        { error: "Stock quantity must be a non-negative integer" },
        { status: 400 }
      );
    }

    // PRD FR-2.3: Automatic zero-stock deactivation
    const isAvailable = stockNum > 0;

    const defaultImage = "/images/produce/yam-tubers.jpg";
    const imageUrlToUse = (image_url && typeof image_url === "string" && image_url.trim())
      ? image_url.trim()
      : defaultImage;

    // Insert new product
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: newProduct, error } = await (supabase as any)
      .from("products")
      .insert({
        farmer_id: farmerId,
        category_id: categoryIdNum,
        name: name.trim(),
        description: description?.trim() || null,
        unit: unit as ProduceUnit,
        price_per_unit: priceNum,
        stock_quantity: stockNum,
        is_available: isAvailable,
        image_url: imageUrlToUse,
        harvest_time: harvest_time?.trim() || "Fresh Morning Harvest",
      })
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
        )
      `)
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      product: {
        id: newProduct.id,
        farmerId: newProduct.farmer_id,
        name: newProduct.name,
        description: newProduct.description || "",
        unit: newProduct.unit,
        price: Number(newProduct.price_per_unit),
        stock: newProduct.stock_quantity,
        isAvailable: newProduct.is_available,
        imageUrl: newProduct.image_url,
        harvestTime: newProduct.harvest_time,
        categoryId: newProduct.category_id,
        categoryName: newProduct.categories?.name || "Produce",
        categoryIcon: newProduct.categories?.icon || "🌱",
        createdAt: newProduct.created_at,
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Error creating product listing";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
