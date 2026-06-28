import fs from 'fs';
import { connect } from '@tidbcloud/serverless';

// 1. Load Supabase Environment Variables
const supabaseEnvPath = 'C:/Users/Tt/eazyhub/.env';
const supabaseEnv = fs.readFileSync(supabaseEnvPath, 'utf8');
const VITE_SUPABASE_URL = supabaseEnv.match(/VITE_SUPABASE_URL=(.*)/)?.[1]?.trim();
const VITE_SUPABASE_ANON_KEY = supabaseEnv.match(/VITE_SUPABASE_ANON_KEY=(.*)/)?.[1]?.trim();

// 2. Load TiDB Environment Variables
const tidbEnvPath = 'C:/Users/Tt/eazyhub-tidb/.env.local';
const tidbEnv = fs.readFileSync(tidbEnvPath, 'utf8');
const DATABASE_URL = tidbEnv.match(/DATABASE_URL=(.*)/)?.[1]?.trim();

if (!VITE_SUPABASE_URL || !VITE_SUPABASE_ANON_KEY) throw new Error("Missing Supabase credentials");
if (!DATABASE_URL) throw new Error("Missing TiDB credentials");

const db = connect({ url: DATABASE_URL });

async function fetchSupabase(table) {
  const url = `${VITE_SUPABASE_URL}/rest/v1/${table}?select=*`;
  const res = await fetch(url, { headers: { 'apikey': VITE_SUPABASE_ANON_KEY, 'Authorization': `Bearer ${VITE_SUPABASE_ANON_KEY}` }});
  return res.ok ? await res.json() : [];
}

async function run() {
  console.log('--- CREATING TABLES IN TIDB ---');

  const schemas = [
    `CREATE TABLE IF NOT EXISTS companies (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(255),
      short_name VARCHAR(255),
      icon VARCHAR(255)
    )`,

    `CREATE TABLE IF NOT EXISTS products (
      id VARCHAR(255) PRIMARY KEY,
      \`Item No\` VARCHAR(255),
      \`Name\` TEXT,
      \`Unit\` VARCHAR(50),
      \`Excl VAT\` DECIMAL(10, 2),
      \`Incl VAT\` DECIMAL(10, 2),
      company INT,
      stock INT DEFAULT 0,
      is_active BOOLEAN DEFAULT TRUE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      image_url TEXT
    )`,
    
    `CREATE TABLE IF NOT EXISTS admin_users (
      id VARCHAR(255) PRIMARY KEY,
      role VARCHAR(50),
      company_id INT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`,

    `CREATE TABLE IF NOT EXISTS app_settings (
      meta_key VARCHAR(255) PRIMARY KEY,
      meta_value TEXT,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`,

    `CREATE TABLE IF NOT EXISTS customers (
      id VARCHAR(255) PRIMARY KEY,
      name VARCHAR(255),
      phone VARCHAR(50),
      email VARCHAR(255),
      address TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`,

    `CREATE TABLE IF NOT EXISTS orders (
      id VARCHAR(255) PRIMARY KEY DEFAULT (UUID()),
      order_number VARCHAR(100) UNIQUE,
      customer_id VARCHAR(255),
      total_amount DECIMAL(10, 2),
      delivery_fee DECIMAL(10, 2) DEFAULT 0,
      payment_method VARCHAR(50),
      delivery_location TEXT,
      status VARCHAR(50) DEFAULT 'pending',
      payment_status VARCHAR(50) DEFAULT 'unpaid',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`,

    `CREATE TABLE IF NOT EXISTS order_items (
      id VARCHAR(255) PRIMARY KEY DEFAULT (UUID()),
      order_id VARCHAR(255),
      product_id VARCHAR(255),
      quantity INT,
      unit_price DECIMAL(10, 2),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`,

    `CREATE TABLE IF NOT EXISTS carts (
      id VARCHAR(255) PRIMARY KEY DEFAULT (UUID()),
      user_id VARCHAR(255),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`,

    `CREATE TABLE IF NOT EXISTS cart_items (
      id VARCHAR(255) PRIMARY KEY DEFAULT (UUID()),
      cart_id VARCHAR(255),
      product_id VARCHAR(255),
      quantity INT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`,

    `CREATE TABLE IF NOT EXISTS payments (
      id VARCHAR(255) PRIMARY KEY DEFAULT (UUID()),
      order_id VARCHAR(255),
      amount DECIMAL(10, 2),
      status VARCHAR(50),
      reference VARCHAR(255),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`
  ];

  for (const query of schemas) {
    console.log('Executing:', query.split('(')[0]);
    await db.execute(query);
  }

  console.log('\n--- SEEDING DATA ---');
  const tables = ['companies', 'products', 'admin_users', 'app_settings'];
  
  for (const table of tables) {
    const data = await fetchSupabase(table);
    if (data.length === 0) {
      console.log(`No data for ${table}`);
      continue;
    }
    console.log(`Inserting ${data.length} rows into ${table}...`);
    
    for (const row of data) {
      const keys = Object.keys(row);
      const cols = keys.map(k => `\`${k}\``).join(', ');
      const placeholders = keys.map(() => '?').join(', ');
      const values = keys.map(k => row[k]);
      
      const insertQ = `INSERT IGNORE INTO ${table} (${cols}) VALUES (${placeholders})`;
      await db.execute(insertQ, values);
    }
    console.log(`Successfully migrated ${table}.`);
  }
  console.log('\n✅ ALL MIGRATIONS COMPLETE.');
}

run().catch(console.error);
