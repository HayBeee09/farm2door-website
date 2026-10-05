const http = require("http");
const fs = require("fs");
const path = require("path");

function request(options) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => {
        resolve({ status: res.statusCode, headers: res.headers, body: data });
      });
    });
    req.on("error", reject);
    req.end();
  });
}

async function testRoleIsolation() {
  console.log("==================================================================");
  console.log("🔒 TESTING STRICT ROLE & CATEGORY ISOLATION");
  console.log("==================================================================\n");

  let passes = 0;
  let fails = 0;

  // 1. Verify CheckoutModal does NOT contain /dashboard/farmer
  console.log("TEST 1: Verifying CheckoutModal does not show 'View In Farmer Portal' to buyers...");
  const checkoutModalPath = path.join(__dirname, "../components/cart/CheckoutModal.tsx");
  const checkoutContent = fs.readFileSync(checkoutModalPath, "utf-8");

  if (!checkoutContent.includes("href=\"/dashboard/farmer\"")) {
    console.log("✅ PASS: CheckoutModal has zero references to /dashboard/farmer.\n");
    passes++;
  } else {
    console.error("❌ FAIL: CheckoutModal still references /dashboard/farmer!");
    fails++;
  }

  // 2. Verify CheckoutModal has Farmer Category restriction
  console.log("TEST 2: Verifying CheckoutModal disables checkout for farmer category accounts...");
  if (
    checkoutContent.includes("Farmer Category Account Detected") &&
    checkoutContent.includes("user?.role === \"farmer\"")
  ) {
    console.log("✅ PASS: CheckoutModal guards against farmers placing retail orders.\n");
    passes++;
  } else {
    console.error("❌ FAIL: CheckoutModal missing farmer category restriction check.");
    fails++;
  }

  // 3. Verify Farmer Dashboard Page has Category Isolation Guard for buyers
  console.log("TEST 3: Verifying Farmer Dashboard has strict category isolation for buyers...");
  const farmerPagePath = path.join(__dirname, "../app/dashboard/farmer/page.tsx");
  const farmerContent = fs.readFileSync(farmerPagePath, "utf-8");

  if (
    farmerContent.includes("user.role === \"buyer\"") &&
    farmerContent.includes("No Access to Farmer Portal")
  ) {
    console.log("✅ PASS: Farmer Dashboard renders Category Access Restriction for buyers.\n");
    passes++;
  } else {
    console.error("❌ FAIL: Farmer Dashboard missing buyer category isolation guard.");
    fails++;
  }

  // 4. Verify New Listing Page has Category Isolation Guard for buyers
  console.log("TEST 4: Verifying New Listing Wizard blocks buyers...");
  const newListingPath = path.join(__dirname, "../app/dashboard/farmer/new-listing/page.tsx");
  const newListingContent = fs.readFileSync(newListingPath, "utf-8");

  if (
    newListingContent.includes("user.role === \"buyer\"") &&
    newListingContent.includes("Farmer Wizard Unavailable")
  ) {
    console.log("✅ PASS: New Listing Wizard strictly blocks buyers.\n");
    passes++;
  } else {
    console.error("❌ FAIL: New Listing Wizard missing buyer guard.");
    fails++;
  }

  // 5. Verify Orders Page has Farmer Category Isolation
  console.log("TEST 5: Verifying Orders Page blocks farmers from accessing buyer retail orders...");
  const ordersPagePath = path.join(__dirname, "../app/orders/page.tsx");
  const ordersContent = fs.readFileSync(ordersPagePath, "utf-8");

  if (
    ordersContent.includes("user?.role === \"farmer\"") &&
    ordersContent.includes("Farmer Category Portal")
  ) {
    console.log("✅ PASS: Orders Page strictly enforces Farmer Category Isolation.\n");
    passes++;
  } else {
    console.error("❌ FAIL: Orders Page missing farmer category isolation guard.");
    fails++;
  }

  // 6. Verify Homepage header hides retail shopping cart for farmers
  console.log("TEST 6: Verifying Homepage header hides retail cart for farmers...");
  const homePagePath = path.join(__dirname, "../app/page.tsx");
  const homeContent = fs.readFileSync(homePagePath, "utf-8");

  if (
    homeContent.includes("user?.role !== \"farmer\" ? (") &&
    homeContent.includes("Farmer Portal")
  ) {
    console.log("✅ PASS: Homepage displays Farmer Portal link instead of retail cart for farmers.\n");
    passes++;
  } else {
    console.error("❌ FAIL: Homepage doesn't isolate cart for farmers.");
    fails++;
  }

  console.log("==================================================================");
  console.log(`🏁 TEST SUMMARY: ${passes} passed, ${fails} failed.`);
  console.log("==================================================================");
}

testRoleIsolation();
