import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase } from "@/utils/supabase/server";
import { verifyWebhookSignature, toNaira } from "@/lib/paystack";

export async function POST(request: NextRequest) {
  try {
    // 1. Read raw body and signature header
    const rawBody = await request.text();
    const signature = request.headers.get("x-paystack-signature") || "";

    // 2. Cryptographically validate HMAC-SHA512 signature (PRD NFR-2.3)
    const isValidSignature = verifyWebhookSignature(rawBody, signature);
    if (!isValidSignature) {
      return NextResponse.json(
        { error: "Invalid cryptographic webhook signature" },
        { status: 401 }
      );
    }

    let payload: any;
    try {
      payload = JSON.parse(rawBody);
    } catch {
      return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 });
    }

    const { event, data } = payload;

    // 3. Process charge.success events idempotently
    if (event === "charge.success" && data) {
      const reference = data.reference;
      const amountKobo = data.amount;
      const amountNaira = toNaira(amountKobo);
      const paidAt = data.paid_at || new Date().toISOString();
      const channel = data.channel || "card";

      if (reference) {
        // Update server orders store
        try {
          const { updateOrderPayment, updateOrderStatus } = await import("@/lib/orders-store");
          updateOrderPayment(reference, {
            status: "successful",
            paymentReference: reference,
            paystackReference: String(data.id || reference),
            amount: amountNaira,
            channel,
            paidAt,
            rawPayload: data,
          });
          updateOrderStatus(reference, "confirmed");
        } catch (storeErr) {
          console.warn("Store webhook sync notice:", storeErr);
        }

        const supabase = await createServerSupabase();

        // Fetch corresponding order
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: order } = await (supabase as any)
          .from("orders")
          .select("id, status, total_amount")
          .eq("order_reference", reference)
          .maybeSingle();

        if (order) {
          // Idempotently update or insert payment record
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
                paystack_reference: String(data.id || reference),
                amount: amountNaira,
                status: "successful",
                channel,
                paid_at: paidAt,
                raw_payload: data,
              })
              .eq("id", existingPayment.id);
          } else {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            await (supabase as any)
              .from("payments")
              .insert({
                order_id: order.id,
                payment_reference: reference,
                paystack_reference: String(data.id || reference),
                amount: amountNaira,
                status: "successful",
                channel,
                paid_at: paidAt,
                raw_payload: data,
              });
          }

          // Advance order to confirmed state if still pending
          if (order.status === "pending") {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            await (supabase as any)
              .from("orders")
              .update({
                status: "confirmed",
                updated_at: new Date().toISOString(),
              })
              .eq("id", order.id);
          }
        }
      }
    }

    // Acknowledge receipt to Paystack
    return NextResponse.json({ received: true, event });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Error processing webhook";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
