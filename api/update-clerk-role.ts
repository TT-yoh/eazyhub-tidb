import { db } from './db'

export default async function handler(req: any, res: any) {
  try {
    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Method not allowed' })
    }

    const { id, role, company_id } = req.body

    if (!id) {
      return res.status(400).json({ error: 'Missing user ID' })
    }

    const CLERK_SECRET_KEY = process.env.CLERK_SECRET_KEY
    if (!CLERK_SECRET_KEY) {
      throw new Error('Missing CLERK_SECRET_KEY environment variable.')
    }

    let publicMetadata = {}
    if (role === 'customer' || !role) {
      // Clear admin metadata
      publicMetadata = { role: null, company_id: null }
    } else {
      publicMetadata = { role, company_id }
    }

    const clerkRes = await fetch(`https://api.clerk.com/v1/users/${id}/metadata`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${CLERK_SECRET_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ public_metadata: publicMetadata })
    })

    if (!clerkRes.ok) {
      const errorData = await clerkRes.text()
      throw new Error(`Clerk API Error: ${errorData}`)
    }

    return res.status(200).json({ success: true })
  } catch (error: any) {
    console.error('Clerk Sync Error:', error)
    return res.status(500).json({ error: error.message })
  }
}
