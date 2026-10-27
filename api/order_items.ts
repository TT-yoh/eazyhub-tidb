import { db } from './db.js'

export default async function handler(req: any, res: any) {
  try {
    if (req.method === 'GET') {
      const { searchParams } = new URL(req.url, `http://${req.headers.host}`)
      const orderId = searchParams.get('order_id')
      
      let query = 'SELECT * FROM order_items'
      let params: any[] = []

      if (orderId) {
        query += ' WHERE order_id = ?'
        params.push(orderId)
      }

      const results = await db.execute(query, params)
      const rows = (results as any)?.rows || results
      return res.status(200).json(rows)
    }

    if (req.method === 'POST') {
      const body = req.body
      // Handle bulk insert
      const items = Array.isArray(body) ? body : [body]
      
      for (const item of items) {
        const columns = Object.keys(item).map(k => `\`${k}\``).join(', ')
        const placeholders = Object.keys(item).map(() => '?').join(', ')
        const values = Object.values(item)
        const query = `INSERT INTO order_items (${columns}) VALUES (${placeholders})`
        await db.execute(query, values)
      }
      
      return res.status(200).json({ success: true })
    }

    return res.status(405).json({ error: 'Method not allowed' })
  } catch (error: any) {
    console.error('Order Items API Error:', error)
    return res.status(500).json({ error: error.message })
  }
}
