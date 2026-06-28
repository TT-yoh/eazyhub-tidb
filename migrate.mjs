import fs from 'fs';
import path from 'path';
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

if (!VITE_SUPABASE_URL || !VITE_SUPABASE_ANON_KEY) {
  throw new Error("Missing Supabase credentials");
}
if (!DATABASE_URL) {
  throw new Error("Missing TiDB credentials");
}

console.log('Connecting to TiDB...');
const db = connect({ url: DATABASE_URL });

async function fetchSupabase(table) {
  const url = `${VITE_SUPABASE_URL}/rest/v1/${table}?select=*`;
  console.log(`Fetching from Supabase: ${table}`);
  const res = await fetch(url, {
    headers: {
      'apikey': VITE_SUPABASE_ANON_KEY,
      'Authorization': `Bearer ${VITE_SUPABASE_ANON_KEY}`
    }
  });
  if (!res.ok) {
    const errorText = await res.text();
    console.error(`Error fetching ${table}:`, errorText);
    return [];
  }
  return await res.json();
}

async function migrate() {
  const tables = ['products', 'orders', 'order_items', 'admin_users', 'customers', 'app_settings'];
  
  for (const table of tables) {
    const data = await fetchSupabase(table);
    console.log(`Extracted ${data.length} rows from Supabase table '${table}'.`);
    
    if (data.length > 0) {
      console.log(`Sample row for ${table}:`, data[0]);
    }
  }
}

migrate().catch(console.error);
