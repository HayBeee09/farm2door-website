import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase } from "@/utils/supabase/server";
import { getOrdersByBuyer } from "@/lib/orders-store";

export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerSupabase();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    // 1. Get stored orders for this buyer
    const storedOrders = getOrdersByBuyer({
      buyerId: user?.id,
      email: user?.email,
      phone: (user?.user_metadata as any)?.phone,
    });

    // 2. Try fetching from Supabase if authenticated
    let dbOrders: any[] = [];
    if (user?.id) {
      try {
        const { data, error } = await (supabase as any)
          .from("orders")
          .select(`
            id,
            order_reference,
            status,
            total_amount,
            transit_fee,
            delivery_address,
            delivery_phone,
            created_at,
            order_items (
              id,
              product_id,
              quantity,
              unit_price,
              subtotal,
              products (
                id,
                name,
                unit,
                image_url,
                users!farmer_id (
                  farm_name,
                  farm_location
                )
              )
            )
          `)
          .eq("buyer_id", user.id)
          .order("created_at", { ascending: false });

        if (!error && data) {
          dbOrders = data.map((ord: any) => ({
            id: ord.id,
            orderReference: ord.order_reference,
            status: ord.status,
            totalAmount: Number(ord.total_amount),
            transitFee: Number(ord.transit_fee || 1500),
            deliveryAddress: ord.delivery_address,
            deliveryPhone: ord.delivery_phone,
            createdAt: ord.created_at,
            items: (ord.order_items || []).map((i: any) => ({
              productId: i.product_id,
              productName: i.products?.name || "Ekiti Produce",
              unit: i.products?.unit || "unit",
              quantity: i.quantity,
              unitPrice: Number(i.unit_price),
              subtotal: Number(i.subtotal),
              imageUrl: i.products?.image_url || "/images/produce/yam-tubers.jpg",
              farmName: i.products?.users?.farm_name || "Ekiti Partner Farm",
              farmLocation: i.products?.users?.farm_location || "Ekiti State",
            })),
          }));
        }
      } catch (dbErr) {
        console.warn("DB buyer orders query notice:", dbErr);
      }
    }

    // Combine DB and stored orders, deduplicating by orderReference
    const refMap = new Map<string, any>();
    for (const ord of [...dbOrders, ...storedOrders]) {
      if (!refMap.has(ord.orderReference)) {
        refMap.set(ord.orderReference, ord);
      }
    }

    const allOrders = Array.from(refMap.values()).sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    return NextResponse.json({
      success: true,
      count: allOrders.length,
      orders: allOrders,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Error fetching buyer orders";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
