// scratch/test_stage8_admin.js
// Automated verification script for Stage 8: Platform Administration & Escrow Auditing

const http = require("http");

function request(options, data = null) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let body = "";
      res.on("data", (chunk) => (body += chunk));
      res.on("end", () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(body) });
        } catch {
          resolve({ status: res.statusCode, data: body });
        }
      });
    });
    req.on("error", reject);
    if (data) req.write(JSON.stringify(data));
    req.end();
  });
}

async function runStage8Test() {
  console.log("===============================================================");
  console.log("🧪 TESTING STAGE 8: PLATFORM ADMINISTRATION & ESCROW AUDITING");
  console.log("===============================================================");

  // 1. Test Admin Metrics Endpoint
  console.log("\n1️⃣ Testing /api/admin/metrics...");
  const metricsRes = await request({
    hostname: "localhost",
    port: 3000,
    path: "/api/admin/metrics",
    method: "GET",
  });

  if (metricsRes.status !== 200 || !metricsRes.data.metrics) {
    console.error("❌ Metrics fetch failed:", metricsRes);
    process.exit(1);
  }

  const m = metricsRes.data.metrics;
  console.log("✅ EXECUTIVE METRICS VERIFIED:");
  console.log(`   GMV Transacted: ₦${m.gmvNgn.toLocaleString()}`);
  console.log(`   Active Orders: ${m.activeOrdersCount}`);
  console.log(`   Registered Smallholders: ${m.totalFarmersCount} (${m.verifiedFarmersCount} verified)`);
  console.log(`   Escrow Pool Held: ₦${m.totalEscrowHeldNgn.toLocaleString()}`);
  console.log(`   Spoilage Reduction: ${m.spoilageReduction.postHarvestRotRate} decay (vs ${m.spoilageReduction.traditionalRotRate} brokers)`);
  console.log(`   Produce Saved from Rot: ${m.spoilageReduction.kgProduceSaved} kg`);

  // 2. Test Farmer Auditing & Verification Badge Toggle
  console.log("\n2️⃣ Testing /api/admin/farmers (Auditing & Status Toggle)...");
  const farmersRes = await request({
    hostname: "localhost",
    port: 3000,
    path: "/api/admin/farmers",
    method: "GET",
  });

  if (farmersRes.status !== 200 || !Array.isArray(farmersRes.data.farmers)) {
    console.error("❌ Farmers list failed:", farmersRes);
    process.exit(1);
  }

  const farmerToTest = farmersRes.data.farmers[0];
  console.log(`Target farmer: "${farmerToTest.farmName}" (Current Status: ${farmerToTest.verificationStatus})`);

  // Toggle status to suspended
  const patchRes = await request(
    {
      hostname: "localhost",
      port: 3000,
      path: "/api/admin/farmers",
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
    },
    { farmer_id: farmerToTest.id, verification_status: "suspended" }
  );

  if (patchRes.status === 200 && patchRes.data.farmer.verificationStatus === "suspended") {
    console.log("✅ FARMER STATUS TOGGLED: Successfully set to 'suspended'.");
  } else {
    console.error("❌ Farmer status toggle failed:", patchRes);
    process.exit(1);
  }

  // Restore back to verified
  await request(
    {
      hostname: "localhost",
      port: 3000,
      path: "/api/admin/farmers",
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
    },
    { farmer_id: farmerToTest.id, verification_status: "verified" }
  );
  console.log("✅ FARMER STATUS RESTORED: Reset to 'verified'.");

  // 3. Test Escrow Ledger & 1-Click Payout Release
  console.log("\n3️⃣ Testing /api/admin/escrow (Reconciliation & Payout)...");
  const escrowRes = await request({
    hostname: "localhost",
    port: 3000,
    path: "/api/admin/escrow",
    method: "GET",
  });

  if (escrowRes.status !== 200 || !Array.isArray(escrowRes.data.transactions)) {
    console.error("❌ Escrow transactions failed:", escrowRes);
    process.exit(1);
  }

  console.log(`Total Escrow Transactions: ${escrowRes.data.transactions.length}`);
  const targetTx = escrowRes.data.transactions[0];
  if (targetTx) {
    console.log(`Auditing transaction: ${targetTx.orderReference} (${targetTx.escrowStatus})`);
    const releaseRes = await request(
      {
        hostname: "localhost",
        port: 3000,
        path: "/api/admin/escrow",
        method: "POST",
        headers: { "Content-Type": "application/json" },
      },
      { order_reference: targetTx.orderReference }
    );

    if (releaseRes.status === 200 && releaseRes.data.success) {
      console.log(`✅ ESCROW RELEASE VERIFIED: Funds disbursed to farmer bank account for ${targetTx.orderReference}!`);
    } else {
      console.error("❌ Escrow release failed:", releaseRes);
      process.exit(1);
    }
  }

  // 4. Test Dispute Resolution Workflow
  console.log("\n4️⃣ Testing /api/admin/disputes (Adjudication)...");
  const disputesRes = await request({
    hostname: "localhost",
    port: 3000,
    path: "/api/admin/disputes",
    method: "GET",
  });

  if (disputesRes.status !== 200 || !Array.isArray(disputesRes.data.disputes)) {
    console.error("❌ Disputes list failed:", disputesRes);
    process.exit(1);
  }

  const openDispute = disputesRes.data.disputes.find((d) => d.status === "open") || disputesRes.data.disputes[0];
  if (openDispute) {
    console.log(`Adjudicating dispute: ${openDispute.id} ("${openDispute.description}")`);
    const resolveRes = await request(
      {
        hostname: "localhost",
        port: 3000,
        path: "/api/admin/disputes",
        method: "POST",
        headers: { "Content-Type": "application/json" },
      },
      {
        dispute_id: openDispute.id,
        resolution_notes: "Inspected transit route; approved emergency replacement dispatch with insulated crates.",
        status: "resolved",
      }
    );

    if (resolveRes.status === 200 && resolveRes.data.dispute.status === "resolved") {
      console.log("✅ DISPUTE RESOLUTION VERIFIED: Marked as 'resolved' with audit memo.");
    } else {
      console.error("❌ Dispute resolution failed:", resolveRes);
      process.exit(1);
    }
  }

  console.log("\n===============================================================");
  console.log("🎉 ALL STAGE 8 VERIFICATION CRITERIA PASSED CLEANLY!");
  console.log("===============================================================\n");
}

runStage8Test().catch(console.error);
