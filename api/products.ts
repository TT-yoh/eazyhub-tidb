import { db } from './db.js'
import crypto from 'crypto'

export default async function handler(req: any, res: any) {
  try {
    if (req.method === 'GET') {
      const isActive = req.query?.is_active || req.query?.isActive
      const company = req.query?.company
      
      let query = 'SELECT * FROM products WHERE 1=1'
      let params: any[] = []

      if (isActive !== undefined && isActive !== null) {
        query += ' AND is_active = ?'
        params.push(isActive === 'true' ? 1 : 0)
      }

      if (company !== undefined && company !== null) {
        query += ' AND company = ?'
        params.push(Number(company))
      }

      const results = await db.execute(query, params)
      // Note: @tidbcloud/serverless connect.execute returns { rows: [...] } usually,
      // but if we are using mysql2 it might return an array of rows. Let's check db.ts.
      // Assuming @tidbcloud/serverless execute returns the result directly or in .rows.
      const rows = (results as any)?.rows || results
      return res.status(200).json(rows)
    }

    if (req.method === 'POST') {
      const body = req.body
      const items = Array.isArray(body) ? body : [body]
      if (items.length === 0) return res.status(200).json({ success: true })

      // 1. Gather all Item Nos
      const itemNos = items.map((i: any) => i['Item No']).filter(Boolean)
      
      let existingMap = new Map<string, string>()
      
      if (itemNos.length > 0) {
        // 2. Query existing products in one go
        const placeholders = itemNos.map(() => '?').join(',')
        const existingRes = await db.execute(`SELECT id, \`Item No\`, company FROM products WHERE \`Item No\` IN (${placeholders})`, itemNos)
        const existingRows = (existingRes as any)?.rows || existingRes
        
        for (const row of existingRows) {
          existingMap.set(`${row['Item No']}_${row.company}`, row.id)
        }
      }

      // 3. Assign IDs
      for (const item of items) {
        if (!item.id && item['Item No']) {
          const key = `${item['Item No']}_${item.company}`
          if (existingMap.has(key)) {
            item.id = existingMap.get(key)
          } else {
            item.id = crypto.randomUUID()
          }
        } else if (!item.id) {
          item.id = crypto.randomUUID()
        }
      }

      // 4. Batch Insert
      const columns = Object.keys(items[0]).map(k => `\`${k}\``).join(', ')
      const updateClause = Object.keys(items[0]).filter(k => k !== 'id').map(k => `\`${k}\`=VALUES(\`${k}\`)`).join(', ')
      
      let allValues: any[] = []
      let placeholdersArr: string[] = []
      
      for (const item of items) {
        // Ensure keys match items[0] exactly in order
        const rowValues = Object.keys(items[0]).map(k => item[k] ?? null)
        allValues.push(...rowValues)
        placeholdersArr.push(`(${Object.keys(items[0]).map(() => '?').join(', ')})`)
      }

      const query = `INSERT INTO products (${columns}) VALUES ${placeholdersArr.join(', ')} ON DUPLICATE KEY UPDATE ${updateClause}`
      await db.execute(query, allValues)

      return res.status(200).json({ success: true })
    }

    if (req.method === 'PUT') {
      const body = req.body
      const { id, ...updates } = body
      if (!id) return res.status(400).json({ error: 'Missing product ID' })

      const setClause = Object.keys(updates).map(k => `\`${k}\` = ?`).join(', ')
      const values = [...Object.values(updates), id]

      const query = `UPDATE products SET ${setClause} WHERE id = ?`
      await db.execute(query, values)
      return res.status(200).json({ success: true })
    }

    if (req.method === 'DELETE') {
      const { searchParams } = new URL(req.url, `http://${req.headers.host}`)
      const id = searchParams.get('id')
      if (!id) return res.status(400).json({ error: 'Missing product ID' })

      await db.execute('DELETE FROM products WHERE id = ?', [id])
      return res.status(200).json({ success: true })
    }

    return res.status(405).json({ error: 'Method not allowed' })
  } catch (error: any) {
    console.error('Products API Error:', error)
    return res.status(500).json({ error: error.message })
  }
}
