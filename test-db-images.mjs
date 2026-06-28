import { connect } from '@tidbcloud/serverless'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const envPath = path.join(__dirname, '.env.local')
const envContent = fs.readFileSync(envPath, 'utf8')

const getEnv = (key) => {
  const match = envContent.match(new RegExp(`^${key}=(.*)$`, 'm'))
  return match ? match[1].trim() : undefined
}

const DATABASE_URL = getEnv('DATABASE_URL')

async function testQuery() {
  const db = connect({ url: DATABASE_URL })
  const result = await db.execute("SELECT id, `Item No`, Name, image_url FROM products WHERE image_url IS NOT NULL AND image_url != '' LIMIT 5")
  console.log("Products with images:")
  console.log(result)
}

testQuery()
