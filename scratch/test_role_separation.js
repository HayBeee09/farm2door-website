const http = require("http");

function request(options, postData = null) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let body = "";
      res.on("data", (chunk) => (body += chunk));
      res.on("end", () => {
        try {
          resolve({ status: res.statusCode, headers: res.headers, body: JSON.parse(body) });
        } catch {
          resolve({ status: res.statusCode, headers: res.headers, body });
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

async function run() {
  console.log("==================================================");
  console.log("🌾 TESTING ROLE SEPARATION & ADMIN ACCESS FLOWS");
  console.log("==================================================");

  // 1. Farmer Registration & Login Test
  console.log("\n1️⃣ Registering and Testing Farmer Login...");
  const farmerEmail = `farmer_${Date.now()}@farm2door.ng`;
  const regFarmer = await request(
    {
      hostname: "localhost",
      port: 3000,
      path: "/api/auth/register",
      method: "POST",
      headers: { "Content-Type": "application/json" },
    },
    {
      email: farmerEmail,
      password: "password123",
      full_name: "Adeola Ekiti Farmer",
      phone: "+2348011223344",
      role: "farmer",
      farm_name: "Adeola Organic Yams",
      farm_location: "Ikere-Ekiti",
    }
  );
  console.log("Farmer register status:", regFarmer.status);
  console.log("Farmer register role:", regFarmer.body?.user?.role);

  const farmerLogin = await request(
    {
      hostname: "localhost",
      port: 3000,
      path: "/api/auth/login",
      method: "POST",
      headers: { "Content-Type": "application/json" },
    },
    { email: farmerEmail, password: "password123" }
  );

  console.log("Farmer login response status:", farmerLogin.status);
  console.log("Farmer payload role:", farmerLogin.body?.user?.role);
  if (farmerLogin.body?.user?.role !== "farmer") {
    throw new Error("Expected farmer role for registered farmer");
  }
  console.log("✅ Farmer authenticated with role 'farmer'");

  // 2. Buyer Registration & Login Test
  console.log("\n2️⃣ Registering and Testing Buyer Login...");
  const buyerEmail = `buyer_${Date.now()}@farm2door.ng`;
  const regBuyer = await request(
    {
      hostname: "localhost",
      port: 3000,
      path: "/api/auth/register",
      method: "POST",
      headers: { "Content-Type": "application/json" },
    },
    {
      email: buyerEmail,
      password: "password123",
      full_name: "Chidinma Buyer",
      phone: "+2348055667788",
      role: "buyer",
      address: "Ado-Ekiti",
    }
  );
  console.log("Buyer register status:", regBuyer.status);
  console.log("Buyer register role:", regBuyer.body?.user?.role);

  const buyerLogin = await request(
    {
      hostname: "localhost",
      port: 3000,
      path: "/api/auth/login",
      method: "POST",
      headers: { "Content-Type": "application/json" },
    },
    { email: buyerEmail, password: "password123" }
  );

  console.log("Buyer login response status:", buyerLogin.status);
  console.log("Buyer payload role:", buyerLogin.body?.user?.role);
  if (buyerLogin.body?.user?.role !== "buyer") {
    throw new Error("Expected buyer role for registered buyer");
  }
  console.log("✅ Buyer authenticated with role 'buyer'");

  // 3. Admin Login Test
  console.log("\n3️⃣ Testing Admin Login (admin@farm2door.ng)...");
  const adminLogin = await request(
    {
      hostname: "localhost",
      port: 3000,
      path: "/api/auth/login",
      method: "POST",
      headers: { "Content-Type": "application/json" },
    },
    { email: "admin@farm2door.ng", password: "adminpassword" }
  );

  console.log("Admin login response status:", adminLogin.status);
  console.log("Admin payload role:", adminLogin.body?.user?.role);
  console.log("Admin payload full_name:", adminLogin.body?.user?.full_name);
  if (adminLogin.body?.user?.role !== "admin") {
    throw new Error("Expected admin role for admin@farm2door.ng");
  }
  console.log("✅ Admin authenticated with role 'admin'");

  console.log("\n==================================================");
  console.log("🎉 ALL ROLE AUTHENTICATION VERIFICATIONS PASSED!");
  console.log("==================================================");
}

run().catch((err) => {
  console.error("Test error:", err);
  process.exit(1);
});
