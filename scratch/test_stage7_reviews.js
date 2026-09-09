// scratch/test_stage7_reviews.js
// Automated verification script for Stage 7: Trust & Reputation System (Verified Reviews)

const http = require("http");

function request(options, data = null) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let body = "";
      res.on("data", (chunk) => (body += chunk));
      res.on("end", () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(body), headers: res.headers });
        } catch {
          resolve({ status: res.statusCode, data: body, headers: res.headers });
        }
      });
    });
    req.on("error", reject);
    if (data) req.write(JSON.stringify(data));
    req.end();
  });
}

async function runStage7Test() {
  console.log("===============================================================");
  console.log("🧪 TESTING STAGE 7: TRUST & REPUTATION ENGINE (VERIFIED REVIEWS)");
  console.log("===============================================================");

  // Step 1: Query products to get valid product
  console.log("\n1️⃣ Querying active products from /api/products...");
  const productsRes = await request({
    hostname: "localhost",
    port: 3000,
    path: "/api/products",
    method: "GET",
  });

  const targetProduct = (productsRes.data.products && productsRes.data.products[0]) || { id: "prod-1", price: 3500 };
  const targetProductId = targetProduct.id;
  console.log(`Target product selected: "${targetProduct.name}" (ID: ${targetProductId})`);

  console.log("\nCreating test order via atomic checkout...");
  const checkoutPayload = {
    buyer_name: "Adeyemi Babalola",
    buyer_email: "adeyemi.babalola@gmail.com",
    delivery_phone: "08031234567",
    delivery_address: "Plot 12, GRA Extension, Ikere-Ekiti, Ekiti State",
    items: [
      {
        product_id: targetProductId,
        quantity: 1,
        unit_price: targetProduct.price || 3500,
      }
    ],
  };

  const checkoutRes = await request(
    {
      hostname: "localhost",
      port: 3000,
      path: "/api/orders/checkout",
      method: "POST",
      headers: { "Content-Type": "application/json" },
    },
    checkoutPayload
  );

  if (checkoutRes.status !== 200 && checkoutRes.status !== 201) {
    console.error("❌ Checkout failed:", checkoutRes.data);
    process.exit(1);
  }

  const orderRef = checkoutRes.data.orderReference || (checkoutRes.data.order && checkoutRes.data.order.reference);
  console.log(`✅ Order created successfully: ${orderRef} (Status: ${checkoutRes.data.status || "confirmed"})`);

  // Step 2: Attempt review while order is still pending (Should be REJECTED 403)
  console.log("\n2️⃣ Testing Eligibility Guard: Attempting review on 'pending' order...");
  const prematureReviewPayload = {
    product_id: targetProductId,
    order_reference: orderRef,
    rating: 5,
    comment: "Trying to submit early before delivery.",
    reviewer_name: "Adeyemi Babalola",
  };

  const rejectRes = await request(
    {
      hostname: "localhost",
      port: 3000,
      path: "/api/reviews",
      method: "POST",
      headers: { "Content-Type": "application/json" },
    },
    prematureReviewPayload
  );

  console.log(`Status received: ${rejectRes.status}`);
  if (rejectRes.status === 403) {
    console.log("✅ ELIGIBILITY GUARD ENFORCED: Non-delivered review correctly rejected with HTTP 403!");
    console.log(`   Message: "${rejectRes.data.error}"`);
  } else {
    console.error("❌ Test failed: Expected 403, got:", rejectRes.status, rejectRes.data);
    process.exit(1);
  }

  // Step 3: Advance order through lifecycle: pending -> confirmed -> in_transit -> delivered
  console.log("\n3️⃣ Advancing order to 'delivered' status...");
  await request(
    { hostname: "localhost", port: 3000, path: `/api/orders/${orderRef}/status`, method: "PATCH", headers: { "Content-Type": "application/json" } },
    { status: "confirmed" }
  );
  await request(
    { hostname: "localhost", port: 3000, path: `/api/orders/${orderRef}/status`, method: "PATCH", headers: { "Content-Type": "application/json" } },
    { status: "in_transit" }
  );
  const deliveredRes = await request(
    { hostname: "localhost", port: 3000, path: `/api/orders/${orderRef}/status`, method: "PATCH", headers: { "Content-Type": "application/json" } },
    { status: "delivered" }
  );

  if (deliveredRes.data.success && deliveredRes.data.order.status === "delivered") {
    console.log(`✅ Order ${orderRef} successfully updated to 'delivered'.`);
  } else {
    console.error("❌ Failed to advance order status:", deliveredRes.data);
    process.exit(1);
  }

  // Step 4: Submit legitimate verified review for the delivered crop
  console.log("\n4️⃣ Submitting legitimate verified buyer review...");
  const validReviewPayload = {
    product_id: targetProductId,
    order_reference: orderRef,
    rating: 5,
    comment: "Exceptionally dry and sweet Ekiti yam! Perfect for pounded yam. Delivered crisp and on schedule.",
    reviewer_name: "Adeyemi Babalola",
  };

  const submitRes = await request(
    {
      hostname: "localhost",
      port: 3000,
      path: "/api/reviews",
      method: "POST",
      headers: { "Content-Type": "application/json" },
    },
    validReviewPayload
  );

  if (submitRes.status === 201) {
    console.log("✅ VERIFIED REVIEW ACCEPTED: HTTP 201 Created!");
    console.log(`   Review ID: ${submitRes.data.review.id}`);
    console.log(`   Verified Badge: ${submitRes.data.review.isVerifiedPurchase}`);
  } else {
    console.error("❌ Review submission failed:", submitRes.status, submitRes.data);
    process.exit(1);
  }

  // Step 5: Attempt duplicate review submission (Should be REJECTED 409)
  console.log("\n5️⃣ Testing Anti-Fraud Duplicate Guard: Attempting second review on same order item...");
  const duplicateRes = await request(
    {
      hostname: "localhost",
      port: 3000,
      path: "/api/reviews",
      method: "POST",
      headers: { "Content-Type": "application/json" },
    },
    validReviewPayload
  );

  console.log(`Status received: ${duplicateRes.status}`);
  if (duplicateRes.status === 409) {
    console.log("✅ DUPLICATE GUARD ENFORCED: Second review attempt rejected with HTTP 409 Conflict!");
    console.log(`   Message: "${duplicateRes.data.error}"`);
  } else {
    console.error("❌ Test failed: Expected 409, got:", duplicateRes.status, duplicateRes.data);
    process.exit(1);
  }

  // Step 6: Verify Dynamic Arithmetic Mean Aggregator
  console.log("\n6️⃣ Fetching aggregated review statistics for prod-1...");
  const statsRes = await request({
    hostname: "localhost",
    port: 3000,
    path: `/api/reviews?product_id=${encodeURIComponent(targetProductId)}`,
    method: "GET",
  });

  if (statsRes.status === 200 && statsRes.data.stats) {
    console.log("✅ DYNAMIC ARITHMETIC MEAN COMPUTED:");
    console.log(`   Average Rating: ⭐ ${statsRes.data.stats.averageRating} / 5.0`);
    console.log(`   Total Verified Reviews: ${statsRes.data.stats.totalReviews}`);
    console.log(`   Rating Distribution:`, statsRes.data.stats.distribution);
  } else {
    console.error("❌ Failed to fetch review stats:", statsRes.data);
    process.exit(1);
  }

  console.log("\n===============================================================");
  console.log("🎉 ALL STAGE 7 VERIFICATION CRITERIA PASSED CLEANLY!");
  console.log("===============================================================\n");
}

runStage7Test().catch(console.error);
