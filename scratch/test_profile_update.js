// scratch/test_profile_update.js
// Automated verification test for Profile & Account Settings Management (PRD FR-1.4)

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

async function runProfileTests() {
  console.log("===============================================================");
  console.log("🧪 TESTING PROFILE MANAGEMENT & SETTINGS (PRD FR-1.4)");
  console.log("===============================================================");

  // 1. Verify Unauthenticated Profile Read Protection
  console.log("\n1️⃣ Verifying Unauthenticated GET /api/auth/profile Guard...");
  const unauthGet = await request({
    hostname: "localhost",
    port: 3000,
    path: "/api/auth/profile",
    method: "GET",
  });

  if (unauthGet.status === 401) {
    console.log("✅ AUTHENTICATION GUARD VERIFIED: GET /api/auth/profile rejected with HTTP 401.");
  } else {
    console.error("❌ Unexpected response for unauthenticated GET:", unauthGet.status);
    process.exit(1);
  }

  // 2. Verify Unauthenticated Profile Update Protection
  console.log("\n2️⃣ Verifying Unauthenticated PATCH /api/auth/profile Guard...");
  const unauthPatch = await request(
    {
      hostname: "localhost",
      port: 3000,
      path: "/api/auth/profile",
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
    },
    { full_name: "Hacker", phone: "123456" }
  );

  if (unauthPatch.status === 401) {
    console.log("✅ AUTHENTICATION GUARD VERIFIED: PATCH /api/auth/profile rejected with HTTP 401.");
  } else {
    console.error("❌ Unexpected response for unauthenticated PATCH:", unauthPatch.status);
    process.exit(1);
  }

  // 3. Verify Profile Page HTTP Status & UI Route
  console.log("\n3️⃣ Verifying Profile Page Route (/profile)...");
  const profilePage = await request({
    hostname: "localhost",
    port: 3000,
    path: "/profile",
    method: "GET",
  });

  if (profilePage.status === 200) {
    console.log("✅ PROFILE PAGE VERIFIED: HTTP 200 OK at /profile.");
  } else {
    console.error("❌ Profile page failed to load:", profilePage.status);
    process.exit(1);
  }

  console.log("\n===============================================================");
  console.log("🎉 ALL PROFILE MANAGEMENT & SETTINGS TESTS PASSED!");
  console.log("===============================================================\n");
}

runProfileTests().catch(console.error);
