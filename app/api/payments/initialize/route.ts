import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase } from "@/utils/supabase/server";
import { initializePaystackTransaction } from "@/lib/paystack";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabase();
    const body = await request.json();
    const { order_reference, email, callback_url } = body;

    if (!order_reference || typeof order_reference !== "string") {
      return NextResponse.json(
        { error: "Valid order_reference is required (format: FD-YYYYMMDD-XXXXXX)" },
        { status: 400 }
      );
    }

    // 1. Fetch order details from database (or resilient server store)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let order: any = null;
    try {
      const { data: dbOrder } = await (supabase as any)
        .from("orders")
        .select(`
          id,
          order_reference,
          total_amount,
          status,
          buyer_id,
          users!buyer_id (
            email,
            full_name,
            phone
          )
        `)
        .eq("order_reference", order_reference.trim())
        .maybeSingle();
      if (dbOrder) order = dbOrder;
    } catch {
      // Handled by store fallback below
    }

    if (!order) {
      const { getOrderByReference } = await import("@/lib/orders-store");
      const stored = getOrderByReference(order_reference);
      if (stored) {
        order = {
          id: stored.id,
          order_reference: stored.orderReference,
          total_amount: stored.totalAmount,
          status: stored.status,
          buyer_id: stored.buyerId,
          users: {
            email: stored.buyerEmail,
            full_name: stored.buyerName,
            phone: stored.deliveryPhone,
          },
        };
      }
    }

    if (!order) {
      return NextResponse.json(
        { error: `Order with reference "${order_reference}" not found` },
        { status: 404 }
      );
    }

    if (order.status === "confirmed" || order.status === "in_transit" || order.status === "delivered") {
      return NextResponse.json(
        { error: `Order ${order_reference} has already been paid and is ${order.status}` },
        { status: 400 }
      );
    }

    const buyerEmail = email || order.users?.email || "buyer@farm2door.ng";
    const amountInNaira = Number(order.total_amount);

    // 2. Initialize transaction via Paystack service
    const initResult = await initializePaystackTransaction({
      email: buyerEmail,
      amountInNaira,
      reference: order.order_reference,
      callbackUrl: callback_url || `${request.nextUrl.origin}/orders/${encodeURIComponent(order.order_reference)}`,
      metadata: {
        order_id: order.id,
        order_reference: order.order_reference,
        buyer_name: order.users?.full_name,
        buyer_phone: order.users?.phone,
      },
    });

    // 3. Record pending payment state in database & server store
    try {
      const { updateOrderPayment } = await import("@/lib/orders-store");
      updateOrderPayment(order.order_reference, {
        status: "pending",
        paymentReference: order.order_reference,
        paystackReference: initResult.data.access_code,
        amount: amountInNaira,
        channel: "card",
      });
    } catch (storeErr) {
      console.warn("Payment store update notice:", storeErr);
    }

    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: existingPayment } = await (supabase as any)
        .from("payments")
        .select("id")
        .eq("order_id", order.id)
        .maybeSingle();

      if (existingPayment) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (supabase as any)
          .from("payments")
          .update({
            payment_reference: order.order_reference,
            paystack_reference: initResult.data.access_code,
            amount: amountInNaira,
            status: "pending",
            updated_at: new Date().toISOString(),
          })
          .eq("id", existingPayment.id);
      } else {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (supabase as any)
          .from("payments")
          .insert({
            order_id: order.id,
            payment_reference: order.order_reference,
            paystack_reference: initResult.data.access_code,
            amount: amountInNaira,
            status: "pending",
            channel: "card",
          });
      }
    } catch (payDbErr) {
      console.warn("Payment DB write notice (handled by store):", payDbErr);
    }

    return NextResponse.json({
      success: true,
      authorizationUrl: initResult.data.authorization_url,
      accessCode: initResult.data.access_code,
      reference: order.order_reference,
      amount: amountInNaira,
      isSandbox: initResult.isSandbox,
      message: initResult.message,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Error initializing Paystack payment";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
