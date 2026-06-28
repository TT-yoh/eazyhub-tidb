import { db } from './db'

export default async function handler(req: any, res: any) {
  try {
    if (req.method === 'GET') {
      const { searchParams } = new URL(req.url, `http://${req.headers.host}`)
      const id = searchParams.get('id')
      
      let query = 'SELECT * FROM customers'
      let params: any[] = []

      if (id) {
        query += ' WHERE id = ?'
        params.push(id)
      }

      const results = await db.execute(query, params)
      const rows = (results as any)?.rows || results
      return res.status(200).json(id ? rows[0] : rows)
    }

    if (req.method === 'PUT') {
      const body = req.body
      // Upsert logic for TiDB: INSERT ... ON DUPLICATE KEY UPDATE
      const columns = Object.keys(body).map(k => `\`${k}\``).join(', ')
      const placeholders = Object.keys(body).map(() => '?').join(', ')
      const values = Object.values(body)

      const updateClause = Object.keys(body)
        .filter(k => k !== 'id') // Don't update the primary key
        .map(k => `\`${k}\` = VALUES(\`${k}\`)`)
        .join(', ')

      const query = `INSERT INTO customers (${columns}) VALUES (${placeholders}) ON DUPLICATE KEY UPDATE ${updateClause}`
      await db.execute(query, values)
      return res.status(200).json({ success: true })
    }

    return res.status(405).json({ error: 'Method not allowed' })
  } catch (error: any) {
    console.error('Customers API Error:', error)
    return res.status(500).json({ error: error.message })
  }
}
