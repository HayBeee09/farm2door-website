import { NextRequest, NextResponse } from "next/server";
import { getAllFarmers, updateFarmerStatus } from "@/lib/admin-store";

export async function GET() {
  try {
    const farmers = getAllFarmers();
    return NextResponse.json({
      success: true,
      farmers,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Error fetching farmers list";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { farmer_id, verification_status } = body;

    if (!farmer_id || !["verified", "pending_audit", "suspended"].includes(verification_status)) {
      return NextResponse.json(
        { error: "Valid farmer_id and verification_status ('verified', 'pending_audit', 'suspended') required." },
        { status: 400 }
      );
    }

    const updated = updateFarmerStatus(farmer_id, verification_status);
    if (!updated) {
      return NextResponse.json({ error: "Farmer not found." }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      farmer: updated,
      message: `Farmer status updated to ${verification_status}`,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Error updating farmer status";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
