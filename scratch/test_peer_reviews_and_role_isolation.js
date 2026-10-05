const http = require("http");

function request(options, postData) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => {
        try {
          resolve({ status: res.statusCode, headers: res.headers, body: JSON.parse(data) });
        } catch {
          resolve({ status: res.statusCode, headers: res.headers, raw: data });
        }
      });
    });
    req.on("error", reject);
    if (postData) {
      req.write(typeof postData === "string" ? postData : JSON.stringify(postData));
    }
    req.end();
  });
}

async function runTests() {
  console.log("==================================================================");
  console.log("🧪 TESTING VERIFIED PEER REVIEW & ROLE/CATEGORY ISOLATION");
  console.log("==================================================================\n");

  let passes = 0;
  let fails = 0;

  // TEST 1: Attempt to submit review with unverified / non-delivered produce
  console.log("TEST 1: Submitting review for produce WITHOUT delivered order (Fraud Prevention)...");
  try {
    const res = await request(
      {
        hostname: "localhost",
        port: 3000,
        path: "/api/reviews",
        method: "POST",
        headers: { "Content-Type": "application/json" },
      },
      {
        product_id: "non-existent-product-id-9999",
        rating: 5,
        comment: "This is a fake review attempting to bypass verification.",
        buyer_name: "Unverified Tester",
      }
    );

    console.log(`Status: ${res.status}`);
    console.log(`Response:`, res.body || res.raw);

    if (res.status === 403 && (res.body?.error?.includes("Fraud Prevention") || res.body?.isEligible === false)) {
      console.log("✅ PASS: Correctly blocked fraudulent review with HTTP 403 Forbidden.\n");
      passes++;
    } else {
      console.error("❌ FAIL: Expected HTTP 403 Forbidden with fraud interception.");
      fails++;
    }
  } catch (err) {
    console.error("❌ ERROR in Test 1:", err.message);
    fails++;
  }

  // TEST 2: Attempt to submit review with invalid rating (> 5)
  console.log("TEST 2: Submitting review with invalid rating (6 stars)...");
  try {
    const res = await request(
      {
        hostname: "localhost",
        port: 3000,
        path: "/api/reviews",
        method: "POST",
        headers: { "Content-Type": "application/json" },
      },
      {
        product_id: "prod-1",
        rating: 6,
        comment: "Out of bounds rating test",
        buyer_name: "Tester",
      }
    );

    console.log(`Status: ${res.status}`);
    if (res.status === 400) {
      console.log("✅ PASS: Correctly rejected invalid rating with HTTP 400.\n");
      passes++;
    } else {
      console.error("❌ FAIL: Expected HTTP 400 for rating > 5.");
      fails++;
    }
  } catch (err) {
    console.error("❌ ERROR in Test 2:", err.message);
    fails++;
  }

  // TEST 3: Attempt to submit review for an IN-TRANSIT (non-delivered) order
  console.log("TEST 3: Submitting review for an order that is IN TRANSIT (FD-20260906-K89C2Z)...");
  try {
    const res = await request(
      {
        hostname: "localhost",
        port: 3000,
        path: "/api/reviews",
        method: "POST",
        headers: { "Content-Type": "application/json" },
      },
      {
        product_id: "prod-2",
        order_reference: "FD-20260906-K89C2Z",
        rating: 4,
        comment: "Reviewing prematurely while transit is still ongoing.",
        buyer_email: "oluwole.babalola@ekiti.ng",
        buyer_name: "Chief Oluwole Babalola",
      }
    );

    console.log(`Status: ${res.status}`);
    console.log(`Response:`, res.body || res.raw);

    if (res.status === 403 && (res.body?.error?.includes("in_transit") || res.body?.error?.includes("Fraud Prevention"))) {
      console.log("✅ PASS: Correctly blocked review for non-delivered (in_transit) order with HTTP 403.\n");
      passes++;
    } else {
      console.error("❌ FAIL: Expected HTTP 403 for in_transit order.");
      fails++;
    }
  } catch (err) {
    console.error("❌ ERROR in Test 3:", err.message);
    fails++;
  }

  // TEST 4: Submit review for a DELIVERED order
  console.log("TEST 4: Submitting review for a DELIVERED order (FD-20260905-X71A9B)...");
  try {
    const res = await request(
      {
        hostname: "localhost",
        port: 3000,
        path: "/api/reviews",
        method: "POST",
        headers: { "Content-Type": "application/json" },
      },
      {
        product_id: "prod-1",
        order_reference: "FD-20260905-X71A9B",
        rating: 5,
        comment: "Exceptional waterleaf! Extremely fresh and crisp for vegetable soup in Ado-Ekiti.",
        buyer_email: "folashade@ekiti.ng",
        buyer_name: "Mrs. Folashade Adeyeye",
      }
    );

    console.log(`Status: ${res.status}`);
    console.log(`Response:`, res.body || res.raw);

    if (res.status === 201 && res.body?.success) {
      console.log("✅ PASS: Successfully accepted verified review for delivered produce with HTTP 201.\n");
      passes++;
    } else if (res.status === 409 && res.body?.alreadyReviewed) {
      console.log("✅ PASS: Review already recorded on this delivered order (duplicate prevention 409).\n");
      passes++;
    } else {
      console.error("❌ FAIL: Unexpected response for delivered order review.");
      fails++;
    }
  } catch (err) {
    console.error("❌ ERROR in Test 4:", err.message);
    fails++;
  }

  // TEST 5: Attempt to submit duplicate review on the same delivered order
  console.log("TEST 5: Submitting duplicate review on the same delivered order...");
  try {
    const res = await request(
      {
        hostname: "localhost",
        port: 3000,
        path: "/api/reviews",
        method: "POST",
        headers: { "Content-Type": "application/json" },
      },
      {
        product_id: "prod-1",
        order_reference: "FD-20260905-X71A9B",
        rating: 4,
        comment: "Second duplicate review attempting duplicate submission on same delivered order.",
        buyer_email: "folashade@ekiti.ng",
        buyer_name: "Mrs. Folashade Adeyeye",
      }
    );

    console.log(`Status: ${res.status}`);
    console.log(`Response:`, res.body || res.raw);

    if (res.status === 409 && res.body?.alreadyReviewed) {
      console.log("✅ PASS: Correctly rejected duplicate review with HTTP 409 Conflict.\n");
      passes++;
    } else {
      console.error("❌ FAIL: Expected HTTP 409 Conflict for duplicate review.");
      fails++;
    }
  } catch (err) {
    console.error("❌ ERROR in Test 5:", err.message);
    fails++;
  }

  // TEST 6: Verify eligibility endpoint (GET /api/reviews?check_eligibility=true)
  console.log("TEST 6: Checking review eligibility for delivered order...");
  try {
    const resDelivered = await request({
      hostname: "localhost",
      port: 3000,
      path: "/api/reviews?product_id=prod-1&order_reference=FD-20260905-X71A9B&check_eligibility=true",
      method: "GET",
    });

    console.log("Delivered order eligibility check:", resDelivered.body);

    if (resDelivered.status === 200 && resDelivered.body?.eligibility) {
      console.log("✅ PASS: Eligibility verification query returned structured result.\n");
      passes++;
    } else {
      console.error("❌ FAIL: Eligibility check failed.");
      fails++;
    }
  } catch (err) {
    console.error("❌ ERROR in Test 6:", err.message);
    fails++;
  }

  console.log("==================================================================");
  console.log(`🏁 TEST SUMMARY: ${passes} passed, ${fails} failed.`);
  console.log("==================================================================");
}

runTests();
