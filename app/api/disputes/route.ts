import { NextRequest, NextResponse } from "next/server";
import { createDispute, getDisputeByOrder } from "@/lib/admin-store";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const orderReference = searchParams.get("orderReference");

    if (!orderReference) {
      return NextResponse.json(
        { error: "orderReference query parameter is required." },
        { status: 400 }
      );
    }

    const dispute = getDisputeByOrder(orderReference);
    return NextResponse.json({
      success: true,
      hasDispute: Boolean(dispute),
      dispute: dispute || null,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Error fetching order dispute";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      orderReference,
      type = "perishable_decay",
      description,
      buyerName = "Verified Customer",
      cropName,
      farmerName,
    } = body;

    if (!orderReference || typeof orderReference !== "string") {
      return NextResponse.json(
        { success: false, error: "Valid order reference is required." },
        { status: 400 }
      );
    }

    if (!description || typeof description !== "string" || description.trim().length < 10) {
      return NextResponse.json(
        { success: false, error: "Please provide a detailed description of the issue (at least 10 characters)." },
        { status: 400 }
      );
    }

    const validTypes = ["perishable_decay", "transit_delay", "wrong_packaging_unit", "missing_item"];
    const disputeType = validTypes.includes(type) ? type : "perishable_decay";

    // Check if a dispute is already open for this order
    const existing = getDisputeByOrder(orderReference);
    if (existing && existing.status === "open") {
      return NextResponse.json(
        {
          success: false,
          error: "A dispute report is already active and under administrative investigation for this order.",
          dispute: existing,
        },
        { status: 409 }
      );
    }

    const newDispute = createDispute({
      orderReference,
      cropName: cropName?.trim() || "Assorted Farm Produce",
      buyerName: buyerName?.trim() || "Verified Buyer",
      farmerName: farmerName?.trim() || "Ekiti Smallholder",
      type: disputeType,
      description: description.trim(),
    });

    return NextResponse.json(
      {
        success: true,
        message: "Dispute report submitted successfully. Our platform escrow team has been notified.",
        dispute: newDispute,
      },
      { status: 201 }
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Error creating dispute report";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
