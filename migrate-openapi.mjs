import fs from 'fs';

// 1. Load Supabase Environment Variables
const supabaseEnvPath = 'C:/Users/Tt/eazyhub/.env';
const supabaseEnv = fs.readFileSync(supabaseEnvPath, 'utf8');
const VITE_SUPABASE_URL = supabaseEnv.match(/VITE_SUPABASE_URL=(.*)/)?.[1]?.trim();
const VITE_SUPABASE_ANON_KEY = supabaseEnv.match(/VITE_SUPABASE_ANON_KEY=(.*)/)?.[1]?.trim();

async function fetchOpenAPI() {
  const url = `${VITE_SUPABASE_URL}/rest/v1/?apikey=${VITE_SUPABASE_ANON_KEY}`;
  const res = await fetch(url);
  const data = await res.json();
  
  const tables = ['orders', 'order_items', 'customers'];
  for (const table of tables) {
    console.log(`\n--- Schema for ${table} ---`);
    const schema = data.definitions?.[table]?.properties || data.components?.schemas?.[table]?.properties;
    if (schema) {
      for (const [key, prop] of Object.entries(schema)) {
        console.log(`${key}: ${prop.type} (${prop.format || ''})`);
      }
    } else {
      console.log(`Not found in OpenAPI`);
    }
  }
}

fetchOpenAPI().catch(console.error);
