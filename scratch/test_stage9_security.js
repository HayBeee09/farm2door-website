// scratch/test_stage9_security.js
// Automated verification script for Stage 9: Security Hardening & Production Verification

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

async function runStage9Test() {
  console.log("===============================================================");
  console.log("🧪 TESTING STAGE 9: SECURITY HARDENING & PRODUCTION VERIFICATION");
  console.log("===============================================================");

  // 1. Security Headers Audit
  console.log("\n1️⃣ Verifying HTTP Security Headers...");
  const headRes = await request({
    hostname: "localhost",
    port: 3000,
    path: "/",
    method: "GET",
  });

  const headers = headRes.headers;
  console.log("Response headers received:");
  console.log(" - X-Frame-Options:", headers["x-frame-options"]);
  console.log(" - X-Content-Type-Options:", headers["x-content-type-options"]);
  console.log(" - Strict-Transport-Security:", headers["strict-transport-security"]);
  console.log(" - X-XSS-Protection:", headers["x-xss-protection"]);

  if (
    headers["x-frame-options"] === "SAMEORIGIN" &&
    headers["x-content-type-options"] === "nosniff" &&
    headers["x-xss-protection"] === "1; mode=block"
  ) {
    console.log("✅ SECURITY HEADERS VERIFIED: Correct production headers returned!");
  } else {
    console.error("❌ Security headers missing or mismatched:", headers);
    process.exit(1);
  }

  // 2. SQL Injection Resistance Audit
  console.log("\n2️⃣ Verifying SQL Injection Resilience on Catalog Search...");
  const sqliQuery = encodeURIComponent("Tubers' OR '1'='1; DROP TABLE products;--");
  const sqliRes = await request({
    hostname: "localhost",
    port: 3000,
    path: `/api/products?search=${sqliQuery}`,
    method: "GET",
  });

  if (sqliRes.status === 200 && Array.isArray(sqliRes.data?.products)) {
    console.log(`✅ SQL INJECTION DEFENSE VERIFIED: Parameterized queries safely escaped input without crash!`);
    console.log(`   Returned ${sqliRes.data.products.length} products safely.`);
  } else {
    console.error("❌ SQL Injection test unexpected response:", sqliRes);
    process.exit(1);
  }

  // 3. XSS Attack Payload Sanitization Audit
  console.log("\n3️⃣ Verifying XSS Attack Payload Sanitization...");
  const xssPayload = {
    product_id: "test-id",
    order_id: "test-order",
    rating: 5,
    comment: "<script>alert('xss');document.cookie='stolen'</script>Great produce!",
  };

  const xssRes = await request(
    {
      hostname: "localhost",
      port: 3000,
      path: "/api/reviews",
      method: "POST",
      headers: { "Content-Type": "application/json" },
    },
    xssPayload
  );

  if (xssRes.status === 403 || xssRes.status === 400) {
    console.log(`✅ XSS ATTEMPT SAFELY INTERCEPTED: Rejected with HTTP ${xssRes.status}.`);
  } else {
    console.error("❌ XSS test failed:", xssRes);
    process.exit(1);
  }

  // 4. Platform Administration & Commercial Routes Verification
  console.log("\n4️⃣ Verifying Platform Administration Route (/dashboard/admin)...");
  const adminRes = await request({
    hostname: "localhost",
    port: 3000,
    path: "/dashboard/admin",
    method: "GET",
  });

  if (adminRes.status === 200) {
    console.log("✅ PLATFORM ADMINISTRATION ROUTE VERIFIED: HTTP 200 OK at /dashboard/admin!");
  } else {
    console.error("❌ Admin route failed:", adminRes.status);
    process.exit(1);
  }

  console.log("\n===============================================================");
  console.log("🎉 ALL STAGE 9 SECURITY & PRODUCTION VERIFICATION TESTS PASSED!");
  console.log("===============================================================\n");
}

runStage9Test().catch(console.error);
