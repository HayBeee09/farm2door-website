const http = require("http");

function request(url, options = {}, postData = null) {
  return new Promise((resolve, reject) => {
    const parsedUrl = new URL(url);
    const reqOptions = {
      hostname: parsedUrl.hostname,
      port: parsedUrl.port || 3000,
      path: parsedUrl.pathname + parsedUrl.search,
      method: options.method || "GET",
      headers: options.headers || {},
    };

    const req = http.request(reqOptions, (res) => {
      let body = "";
      res.on("data", (chunk) => (body += chunk));
      res.on("end", () => {
        try {
          const parsed = JSON.parse(body);
          resolve({ status: res.statusCode, body: parsed, raw: body });
        } catch {
          resolve({ status: res.statusCode, body, raw: body });
        }
      });
    });

    req.on("error", (err) => reject(err));
    if (postData) {
      req.write(typeof postData === "string" ? postData : JSON.stringify(postData));
    }
    req.end();
  });
}

async function runTests() {
  console.log("=== FARMER BANK PAYOUT & ESCROW AUDIT VERIFICATION ===");
  let passed = 0;
  let total = 0;

  function assert(condition, message) {
    total++;
    if (condition) {
      console.log(`[PASS] ${message}`);
      passed++;
    } else {
      console.error(`[FAIL] ${message}`);
    }
  }

  try {
    // 1. GET initial bank details for Babatunde Agro (Seed ID: 11111111-1111-1111-1111-111111111111)
    console.log("\n1. Testing GET /api/farmer/bank...");
    const getRes = await request(
      "http://localhost:3000/api/farmer/bank?farmer_id=11111111-1111-1111-1111-111111111111"
    );
    assert(getRes.status === 200, `GET returned status 200 (received ${getRes.status})`);
    assert(getRes.body.success === true, "GET returned success: true");
    assert(
      getRes.body.bankDetails && getRes.body.bankDetails.bankName,
      `Farmer bank name present: ${getRes.body.bankDetails?.bankName}`
    );
    assert(
      Array.isArray(getRes.body.availableBanks) && getRes.body.availableBanks.length >= 10,
      `Available Nigerian banks list returned (${getRes.body.availableBanks?.length} banks)`
    );

    // 2. Test Invalid NUBAN Validation (9 digits instead of 10)
    console.log("\n2. Testing POST /api/farmer/bank validation (invalid 9-digit account)...");
    const badAccRes = await request(
      "http://localhost:3000/api/farmer/bank",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      },
      {
        farmer_id: "11111111-1111-1111-1111-111111111111",
        bank_name: "Guaranty Trust Bank (GTBank)",
        account_number: "123456789", // only 9 digits
        account_name: "Test Farmer",
      }
    );
    assert(
      badAccRes.status === 400,
      `Rejected invalid 9-digit account with HTTP 400 (received ${badAccRes.status})`
    );
    assert(
      badAccRes.body.success === false && /10 digits/i.test(badAccRes.body.error),
      `Proper error message returned: "${badAccRes.body.error}"`
    );

    // 3. Test Valid Bank Payout Update (10-digit NUBAN)
    console.log("\n3. Testing POST /api/farmer/bank valid update...");
    const updateRes = await request(
      "http://localhost:3000/api/farmer/bank",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      },
      {
        farmer_id: "11111111-1111-1111-1111-111111111111",
        bank_name: "Guaranty Trust Bank (GTBank)",
        account_number: "0123456789",
        account_name: "Babatunde Agro Enterprises Ltd",
        bank_code: "058",
      }
    );
    assert(updateRes.status === 200, `POST returned status 200 (received ${updateRes.status})`);
    assert(
      updateRes.body.bankDetails.accountNumber === "0123456789",
      `Updated account number matches: ${updateRes.body.bankDetails?.accountNumber}`
    );
    assert(
      updateRes.body.bankDetails.bankName === "Guaranty Trust Bank (GTBank)",
      `Updated bank matches: ${updateRes.body.bankDetails?.bankName}`
    );

    // 4. Verify Admin Escrow Ledger includes farmerBankDetails
    console.log("\n4. Testing GET /api/admin/escrow for farmerBankDetails...");
    const escrowRes = await request("http://localhost:3000/api/admin/escrow");
    assert(escrowRes.status === 200, `Admin escrow returned 200 (received ${escrowRes.status})`);
    assert(
      Array.isArray(escrowRes.body.transactions) && escrowRes.body.transactions.length > 0,
      `Escrow transactions returned (${escrowRes.body.transactions?.length} records)`
    );
    const firstTx = escrowRes.body.transactions[0];
    assert(
      firstTx && firstTx.farmerBankDetails && firstTx.farmerBankDetails.accountNumber,
      `First escrow transaction contains registered farmerBankDetails: ${firstTx?.farmerBankDetails?.bankName} - ${firstTx?.farmerBankDetails?.accountNumber}`
    );

    // 5. Restore Babatunde seed bank details
    console.log("\n5. Restoring initial seed bank details for Babatunde Agbaje...");
    const restoreRes = await request(
      "http://localhost:3000/api/farmer/bank",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      },
      {
        farmer_id: "11111111-1111-1111-1111-111111111111",
        bank_name: "First Bank of Nigeria",
        account_number: "3098124451",
        account_name: "Babatunde Agbaje Agro",
        bank_code: "011",
      }
    );
    assert(restoreRes.status === 200, "Restored seed bank details successfully");

    console.log(`\n=== RESULTS: ${passed}/${total} assertions passed ===\n`);
    if (passed === total) {
      process.exit(0);
    } else {
      process.exit(1);
    }
  } catch (err) {
    console.error("Test error:", err);
    process.exit(1);
  }
}

runTests();
