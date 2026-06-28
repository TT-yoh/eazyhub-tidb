import fs from 'fs';
import { connect } from '@tidbcloud/serverless';

const supabaseEnvPath = 'C:/Users/Tt/eazyhub/.env';
const supabaseEnv = fs.readFileSync(supabaseEnvPath, 'utf8');
const VITE_SUPABASE_URL = supabaseEnv.match(/VITE_SUPABASE_URL=(.*)/)?.[1]?.trim();
const VITE_SUPABASE_ANON_KEY = supabaseEnv.match(/VITE_SUPABASE_ANON_KEY=(.*)/)?.[1]?.trim();

const tidbEnvPath = 'C:/Users/Tt/eazyhub-tidb/.env.local';
const tidbEnv = fs.readFileSync(tidbEnvPath, 'utf8');
const DATABASE_URL = tidbEnv.match(/DATABASE_URL=(.*)/)?.[1]?.trim();

const db = connect({ url: DATABASE_URL });

async function run() {
  const url = `${VITE_SUPABASE_URL}/rest/v1/companies?select=*`;
  const res = await fetch(url, { headers: { 'apikey': VITE_SUPABASE_ANON_KEY, 'Authorization': `Bearer ${VITE_SUPABASE_ANON_KEY}` }});
  const data = await res.json();
  console.log(JSON.stringify(data, null, 2));
}

run().catch(console.error);
