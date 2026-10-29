import { db } from './_db.js'

export default async function handler(req: any, res: any) {
  try {
    if (req.method === 'GET') {
      const { searchParams } = new URL(req.url, `http://${req.headers.host}`)
      const keys = searchParams.get('keys') // comma separated keys
      
      let query = 'SELECT * FROM app_settings'
      let params: any[] = []

      if (keys) {
        const keyArray = keys.split(',')
        query += ` WHERE meta_key IN (${keyArray.map(() => '?').join(',')})`
        params = keyArray
      }

      const results = await db.execute(query, params)
      const rows = (results as any)?.rows || results
      return res.status(200).json(rows)
    }

    if (req.method === 'PUT') {
      const body = req.body
      if (Array.isArray(body)) {
        // Bulk update
        for (const item of body) {
          const { meta_key, meta_value } = item
          if (!meta_key) continue
          await db.execute(
            'INSERT INTO app_settings (meta_key, meta_value) VALUES (?, ?) ON DUPLICATE KEY UPDATE meta_value = VALUES(meta_value)',
            [meta_key, meta_value]
          )
        }
      } else {
        const { meta_key, meta_value } = body
        if (meta_key) {
          await db.execute(
            'INSERT INTO app_settings (meta_key, meta_value) VALUES (?, ?) ON DUPLICATE KEY UPDATE meta_value = VALUES(meta_value)',
            [meta_key, meta_value]
          )
        }
      }
      return res.status(200).json({ success: true })
    }

    return res.status(405).json({ error: 'Method not allowed' })
  } catch (error: any) {
    console.error('App Settings API Error:', error)
    return res.status(500).json({ error: error.message })
  }
}
