import { db } from './db'

export default async function handler(req: any, res: any) {
  try {
    if (req.method === 'GET') {
      const { searchParams } = new URL(req.url, `http://${req.headers.host}`)
      const id = searchParams.get('id')
      
      if (id) {
        // Get single order with items
        const orderResults = await db.execute('SELECT * FROM orders WHERE id = ?', [id])
        const orderRows = (orderResults as any)?.rows || orderResults
        const order = orderRows[0]
        if (!order) return res.status(404).json({ error: 'Order not found' })

        // Get items and products
        const itemsRes = await db.execute(
          'SELECT oi.*, p.Name as productName, p.company FROM order_items oi LEFT JOIN products p ON oi.product_id = p.id WHERE oi.order_id = ?',
          [id]
        )
        const items = (itemsRes as any)?.rows || itemsRes
        order.order_items = items.map((item: any) => ({
          ...item,
          products: { Name: item.productName, company: item.company }
        }))
        
        return res.status(200).json(order)
      }

      const customerId = searchParams.get('customer_id')

      let query = `
        SELECT o.*, 
               c.name as customer_name, 
               c.phone as customer_phone, 
               c.email as customer_email 
        FROM orders o
        LEFT JOIN customers c ON o.customer_id = c.id
      `
      let params: any[] = []
      
      if (customerId) {
        query += ` WHERE o.customer_id = ?`
        params.push(customerId)
      }
      
      query += ` ORDER BY o.created_at DESC`
      
      const results = await db.execute(query, params)
      const rows = (results as any)?.rows || results || []
      
      // Fetch order_items for all returned orders to support nested structure
      if (rows.length > 0) {
        const orderIds = rows.map((r: any) => r.id)
        const placeholders = orderIds.map(() => '?').join(',')
        const itemsRes = await db.execute(
          `SELECT oi.*, p.Name as productName, p.company FROM order_items oi LEFT JOIN products p ON oi.product_id = p.id WHERE oi.order_id IN (${placeholders})`,
          orderIds
        )
        const items = (itemsRes as any)?.rows || itemsRes || []
        
        rows.forEach((row: any) => {
          row.order_items = items
            .filter((item: any) => item.order_id === row.id)
            .map((item: any) => ({
              ...item,
              products: { Name: item.productName, company: item.company }
            }))
        })
      }
      
      // Format to match Supabase nested structure
      const formatted = rows.map((r: any) => {
        const { customer_name, customer_phone, customer_email, ...orderData } = r
        return {
          ...orderData,
          customers: { name: customer_name, phone: customer_phone, email: customer_email }
        }
      })
      
      return res.status(200).json(formatted)
    }

    if (req.method === 'POST') {
      const body = req.body
      const columns = Object.keys(body).map(k => `\`${k}\``).join(', ')
      const placeholders = Object.keys(body).map(() => '?').join(', ')
      const values = Object.values(body)

      const query = `INSERT INTO orders (${columns}) VALUES (${placeholders})`
      await db.execute(query, values)
      return res.status(200).json({ success: true })
    }

    if (req.method === 'PUT') {
      const body = req.body
      const { id, ...updates } = body
      if (!id) return res.status(400).json({ error: 'Missing order ID' })

      const setClause = Object.keys(updates).map(k => `\`${k}\` = ?`).join(', ')
      const values = [...Object.values(updates), id]

      const query = `UPDATE orders SET ${setClause} WHERE id = ?`
      await db.execute(query, values)
      return res.status(200).json({ success: true })
    }

    return res.status(405).json({ error: 'Method not allowed' })
  } catch (error: any) {
    console.error('Orders API Error:', error)
    return res.status(500).json({ error: error.message })
  }
}
