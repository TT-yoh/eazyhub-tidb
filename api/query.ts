import { db } from './_db.js'

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })
  
  try {
    const { table, action, match, data, range, inFilter, order, isSingle, neqFilter } = req.body

    let query = ''
    let params: any[] = []

    // Ensure valid table names to prevent injection
    if (!/^[a-zA-Z0-9_]+$/.test(table)) throw new Error('Invalid table name')

    if (action === 'select') {
      query = `SELECT * FROM \`${table}\``
      const whereClauses = []
      
      if (match) {
        for (const [key, value] of Object.entries(match)) {
          whereClauses.push(`\`${key}\` = ?`)
          params.push(value)
        }
      }

      if (neqFilter) {
        whereClauses.push(`\`${neqFilter.column}\` != ?`)
        params.push(neqFilter.value)
      }
      
      if (inFilter && inFilter.values && inFilter.values.length > 0) {
        const placeholders = inFilter.values.map(() => '?').join(',')
        whereClauses.push(`\`${inFilter.column}\` IN (${placeholders})`)
        params.push(...inFilter.values)
      } else if (inFilter && inFilter.values && inFilter.values.length === 0) {
        whereClauses.push(`1 = 0`) // Empty IN clause means no results
      }
      
      if (whereClauses.length > 0) {
        query += ` WHERE ` + whereClauses.join(' AND ')
      }
      
      if (order) {
        query += ` ORDER BY \`${order.column}\` ${order.ascending ? 'ASC' : 'DESC'}`
      }
      
      if (range) {
        query += ` LIMIT ? OFFSET ?`
        const limit = range.to - range.from + 1
        params.push(limit, range.from)
      }

    } else if (action === 'insert') {
      const items = Array.isArray(data) ? data : [data]
      if (items.length === 0) return res.status(200).json({ data: null, error: null })
      
      const columns = Object.keys(items[0]).map(k => `\`${k}\``).join(', ')
      const placeholders = Object.keys(items[0]).map(() => '?').join(', ')
      
      let insertedData: any[] = []

      for (const item of items) {
        const itemValues = Object.values(item)
        const insertQuery = `INSERT INTO \`${table}\` (${columns}) VALUES (${placeholders})`
        const res: any = await db.execute(insertQuery, itemValues)
        
        let insertedId = res?.insertId
        if (insertedId) {
           const fetchRes: any = await db.execute(`SELECT * FROM \`${table}\` WHERE id = ?`, [insertedId])
           const rows = fetchRes?.rows || fetchRes
           if (rows && rows.length > 0) insertedData.push(rows[0])
           else insertedData.push({ ...item, id: insertedId })
        } else {
           insertedData.push(item) // If no insertId, assume id was provided in payload
        }
      }
      
      const responseData = Array.isArray(data) ? insertedData : insertedData[0]
      return res.status(200).json({ data: responseData, error: null })

    } else if (action === 'update') {
      const setClauses = Object.keys(data).map(k => `\`${k}\` = ?`).join(', ')
      const updateValues = Object.values(data)
      
      query = `UPDATE \`${table}\` SET ${setClauses}`
      
      const whereClauses = []
      if (match) {
        for (const [key, value] of Object.entries(match)) {
          whereClauses.push(`\`${key}\` = ?`)
          params.push(value)
        }
      }
      if (neqFilter) {
        whereClauses.push(`\`${neqFilter.column}\` != ?`)
        params.push(neqFilter.value)
      }
      
      if (whereClauses.length > 0) {
        query += ` WHERE ` + whereClauses.join(' AND ')
      }
      
      await db.execute(query, [...updateValues, ...params])
      return res.status(200).json({ data: null, error: null })

    } else if (action === 'delete') {
      const whereClauses = []
      
      if (match) {
        for (const [key, value] of Object.entries(match)) {
          whereClauses.push(`\`${key}\` = ?`)
          params.push(value)
        }
      }
      if (neqFilter) {
        whereClauses.push(`\`${neqFilter.column}\` != ?`)
        params.push(neqFilter.value)
      }
      const whereString = whereClauses.length > 0 ? ` WHERE ` + whereClauses.join(' AND ') : ''
      
      // Select first to return the deleted rows
      const selectQuery = `SELECT * FROM \`${table}\`` + whereString
      const selectRes = await db.execute(selectQuery, params)
      const deletedRows = (selectRes as any)?.rows || selectRes || []

      // Now perform delete
      query = `DELETE FROM \`${table}\`` + whereString
      await db.execute(query, params)
      
      return res.status(200).json({ data: deletedRows, error: null })
    }

    const results = await db.execute(query, params)
    const rows = (results as any)?.rows || results || []
    
    if (action === 'select') {
       if (isSingle) return res.status(200).json({ data: rows[0] || null, error: null })
       return res.status(200).json({ data: rows, error: null })
    }
    
    return res.status(200).json({ data: rows, error: null })
  } catch (error: any) {
    console.error('Query API Error:', error)
    return res.status(500).json({ error: { message: error.message }, data: null })
  }
}
