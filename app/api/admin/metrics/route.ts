import { NextResponse } from "next/server";
import { getAdminMetrics } from "@/lib/admin-store";

export async function GET() {
  try {
    const metrics = getAdminMetrics();
    return NextResponse.json({
      success: true,
      metrics,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Error fetching admin metrics";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
