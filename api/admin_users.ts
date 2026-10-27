import { db } from './db.js'

export default async function handler(req: any, res: any) {
  try {
    if (req.method === 'GET') {
      const { searchParams } = new URL(req.url, `http://${req.headers.host}`)
      const id = searchParams.get('id')
      
      let query = 'SELECT * FROM admin_users'
      let params: any[] = []

      if (id) {
        query += ' WHERE id = ?'
        params.push(id)
      }

      const results = await db.execute(query, params)
      const rows = (results as any)?.rows || results
      return res.status(200).json(id ? (rows[0] || null) : rows)
    }

    if (req.method === 'POST') {
      const body = req.body
      if (Array.isArray(body)) {
        // Bulk insert
        const first = body[0]
        if (!first) return res.status(200).json({ success: true })
        const columns = Object.keys(first).map(k => `\`${k}\``).join(', ')
        const placeholders = Object.keys(first).map(() => '?').join(', ')
        let allValues: any[] = []
        body.forEach(item => {
          allValues = allValues.concat(Object.values(item))
        })
        const valuesList = body.map(() => `(${placeholders})`).join(', ')
        const query = `INSERT INTO admin_users (${columns}) VALUES ${valuesList}`
        await db.execute(query, allValues)
      } else {
        const columns = Object.keys(body).map(k => `\`${k}\``).join(', ')
        const placeholders = Object.keys(body).map(() => '?').join(', ')
        const values = Object.values(body)
        const query = `INSERT INTO admin_users (${columns}) VALUES (${placeholders})`
        await db.execute(query, values)
      }
      return res.status(200).json({ success: true })
    }

    if (req.method === 'PUT') {
      const body = req.body
      const { id, ...updates } = body
      if (!id) return res.status(400).json({ error: 'Missing admin user ID' })

      const setClause = Object.keys(updates).map(k => `\`${k}\` = ?`).join(', ')
      const values = [...Object.values(updates), id]

      const query = `UPDATE admin_users SET ${setClause} WHERE id = ?`
      await db.execute(query, values)
      return res.status(200).json({ success: true })
    }

    if (req.method === 'DELETE') {
      const { searchParams } = new URL(req.url, `http://${req.headers.host}`)
      const id = searchParams.get('id')
      if (!id) {
        // Support bulk delete
        const body = req.body
        if (body && Array.isArray(body.ids)) {
          const placeholders = body.ids.map(() => '?').join(',')
          await db.execute(`DELETE FROM admin_users WHERE id IN (${placeholders})`, body.ids)
          return res.status(200).json({ success: true })
        }
        return res.status(400).json({ error: 'Missing ID for deletion' })
      }
      
      await db.execute('DELETE FROM admin_users WHERE id = ?', [id])
      return res.status(200).json({ success: true })
    }

    return res.status(405).json({ error: 'Method not allowed' })
  } catch (error: any) {
    console.error('Admin API Error:', error)
    return res.status(500).json({ error: error.message })
  }
}
