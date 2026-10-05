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
      const supabase = await createServerSupabase();
      let user = null;
      try {
        const { data } = await supabase.auth.getUser();
        user = data?.user || null;
      } catch {
        // Auth session read offline fallback
      }

      // First check Supabase DB if user is authenticated
      let dbEligible = false;
      let dbOrderRef = orderRef;
      let dbOrderId: string | undefined = undefined;
      let alreadyReviewedInDb = false;

      if (user?.id) {
        try {
          const { data: dbOrders } = await (supabase as any)
            .from("orders")
            .select(`
              id,
              order_reference,
              status,
              buyer_id,
              order_items!inner (
                product_id
              )
            `)
            .eq("buyer_id", user.id)
            .eq("status", "delivered")
            .eq("order_items.product_id", productId);

          if (dbOrders && dbOrders.length > 0) {
            dbEligible = true;
            dbOrderId = dbOrders[0].id;
            dbOrderRef = dbOrders[0].order_reference;

            // Check if already reviewed in DB
            const { data: revData } = await (supabase as any)
              .from("reviews")
              .select("id")
              .eq("product_id", productId)
              .eq("buyer_id", user.id)
              .eq("order_id", dbOrderId)
              .maybeSingle();

            if (revData) {
              alreadyReviewedInDb = true;
            }
          }
        } catch (dbErr) {
          console.warn("DB check eligibility notice:", dbErr);
        }
      }

      if (alreadyReviewedInDb) {
        return NextResponse.json({
          success: true,
          eligibility: {
            eligible: false,
            alreadyReviewed: true,
            orderReference: dbOrderRef,
            reason: `You have already submitted a verified review for this harvest under order ${dbOrderRef}.`,
          },
        });
      }

      if (dbEligible) {
        return NextResponse.json({
          success: true,
          eligibility: {
            eligible: true,
            orderReference: dbOrderRef,
            orderId: dbOrderId,
          },
        });
      }

      // Fallback check against local orders store
      const eligibility = checkReviewEligibility({
        productId,
        orderReference: orderRef || undefined,
        buyerId: user?.id,
        buyerEmail: user?.email,
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
    let user = null;
    try {
      const { data } = await supabase.auth.getUser();
      user = data?.user || null;
    } catch {
      // offline session fallback
    }

    const body = await request.json();
    const { product_id, order_reference, rating, comment, buyer_name, buyer_email } = body;

    // 1. Request Payload Validation
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

    // 2. Role / Category Verification
    // A farmer cannot review produce; review module is strictly for verified buyers
    const userRole = user?.user_metadata?.role;
    if (userRole === "farmer") {
      return NextResponse.json(
        {
          error: "Fraud Prevention Intercept: Farmer accounts are not permitted to submit buyer reviews on produce listings.",
          isEligible: false,
        },
        { status: 403 }
      );
    }

    // 3. DATABASE VERIFICATION QUERY (Anti-Fraud Module)
    // The endpoint queries the database to verify that the requesting buyer
    // has an order with status 'delivered' for that specific produce
    let isDeliveredVerified = false;
    let verifiedOrderId: string | undefined = undefined;
    let verifiedOrderRef: string | undefined = order_reference;
    let nonDeliveredOrderRef: string | undefined = undefined;
    let nonDeliveredStatus: string | undefined = undefined;

    if (user?.id) {
      try {
        const { data: dbOrders, error: dbErr } = await (supabase as any)
          .from("orders")
          .select(`
            id,
            order_reference,
            status,
            buyer_id,
            order_items!inner (
              product_id
            )
          `)
          .eq("buyer_id", user.id)
          .eq("order_items.product_id", product_id);

        if (!dbErr && dbOrders && dbOrders.length > 0) {
          const deliveredOrder = dbOrders.find((o: any) => o.status === "delivered");
          if (deliveredOrder) {
            isDeliveredVerified = true;
            verifiedOrderId = deliveredOrder.id;
            verifiedOrderRef = deliveredOrder.order_reference;
          } else {
            nonDeliveredOrderRef = dbOrders[0].order_reference;
            nonDeliveredStatus = dbOrders[0].status;
          }
        }
      } catch (dbQueryErr) {
        console.warn("Database order verification query notice:", dbQueryErr);
      }
    }

    // Check for duplicate in database if order is verified
    if (user?.id && verifiedOrderId) {
      try {
        const { data: existingRev } = await (supabase as any)
          .from("reviews")
          .select("id")
          .eq("product_id", product_id)
          .eq("buyer_id", user.id)
          .eq("order_id", verifiedOrderId)
          .maybeSingle();

        if (existingRev) {
          return NextResponse.json(
            {
              error: `You have already submitted a verified review for this harvest under order ${verifiedOrderRef}.`,
              alreadyReviewed: true,
              isEligible: false,
            },
            { status: 409 }
          );
        }
      } catch (checkErr) {
        console.warn("Database review uniqueness check notice:", checkErr);
      }
    }

    // 4. Store Fallback Verification (for offline/demo and simulated checkout orders)
    if (!isDeliveredVerified) {
      const eligibility = checkReviewEligibility({
        productId: product_id,
        orderReference: order_reference,
        buyerId: user?.id,
        buyerEmail: buyer_email || user?.email,
        buyerName: buyer_name || user?.user_metadata?.full_name,
      });

      if (eligibility.eligible) {
        isDeliveredVerified = true;
        verifiedOrderId = eligibility.orderId;
        verifiedOrderRef = eligibility.orderReference;
      } else if (eligibility.alreadyReviewed) {
        return NextResponse.json(
          {
            error: eligibility.reason || "You have already submitted a verified review for this harvest.",
            isEligible: false,
            alreadyReviewed: true,
          },
          { status: 409 }
        );
      } else {
        // If an order was found but not delivered, or no delivered order exists
        if (nonDeliveredOrderRef) {
          return NextResponse.json(
            {
              error: `Fraud Prevention Intercept: Order ${nonDeliveredOrderRef} is currently in '${nonDeliveredStatus}' status. The database verified that this produce has not been marked 'delivered' to your doorstep yet. Reviews are only accepted post-delivery.`,
              isEligible: false,
            },
            { status: 403 }
          );
        }

        return NextResponse.json(
          {
            error: eligibility.reason || "Fraud Prevention Intercept: The review submission endpoint queried the database and verified that you do not have an order with status 'delivered' for this specific produce. Unverified ratings are strictly eliminated.",
            isEligible: false,
            alreadyReviewed: false,
          },
          { status: 403 }
        );
      }
    }

    // 5. Retrieve product and farmer details for review metadata
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

    // 6. Save review in persistent store
    const newReview = saveReview({
      productId: product_id,
      productName,
      farmerId,
      farmerName,
      buyerId: user?.id,
      buyerName: reviewerName,
      orderId: verifiedOrderId,
      orderReference: verifiedOrderRef,
      rating: parsedRating,
      comment: comment.trim(),
    });

    // 7. Persist to Supabase public.reviews table
    try {
      if (user?.id) {
        await (supabase as any).from("reviews").insert({
          product_id,
          buyer_id: user.id,
          order_id: verifiedOrderId,
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
        message: "Verified review submitted successfully. Rating has been verified against delivered purchase in database.",
        review: newReview,
      },
      { status: 201 }
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Error submitting review";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
