// scratch/test_buyer_dispute_flow.js
// Automated verification test for Buyer-Facing Dispute Submission & Resolution System

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

async function runDisputeTests() {
  console.log("===============================================================");
  console.log("🧪 TESTING BUYER DISPUTE SUBMISSION & AUDIT SYSTEM");
  console.log("===============================================================");

  const testRef = `FD-TEST-${Date.now()}`;

  // 1. Validation Test
  console.log("\n1️⃣ Verifying Dispute Input Validation (Short Description)...");
  const invalidRes = await request(
    {
      hostname: "localhost",
      port: 3000,
      path: "/api/disputes",
      method: "POST",
      headers: { "Content-Type": "application/json" },
    },
    {
      orderReference: testRef,
      description: "Bad crop",
    }
  );

  if (invalidRes.status === 400) {
    console.log("✅ VALIDATION VERIFIED: Short description rejected with HTTP 400.");
  } else {
    console.error("❌ Expected HTTP 400 for short description:", invalidRes.status);
    process.exit(1);
  }

  // 2. Dispute Creation
  console.log("\n2️⃣ Verifying Valid Dispute Ticket Creation (POST /api/disputes)...");
  const createRes = await request(
    {
      hostname: "localhost",
      port: 3000,
      path: "/api/disputes",
      method: "POST",
      headers: { "Content-Type": "application/json" },
    },
    {
      orderReference: testRef,
      type: "perishable_decay",
      cropName: "Crisp Waterleaf (Gbure)",
      farmerName: "Grace Agboola",
      buyerName: "Test Buyer",
      description: "3 bundles of waterleaf arrived severely wilted due to midday heat on transit.",
    }
  );

  if (createRes.status === 201 && createRes.data?.success && createRes.data?.dispute?.id) {
    console.log(`✅ DISPUTE TICKET CREATED: Ticket #${createRes.data.dispute.id} (Status: ${createRes.data.dispute.status})`);
  } else {
    console.error("❌ Dispute creation failed:", createRes);
    process.exit(1);
  }

  const disputeId = createRes.data.dispute.id;

  // 3. Query Dispute by Order Reference
  console.log("\n3️⃣ Verifying Dispute Query by Order Reference (GET /api/disputes)...");
  const queryRes = await request({
    hostname: "localhost",
    port: 3000,
    path: `/api/disputes?orderReference=${encodeURIComponent(testRef)}`,
    method: "GET",
  });

  if (queryRes.status === 200 && queryRes.data?.hasDispute && queryRes.data?.dispute?.id === disputeId) {
    console.log("✅ ORDER DISPUTE QUERY VERIFIED: Successfully retrieved active dispute ticket.");
  } else {
    console.error("❌ Dispute query failed:", queryRes);
    process.exit(1);
  }

  // 4. Duplicate Dispute Prevention
  console.log("\n4️⃣ Verifying Duplicate Dispute Submission Guard...");
  const duplicateRes = await request(
    {
      hostname: "localhost",
      port: 3000,
      path: "/api/disputes",
      method: "POST",
      headers: { "Content-Type": "application/json" },
    },
    {
      orderReference: testRef,
      description: "Another report for the same order reference.",
    }
  );

  if (duplicateRes.status === 409) {
    console.log("✅ DUPLICATE GUARD VERIFIED: Second submission rejected with HTTP 409 Conflict.");
  } else {
    console.error("❌ Expected HTTP 409 for duplicate dispute:", duplicateRes.status);
    process.exit(1);
  }

  // 5. Admin Adjudication & Resolution
  console.log("\n5️⃣ Verifying Administrative Resolution (POST /api/admin/disputes)...");
  const resolveRes = await request(
    {
      hostname: "localhost",
      port: 3000,
      path: "/api/admin/disputes",
      method: "POST",
      headers: { "Content-Type": "application/json" },
    },
    {
      dispute_id: disputeId,
      resolution_notes: "Authorized replacement bundle dispatched from fresh morning harvest.",
      status: "resolved",
    }
  );

  if (resolveRes.status === 200 && resolveRes.data?.success && resolveRes.data?.dispute?.status === "resolved") {
    console.log("✅ ADMIN RESOLUTION VERIFIED: Dispute marked as resolved with audit notes.");
  } else {
    console.error("❌ Admin resolution failed:", resolveRes);
    process.exit(1);
  }

  // 6. Verify Updated Status Seen by Buyer
  console.log("\n6️⃣ Verifying Buyer View Reflects Admin Resolution...");
  const updatedQueryRes = await request({
    hostname: "localhost",
    port: 3000,
    path: `/api/disputes?orderReference=${encodeURIComponent(testRef)}`,
    method: "GET",
  });

  if (
    updatedQueryRes.status === 200 &&
    updatedQueryRes.data?.dispute?.status === "resolved" &&
    updatedQueryRes.data?.dispute?.resolutionNotes
  ) {
    console.log("✅ RESOLUTION SYNC VERIFIED: Buyer receipt reflects resolved status and admin notes!");
  } else {
    console.error("❌ Resolution status not synchronized:", updatedQueryRes);
    process.exit(1);
  }

  console.log("\n===============================================================");
  console.log("🎉 ALL BUYER DISPUTE SUBMISSION & RESOLUTION TESTS PASSED!");
  console.log("===============================================================\n");
}

runDisputeTests().catch(console.error);
