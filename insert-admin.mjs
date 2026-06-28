import { connect } from '@tidbcloud/serverless';
import fs from 'fs';

const tidbEnv = fs.readFileSync('C:/Users/Tt/eazyhub-tidb/.env.local', 'utf8');
const DATABASE_URL = tidbEnv.match(/DATABASE_URL=(.*)/)?.[1]?.trim();
const db = connect({ url: DATABASE_URL });

async function insertUser() {
  const userId = 'user_3Fa2IIwrna9ZfIKQUjmZfgaBm0k';
  await db.execute(
    'INSERT IGNORE INTO admin_users (id, role, company_id) VALUES (?, ?, ?)',
    [userId, 'super_admin', 3]
  );
  console.log('User inserted');
}

insertUser().catch(console.error);
