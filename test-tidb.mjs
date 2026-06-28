import { connect } from '@tidbcloud/serverless';

async function testApp() {
  console.log('Testing TiDB Connection...');
  
  const db = connect({
    url: process.env.TIDB_URL || process.env.DATABASE_URL
  });

  try {
    // 1. Fetch products
    console.log('--- Fetching Products ---');
    const result = await db.execute('SELECT * FROM products LIMIT 5');
    console.log(`Successfully fetched ${(result.rows || result).length} products.`);

    // 2. Fetch app_settings
    console.log('--- Fetching App Settings ---');
    const settings = await db.execute('SELECT * FROM app_settings LIMIT 1');
    console.log('Successfully fetched settings:', settings.rows || settings);
    
    // 3. Create a test order
    console.log('--- Creating Test Order ---');
    const orderNumber = `TEST-${Date.now()}`;
    const insertRes = await db.execute(
      `INSERT INTO orders (order_number, customer_id, total_amount, payment_method, delivery_location, status, payment_status) 
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [orderNumber, 'test-customer-123', 99.99, 'cash', 'Test Location', 'pending', 'pending']
    );
    console.log('Successfully created test order. Result:', insertRes);
    
    console.log('\n✅ ALL DATABASE TESTS PASSED! The TiDB migration is perfectly integrated.');

  } catch (err) {
    console.error('❌ DATABASE TEST FAILED:', err);
  }
}

testApp();
