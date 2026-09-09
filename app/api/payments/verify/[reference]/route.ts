import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase } from "@/utils/supabase/server";
import { verifyPaystackTransaction, toNaira } from "@/lib/paystack";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ reference: string }> }
) {
  try {
    const { reference } = await context.params;
    if (!reference) {
      return NextResponse.json({ error: "Transaction reference is required" }, { status: 400 });
    }

    const supabase = await createServerSupabase();

    // 1. Fetch order by reference (database or server store)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let order: any = null;
    try {
      const { data: dbOrder } = await (supabase as any)
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
          users!buyer_id (
            full_name,
            email,
            phone
          ),
          order_items (
            id,
            product_id,
            quantity,
            unit_price,
            subtotal,
            products (
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
        .eq("order_reference", reference.trim())
        .maybeSingle();
      if (dbOrder) order = dbOrder;
    } catch {
      // Handled by store fallback below
    }

    if (!order) {
      const { getOrderByReference } = await import("@/lib/orders-store");
      const stored = getOrderByReference(reference);
      if (stored) {
        order = {
          id: stored.id,
          order_reference: stored.orderReference,
          status: stored.status,
          total_amount: stored.totalAmount,
          transitFee: stored.transitFee,
          delivery_address: stored.deliveryAddress,
          delivery_phone: stored.deliveryPhone,
          created_at: stored.createdAt,
          users: {
            full_name: stored.buyerName,
            email: stored.buyerEmail,
            phone: stored.deliveryPhone,
          },
          order_items: stored.items.map((i, idx) => ({
            id: `item-${idx}`,
            product_id: i.productId,
            quantity: i.quantity,
            unit_price: i.unitPrice,
            subtotal: i.subtotal,
            products: {
              name: i.productName,
              unit: i.unit,
              image_url: i.imageUrl || "/images/produce/yam-tubers.jpg",
              users: {
                farm_name: i.farmName || "Ekiti Partner Farm",
                farm_location: i.farmLocation || "Ekiti State",
              },
            },
          })),
        };
      }
    }

    if (!order) {
      return NextResponse.json(
        { error: `Order with reference "${reference}" not found` },
        { status: 404 }
      );
    }

    // 2. Query Paystack to verify settlement
    const verifyResult = await verifyPaystackTransaction(
      reference.trim(),
      Number(order.total_amount)
    );

    const isSuccess =
      verifyResult.status &&
      verifyResult.data &&
      verifyResult.data.status === "success";

    if (!isSuccess) {
      return NextResponse.json({
        success: false,
        verified: false,
        status: verifyResult.data?.status || "failed",
        message: verifyResult.message || "Payment verification failed",
      });
    }

    const paidKobo = verifyResult.data.amount;
    const paidNaira = toNaira(paidKobo);
    const paidAt = verifyResult.data.paid_at || new Date().toISOString();
    const channel = verifyResult.data.channel || "card";

    // 3. Update server store state
    try {
      const { updateOrderPayment, updateOrderStatus } = await import("@/lib/orders-store");
      updateOrderPayment(reference, {
        status: "successful",
        paymentReference: reference,
        paystackReference: String(verifyResult.data.id || reference),
        amount: paidNaira,
        channel,
        paidAt,
        rawPayload: verifyResult.data,
      });
      updateOrderStatus(reference, "confirmed");
      order.status = "confirmed";
    } catch (storeErr) {
      console.warn("Store payment update notice:", storeErr);
    }

    // 4. Update database records if reachable
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
            payment_reference: reference,
            paystack_reference: String(verifyResult.data.id || reference),
            amount: paidNaira,
            status: "successful",
            channel,
            paid_at: paidAt,
            raw_payload: verifyResult.data,
          })
          .eq("id", existingPayment.id);
      } else {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (supabase as any)
          .from("payments")
          .insert({
            order_id: order.id,
            payment_reference: reference,
            paystack_reference: String(verifyResult.data.id || reference),
            amount: paidNaira,
            status: "successful",
            channel,
            paid_at: paidAt,
            raw_payload: verifyResult.data,
          });
      }

      if (order.id) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (supabase as any)
          .from("orders")
          .update({
            status: "confirmed",
            updated_at: new Date().toISOString(),
          })
          .eq("id", order.id);
      }
    } catch (dbErr) {
      console.warn("Database settlement write notice (handled by store):", dbErr);
    }

    return NextResponse.json({
      success: true,
      verified: true,
      orderReference: order.order_reference,
      status: "confirmed",
      amountPaid: paidNaira,
      channel,
      paidAt,
      isSandbox: verifyResult.isSandbox,
      order,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Error verifying payment";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
