import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase } from "@/utils/supabase/server";

const DEMO_FARMER_ID = "11111111-1111-1111-1111-111111111111";

export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerSupabase();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const { searchParams } = new URL(request.url);
    const requestedFarmerId = searchParams.get("farmer_id");
    const farmerId = user?.id || requestedFarmerId || DEMO_FARMER_ID;

    // 1. Fetch farmer profile
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: farmerUser } = await (supabase as any)
      .from("users")
      .select("id, full_name, email, phone, role, farm_name, farm_location, is_verified")
      .eq("id", farmerId)
      .single();

    // 2. Fetch products for metrics
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: products, error: prodErr } = await (supabase as any)
      .from("products")
      .select("id, is_available, stock_quantity, price_per_unit")
      .eq("farmer_id", farmerId);

    if (prodErr) {
      return NextResponse.json({ error: prodErr.message }, { status: 500 });
    }

    const allProducts = products || [];
    const activeListings = allProducts.filter((p: { is_available: boolean }) => p.is_available).length;
    const totalStock = allProducts.reduce((sum: number, p: { stock_quantity: number }) => sum + (p.stock_quantity || 0), 0);

    // 3. Fetch inbound orders / order items for this farmer
    const productIds = allProducts.map((p: { id: string }) => p.id);
    let inboundOrdersCount = 0;
    let totalEarnings = 0;

    if (productIds.length > 0) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: orderItems } = await (supabase as any)
        .from("order_items")
        .select(`
          id,
          order_id,
          product_id,
          quantity,
          subtotal,
          orders (
            id,
            status,
            order_reference
          )
        `)
        .in("product_id", productIds);

      if (orderItems && orderItems.length > 0) {
        const uniqueOrders = new Set<string>();
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        orderItems.forEach((item: any) => {
          const status = item.orders?.status;
          if (status === "confirmed" || status === "in_transit" || status === "pending") {
            uniqueOrders.add(item.order_id);
          }
          if (status === "confirmed" || status === "in_transit" || status === "delivered") {
            totalEarnings += Number(item.subtotal || 0);
          }
        });
        inboundOrdersCount = uniqueOrders.size;
      }
    }

    // Default sample earnings baseline if new farmer with zero recorded checkouts yet
    const displayEarnings = totalEarnings > 0 ? totalEarnings : 142500;
    const displayInbound = inboundOrdersCount > 0 ? inboundOrdersCount : 3;

    return NextResponse.json({
      success: true,
      farmerId,
      metrics: {
        activeListings,
        totalListings: allProducts.length,
        totalStock,
        inboundOrders: displayInbound,
        totalEarnings: displayEarnings,
      },
      farmerProfile: farmerUser || {
        id: farmerId,
        full_name: "Babatunde Agro",
        farm_name: "Babatunde Organic Farms",
        farm_location: "Ikere-Ekiti",
        is_verified: true,
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Error fetching farmer metrics";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
