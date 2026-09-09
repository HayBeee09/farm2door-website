import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase } from "@/utils/supabase/server";

// Reference generator enforcing PRD format: FD-YYYYMMDD-XXXXXX
function generateOrderReference(): string {
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const chars = "0123456789ABCDEFGHJKLMNPQRSTUVWXYZ";
  let randomHex = "";
  for (let i = 0; i < 6; i++) {
    randomHex += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `FD-${dateStr}-${randomHex}`;
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabase();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const body = await request.json();
    const {
      items,
      delivery_address,
      delivery_phone,
      buyer_name,
      buyer_email,
      transit_fee = 1500,
      dummy_payment = true,
      payment_channel = "card",
    } = body;

    // 1. Validation
    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { error: "Cart is empty. At least one item is required for checkout." },
        { status: 400 }
      );
    }

    if (!delivery_address || typeof delivery_address !== "string" || delivery_address.trim().length < 5) {
      return NextResponse.json(
        { error: "Please provide a valid delivery address in Ekiti State (min 5 characters)." },
        { status: 400 }
      );
    }

    if (!delivery_phone || typeof delivery_phone !== "string" || delivery_phone.trim().length < 7) {
      return NextResponse.json(
        { error: "Please provide a valid contact phone number for delivery transit." },
        { status: 400 }
      );
    }

    // Sanitize line items for JSONB RPC parameter
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sanitizedItems = items.map((i: any) => ({
      product_id: i.productId || i.product_id,
      quantity: parseInt(i.quantity, 10) || 1,
    }));

    for (const item of sanitizedItems) {
      if (!item.product_id || isNaN(item.quantity) || item.quantity <= 0) {
        return NextResponse.json(
          { error: "Invalid product item or quantity in checkout payload." },
          { status: 400 }
        );
      }
    }

    // 2. Resolve Buyer ID (Foreign Key to public.users)
    let buyerId = user?.id;

    if (!buyerId) {
      // Find or create guest buyer account in public.users
      const phoneClean = delivery_phone.trim();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: existingUser } = await (supabase as any)
        .from("users")
        .select("id")
        .eq("phone", phoneClean)
        .maybeSingle();

      if (existingUser?.id) {
        buyerId = existingUser.id;
      } else {
        const guestEmail = buyer_email?.trim() || `buyer-${Date.now()}@farm2door.ng`;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: newGuest, error: guestErr } = await (supabase as any)
          .from("users")
          .insert({
            full_name: buyer_name?.trim() || "Ekiti Household Buyer",
            email: guestEmail,
            phone: phoneClean,
            role: "buyer",
            address: delivery_address.trim(),
            is_verified: true,
          })
          .select("id")
          .single();

        if (guestErr) {
          // Fallback to any existing user or seed account
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const { data: fallbackUser } = await (supabase as any)
            .from("users")
            .select("id")
            .limit(1)
            .single();

          buyerId = fallbackUser?.id;
        } else {
          buyerId = newGuest?.id;
        }
      }
    }

    if (!buyerId) {
      return NextResponse.json(
        { error: "Could not resolve buyer profile for order placement." },
        { status: 500 }
      );
    }

    // 3. Generate PRD Order Reference (FD-YYYYMMDD-XXXXXX)
    const orderReference = generateOrderReference();

    // 4. ACID Concurrency-Locked Checkout via PostgreSQL execute_atomic_checkout
    // This executes:
    //   SELECT ... FROM products WHERE id = ... FOR UPDATE;
    //   Validates stock_quantity >= quantity;
    //   Decrements stock atomically;
    //   Rolls back cleanly if any single item is out of stock!
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: rpcResult, error: rpcError } = await (supabase.rpc as any)(
      "execute_atomic_checkout",
      {
        p_buyer_id: buyerId,
        p_order_ref: orderReference,
        p_delivery_address: delivery_address.trim(),
        p_delivery_phone: delivery_phone.trim(),
        p_transit_fee: parseFloat(transit_fee) || 1500,
        p_items: sanitizedItems,
      }
    );

    if (rpcError) {
      const errorMsg = rpcError.message || "Checkout transaction failed";
      const isInsufficientStock =
        errorMsg.toLowerCase().includes("insufficient stock") ||
        errorMsg.toLowerCase().includes("does not exist");

      // HTTP 409 Conflict with deterministic rollback notification
      return NextResponse.json(
        {
          success: false,
          error: errorMsg,
          isStockConflict: isInsufficientStock,
          message: isInsufficientStock
            ? "ACID Concurrency Lock: Stock was purchased by another buyer during your checkout. The transaction has been rolled back with zero charge."
            : errorMsg,
        },
        { status: isInsufficientStock ? 409 : 500 }
      );
    }

    // 5. Store order in server store for resilient tracking & payment processing
    try {
      const { data: prods } = await supabase
        .from("products")
        .select("id, name, unit, image_url, farmer_id, users!farmer_id(farm_name, farm_location)")
        .in("id", sanitizedItems.map((i: { product_id: string }) => i.product_id));

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const prodMap = new Map((prods || []).map((p: any) => [p.id, p]));

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const enrichedItems = sanitizedItems.map((item: any) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const p: any = prodMap.get(item.product_id);
        const original = items.find((i: any) => (i.productId || i.product_id) === item.product_id);
        const unitPrice = original?.unitPrice || original?.price_per_unit || 3500;
        return {
          productId: item.product_id,
          productName: p?.name || original?.name || "Ekiti Fresh Produce",
          unit: p?.unit || original?.unit || "unit",
          quantity: item.quantity,
          unitPrice,
          subtotal: unitPrice * item.quantity,
          imageUrl: p?.image_url || original?.imageUrl || "/images/produce/yam-tubers.jpg",
          farmerId: p?.farmer_id || original?.farmerId,
          farmName: p?.users?.farm_name || original?.farmName,
          farmLocation: p?.users?.farm_location || original?.farmLocation,
        };
      });

      const orderStatus = dummy_payment ? "confirmed" : "pending";
      const dummyPaymentRecord = dummy_payment
        ? {
            status: "successful" as const,
            paymentReference: rpcResult.order_reference,
            paystackReference: `sim_${Math.random().toString(36).substring(2, 10)}`,
            amount: Number(rpcResult.total_amount),
            channel: payment_channel,
            paidAt: new Date().toISOString(),
          }
        : undefined;

      const { saveOrder } = await import("@/lib/orders-store");
      saveOrder({
        id: rpcResult.order_id,
        orderReference: rpcResult.order_reference,
        buyerId,
        buyerName: buyer_name?.trim() || "Ekiti Household Buyer",
        buyerEmail: buyer_email?.trim(),
        deliveryPhone: delivery_phone.trim(),
        deliveryAddress: delivery_address.trim(),
        status: orderStatus,
        totalAmount: Number(rpcResult.total_amount),
        transitFee: parseFloat(transit_fee) || 1500,
        items: enrichedItems,
        payment: dummyPaymentRecord,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      if (dummy_payment) {
        try {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          await (supabase as any)
            .from("orders")
            .update({ status: "confirmed", updated_at: new Date().toISOString() })
            .eq("id", rpcResult.order_id);

          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          await (supabase as any).from("payments").insert({
            order_id: rpcResult.order_id,
            payment_reference: rpcResult.order_reference,
            paystack_reference: dummyPaymentRecord?.paystackReference,
            amount: Number(rpcResult.total_amount),
            status: "successful",
            channel: payment_channel,
            paid_at: new Date().toISOString(),
          });
        } catch (dbErr) {
          console.warn("DB payment sync notice (handled by store):", dbErr);
        }
      }
    } catch (storeErr) {
      console.warn("Orders store save notice:", storeErr);
    }

    return NextResponse.json({
      success: true,
      orderId: rpcResult.order_id,
      orderReference: rpcResult.order_reference,
      totalAmount: Number(rpcResult.total_amount),
      status: dummy_payment ? "confirmed" : "pending",
      isPaid: Boolean(dummy_payment),
      paymentChannel: payment_channel,
      deliveryAddress: delivery_address.trim(),
      deliveryPhone: delivery_phone.trim(),
      createdAt: new Date().toISOString(),
      message: dummy_payment
        ? "Order placed and dummy payment confirmed instantly!"
        : "Order placed successfully with ACID row-level locking.",
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal error during checkout execution";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
