import { NextRequest, NextResponse } from "next/server";
import { getEscrowTransactions, releaseEscrowPayout } from "@/lib/admin-store";

export async function GET() {
  try {
    const transactions = getEscrowTransactions();
    return NextResponse.json({
      success: true,
      transactions,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Error fetching escrow transactions";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { order_reference } = body;

    if (!order_reference || typeof order_reference !== "string") {
      return NextResponse.json(
        { error: "Valid order_reference required for escrow release." },
        { status: 400 }
      );
    }

    releaseEscrowPayout(order_reference.trim());

    return NextResponse.json({
      success: true,
      message: `Escrow payout released successfully to farmer account for order ${order_reference}.`,
      orderReference: order_reference,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Error releasing escrow";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
