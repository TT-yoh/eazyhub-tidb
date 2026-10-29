import { connect } from '@tidbcloud/serverless'

const connectionString = process.env.DATABASE_URL

if (!connectionString) {
  console.error("Missing DATABASE_URL environment variable for TiDB connection.")
}

export const db = connect({ url: connectionString })
