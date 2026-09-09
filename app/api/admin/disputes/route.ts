import { NextRequest, NextResponse } from "next/server";
import { getAllDisputes, resolveDispute } from "@/lib/admin-store";

export async function GET() {
  try {
    const disputes = getAllDisputes();
    return NextResponse.json({
      success: true,
      disputes,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Error fetching disputes";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { dispute_id, resolution_notes, status = "resolved" } = body;

    if (!dispute_id || !resolution_notes) {
      return NextResponse.json(
        { error: "Dispute ID and resolution notes are required." },
        { status: 400 }
      );
    }

    const resolved = resolveDispute(dispute_id, resolution_notes, status);
    if (!resolved) {
      return NextResponse.json({ error: "Dispute not found." }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      dispute: resolved,
      message: `Dispute marked as ${status}.`,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Error resolving dispute";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
