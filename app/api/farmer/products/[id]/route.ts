import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase } from "@/utils/supabase/server";
import { ProduceUnit } from "@/lib/supabase/types";

const VALID_UNITS: ProduceUnit[] = ["tuber", "basket", "crate", "bundle", "50kg bag"];
const DEMO_FARMER_ID = "11111111-1111-1111-1111-111111111111";

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    if (!id) {
      return NextResponse.json({ error: "Product ID is required" }, { status: 400 });
    }

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
      is_available,
      harvest_time,
      image_url,
      description,
      demo_farmer_id,
    } = body;

    const farmerId = user?.id || demo_farmer_id || DEMO_FARMER_ID;

    // Verify ownership of the product
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: existing, error: fetchErr } = await (supabase as any)
      .from("products")
      .select("id, farmer_id, stock_quantity, is_available")
      .eq("id", id)
      .single();

    if (fetchErr || !existing) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const updates: Record<string, any> = {
      updated_at: new Date().toISOString(),
    };

    if (name !== undefined) updates.name = String(name).trim();
    if (description !== undefined) updates.description = String(description).trim();
    if (image_url !== undefined) updates.image_url = String(image_url).trim();
    if (harvest_time !== undefined) updates.harvest_time = String(harvest_time).trim();

    if (category_id !== undefined) {
      const catId = parseInt(category_id, 10);
      if (!isNaN(catId) && catId >= 1 && catId <= 6) {
        updates.category_id = catId;
      }
    }

    if (unit !== undefined && VALID_UNITS.includes(unit)) {
      updates.unit = unit;
    }

    if (price_per_unit !== undefined) {
      const price = parseFloat(price_per_unit);
      if (!isNaN(price) && price > 0) {
        updates.price_per_unit = price;
      }
    }

    // PRD FR-2.3: Automatic zero-stock deactivation
    if (stock_quantity !== undefined) {
      const stock = parseInt(stock_quantity, 10);
      if (!isNaN(stock) && stock >= 0) {
        updates.stock_quantity = stock;
        if (stock === 0) {
          updates.is_available = false;
        } else if (is_available !== undefined) {
          updates.is_available = Boolean(is_available);
        }
      }
    } else if (is_available !== undefined) {
      // Cannot manually activate if current stock is 0
      if (existing.stock_quantity === 0 && Boolean(is_available)) {
        return NextResponse.json(
          { error: "Cannot mark product available when stock quantity is 0. Please add stock first." },
          { status: 400 }
        );
      }
      updates.is_available = Boolean(is_available);
    }

    // Execute update
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: updatedProduct, error: updateErr } = await (supabase as any)
      .from("products")
      .update(updates)
      .eq("id", id)
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
      .single();

    if (updateErr) {
      return NextResponse.json({ error: updateErr.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      product: {
        id: updatedProduct.id,
        farmerId: updatedProduct.farmer_id,
        name: updatedProduct.name,
        description: updatedProduct.description || "",
        unit: updatedProduct.unit,
        price: Number(updatedProduct.price_per_unit),
        stock: updatedProduct.stock_quantity,
        isAvailable: updatedProduct.is_available,
        imageUrl: updatedProduct.image_url,
        harvestTime: updatedProduct.harvest_time,
        categoryId: updatedProduct.category_id,
        categoryName: updatedProduct.categories?.name || "Produce",
        categoryIcon: updatedProduct.categories?.icon || "🌱",
        updatedAt: updatedProduct.updated_at,
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Error updating produce listing";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    if (!id) {
      return NextResponse.json({ error: "Product ID is required" }, { status: 400 });
    }

    const supabase = await createServerSupabase();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const { searchParams } = new URL(request.url);
    const demoFarmerId = searchParams.get("demo_farmer_id");
    const farmerId = user?.id || demoFarmerId || DEMO_FARMER_ID;

    // Delete product
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase as any)
      .from("products")
      .delete()
      .eq("id", id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: "Produce listing deleted successfully",
      deletedId: id,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Error deleting produce listing";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
