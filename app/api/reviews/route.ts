import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase } from "@/utils/supabase/server";
import {
  getReviewsForProduct,
  getReviewsForFarmer,
  checkReviewEligibility,
  saveReview,
  getAllReviews,
} from "@/lib/reviews-store";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const productId = searchParams.get("product_id");
    const farmerId = searchParams.get("farmer_id");
    const orderRef = searchParams.get("order_reference");
    const checkEligibilityOnly = searchParams.get("check_eligibility") === "true";

    // 1. If checking eligibility only
    if (checkEligibilityOnly && productId) {
      const eligibility = checkReviewEligibility({
        productId,
        orderReference: orderRef || undefined,
      });
      return NextResponse.json({
        success: true,
        eligibility,
      });
    }

    // 2. Product-specific reviews
    if (productId) {
      const result = getReviewsForProduct(productId);
      return NextResponse.json({
        success: true,
        productId,
        ...result,
      });
    }

    // 3. Farmer-specific reviews
    if (farmerId) {
      const result = getReviewsForFarmer(farmerId);
      return NextResponse.json({
        success: true,
        farmerId,
        ...result,
      });
    }

    // 4. All reviews
    const all = getAllReviews();
    return NextResponse.json({
      success: true,
      totalCount: all.length,
      reviews: all,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Error fetching reviews";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabase();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const body = await request.json();
    const { product_id, order_reference, rating, comment, buyer_name } = body;

    // 1. Validation
    if (!product_id) {
      return NextResponse.json({ error: "product_id is required." }, { status: 400 });
    }

    const parsedRating = parseInt(rating, 10);
    if (isNaN(parsedRating) || parsedRating < 1 || parsedRating > 5) {
      return NextResponse.json(
        { error: "Rating must be an integer between 1 and 5." },
        { status: 400 }
      );
    }

    if (!comment || typeof comment !== "string" || comment.trim().length < 5) {
      return NextResponse.json(
        { error: "Please provide a helpful feedback comment (minimum 5 characters)." },
        { status: 400 }
      );
    }

    // 2. PRD FR-5.1: Eligibility Verification Guard
    // Strictly verify that the buyer has a delivered order containing this produce
    const eligibility = checkReviewEligibility({
      productId: product_id,
      orderReference: order_reference,
      buyerId: user?.id,
      buyerEmail: user?.email,
    });

    if (!eligibility.eligible) {
      const statusCode = eligibility.alreadyReviewed ? 409 : 403;
      return NextResponse.json(
        {
          error: eligibility.reason || "You are not eligible to review this produce item.",
          isEligible: false,
          alreadyReviewed: !!eligibility.alreadyReviewed,
        },
        { status: statusCode }
      );
    }

    // 3. Retrieve product and farmer details for review metadata
    let productName = "Ekiti Fresh Produce";
    let farmerId = undefined;
    let farmerName = undefined;

    try {
      const { data: prod } = await (supabase as any)
        .from("products")
        .select("name, farmer_id, users!farmer_id(farm_name)")
        .eq("id", product_id)
        .maybeSingle();

      if (prod) {
        productName = prod.name;
        farmerId = prod.farmer_id;
        farmerName = prod.users?.farm_name;
      }
    } catch (prodErr) {
      console.warn("Product lookup notice for review:", prodErr);
    }

    const reviewerName =
      buyer_name?.trim() ||
      user?.user_metadata?.full_name ||
      user?.email?.split("@")[0] ||
      "Verified Ekiti Buyer";

    // 4. Save review in store
    const newReview = saveReview({
      productId: product_id,
      productName,
      farmerId,
      farmerName,
      buyerId: user?.id,
      buyerName: reviewerName,
      orderId: eligibility.orderId,
      orderReference: eligibility.orderReference,
      rating: parsedRating,
      comment: comment.trim(),
    });

    // 5. Try persisting to Supabase public.reviews table
    try {
      if (user?.id) {
        await (supabase as any).from("reviews").insert({
          product_id,
          buyer_id: user.id,
          order_id: eligibility.orderId,
          rating: parsedRating,
          comment: comment.trim(),
        });
      }
    } catch (dbErr) {
      console.warn("Database review insert notice (handled by store):", dbErr);
    }

    return NextResponse.json(
      {
        success: true,
        message: "Verified review submitted successfully.",
        review: newReview,
      },
      { status: 201 }
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Error submitting review";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
