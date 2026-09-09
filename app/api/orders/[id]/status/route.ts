import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase } from "@/utils/supabase/server";
import { OrderStatus } from "@/lib/supabase/types";

const VALID_STATUSES: OrderStatus[] = ["pending", "confirmed", "in_transit", "delivered", "cancelled"];

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const supabase = await createServerSupabase();

    let order: any = null;
    try {
      const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
      const query = (supabase as any)
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
          updated_at,
          users!buyer_id (
            full_name,
            phone,
            email
          ),
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
              image_url
            )
          )
        `);

      const { data: dbOrder } = isUUID
        ? await query.eq("id", id).maybeSingle()
        : await query.eq("order_reference", id).maybeSingle();

      if (dbOrder) order = dbOrder;
    } catch {
      // Handled by store fallback below
    }

    if (!order) {
      const { getOrderById, getOrderByReference } = await import("@/lib/orders-store");
      const stored = getOrderById(id) || getOrderByReference(id);
      if (stored) {
        order = {
          id: stored.id,
          order_reference: stored.orderReference,
          status: stored.status,
          total_amount: stored.totalAmount,
          transit_fee: stored.transitFee,
          delivery_address: stored.deliveryAddress,
          delivery_phone: stored.deliveryPhone,
          created_at: stored.createdAt,
          updated_at: stored.updatedAt,
          users: {
            full_name: stored.buyerName,
            phone: stored.deliveryPhone,
            email: stored.buyerEmail,
          },
          order_items: stored.items.map((i, idx) => ({
            id: `item-${idx}`,
            product_id: i.productId,
            quantity: i.quantity,
            unit_price: i.unitPrice,
            subtotal: i.subtotal,
            products: {
              id: i.productId,
              name: i.productName,
              unit: i.unit,
              image_url: i.imageUrl || "/images/produce/yam-tubers.jpg",
            },
          })),
        };
      }
    }

    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      order,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Error fetching order status";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const supabase = await createServerSupabase();
    const body = await request.json();
    const { status } = body;

    if (!status || !VALID_STATUSES.includes(status)) {
      return NextResponse.json(
        { error: `Invalid status. Must be one of: ${VALID_STATUSES.join(", ")}` },
        { status: 400 }
      );
    }

    // 1. Fetch current order from DB or store
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let currentOrder: any = null;
    try {
      const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
      const { data: dbOrder } = isUUID
        ? await (supabase as any)
            .from("orders")
            .select("id, status, order_reference")
            .eq("id", id)
            .maybeSingle()
        : await (supabase as any)
            .from("orders")
            .select("id, status, order_reference")
            .eq("order_reference", id)
            .maybeSingle();
      if (dbOrder) currentOrder = dbOrder;
    } catch {
      // Handled by store fallback
    }

    if (!currentOrder) {
      const { getOrderById, getOrderByReference } = await import("@/lib/orders-store");
      const stored = getOrderById(id) || getOrderByReference(id);
      if (stored) {
        currentOrder = {
          id: stored.id,
          status: stored.status,
          order_reference: stored.orderReference,
        };
      }
    }

    if (!currentOrder) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    // 2. Always sync status in server store
    try {
      const { updateOrderStatus } = await import("@/lib/orders-store");
      updateOrderStatus(currentOrder.order_reference || id, status);
      updateOrderStatus(currentOrder.id || id, status);
    } catch (storeErr) {
      console.warn("Status store update notice:", storeErr);
    }

    // 3. Deterministic Rollback: If transitioning to 'cancelled' from 'pending' or 'confirmed'
    // restore the deducted stock back to the farmers' inventory
    if (status === "cancelled" && currentOrder.status !== "cancelled") {
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: items } = await (supabase as any)
          .from("order_items")
          .select("product_id, quantity")
          .eq("order_id", currentOrder.id);

        if (items && items.length > 0) {
          for (const item of items) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const { data: prod } = await (supabase as any)
              .from("products")
              .select("stock_quantity")
              .eq("id", item.product_id)
              .maybeSingle();

            if (prod) {
              const restoredStock = prod.stock_quantity + item.quantity;
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              await (supabase as any)
                .from("products")
                .update({
                  stock_quantity: restoredStock,
                  is_available: true,
                  updated_at: new Date().toISOString(),
                })
                .eq("id", item.product_id);
            }
          }
        }
      } catch (restErr) {
        console.warn("Stock restore notice:", restErr);
      }
    }

    // 4. Update order status in DB if possible
    let updatedOrder = { ...currentOrder, status };
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: dbUpdated } = await (supabase as any)
        .from("orders")
        .update({
          status,
          updated_at: new Date().toISOString(),
        })
        .eq("id", currentOrder.id)
        .select()
        .maybeSingle();

      if (dbUpdated) updatedOrder = dbUpdated;
    } catch (updateErr) {
      console.warn("Database status update notice (handled by store):", updateErr);
    }

    return NextResponse.json({
      success: true,
      message: `Order status updated to ${status}`,
      order: updatedOrder,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Error updating order status";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
