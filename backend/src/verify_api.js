const BASE_URL = 'http://localhost:5000';

async function verify() {
  console.log('==================================================');
  console.log(' Starting CUMTA Backend REST API Verifications...');
  console.log('==================================================');

  try {
    // 1. Verify Login
    console.log('\n[1/4] Verifying Authentication login endpoint...');
    const loginRes = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: 'admin',
        password: 'admin123'
      })
    });
    
    if (!loginRes.ok) {
      const errorText = await loginRes.text();
      throw new Error(`Login failed with status ${loginRes.status}: ${errorText}`);
    }
    
    const loginData = await loginRes.json();
    
    if (loginData && loginData.token) {
      console.log('✔ Authentication Successful!');
      console.log(`  Token received: ${loginData.token.substring(0, 30)}...`);
      console.log(`  User details: ${loginData.user.username} (${loginData.user.role})`);
    } else {
      throw new Error('Login failed: Token not found in response');
    }

    const token = loginData.token;
    const authHeaders = { 'Authorization': `Bearer ${token}` };

    // 2. Verify Stations fetch
    console.log('\n[2/4] Verifying stations database fetching...');
    const stationsRes = await fetch(`${BASE_URL}/api/stations`, { headers: authHeaders });
    if (!stationsRes.ok) {
      throw new Error(`Fetch stations failed with status ${stationsRes.status}`);
    }
    const stationsData = await stationsRes.json();
    console.log(`✔ Stations fetched successfully. Total: ${stationsData.length} stations.`);
    if (stationsData.length > 0) {
      console.log(`  Sample: ${stationsData[0].station_name} in zone ${stationsData[0].zone}`);
    }

    // 3. Verify Categories fetch
    console.log('\n[3/4] Verifying issue categories fetching...');
    const categoriesRes = await fetch(`${BASE_URL}/api/categories`, { headers: authHeaders });
    if (!categoriesRes.ok) {
      throw new Error(`Fetch categories failed with status ${categoriesRes.status}`);
    }
    const categoriesData = await categoriesRes.json();
    console.log(`✔ Issue categories fetched. Total: ${categoriesData.length} categories.`);
    if (categoriesData.length > 0) {
      console.log(`  Sample category: ${categoriesData[0].name}`);
    }

    // 4. Verify Analytics dashboard compiler
    console.log('\n[4/4] Verifying Analytics compilation engine...');
    const analyticsRes = await fetch(`${BASE_URL}/api/analytics/dashboard`, { headers: authHeaders });
    if (!analyticsRes.ok) {
      throw new Error(`Fetch analytics failed with status ${analyticsRes.status}`);
    }
    const analyticsData = await analyticsRes.json();
    console.log('✔ Analytics dashboard retrieved successfully!');
    console.log('  KPI indicators:');
    console.log(`    - Total Inspections: ${analyticsData.cards.totalTests}`);
    console.log(`    - Ticket Success Rate: ${analyticsData.kpis.ticketSuccessRate}%`);
    console.log(`    - Chennai One Availability: ${analyticsData.kpis.c1AvailabilityRate}%`);
    console.log(`    - Average ETA Delay Variance: ${analyticsData.cards.avgEtaDifference} min`);
    
    console.log('\n==================================================');
    console.log(' ✔ ALL REST API INTEGRATION TESTS PASSED SUCCESSFULLY!');
    console.log('==================================================');
  } catch (err) {
    console.error('\n❌ Verification Failed!');
    console.error(`  Error: ${err.message}`);
    process.exit(1);
  }
}

verify();
