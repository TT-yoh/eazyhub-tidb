import { db } from './db'

export default async function handler(req: any, res: any) {
  try {
    if (req.method !== 'GET') {
      return res.status(405).json({ error: 'Method not allowed' })
    }

    const CLERK_SECRET_KEY = process.env.CLERK_SECRET_KEY
    if (!CLERK_SECRET_KEY) {
      throw new Error('Missing CLERK_SECRET_KEY environment variable.')
    }

    // Fetch users from Clerk
    const clerkRes = await fetch('https://api.clerk.com/v1/users?limit=100', {
      headers: {
        'Authorization': `Bearer ${CLERK_SECRET_KEY}`,
        'Content-Type': 'application/json'
      }
    })

    if (!clerkRes.ok) {
      const errorData = await clerkRes.text()
      throw new Error(`Clerk API Error: ${errorData}`)
    }

    const users = await clerkRes.json()

    // Map Clerk users to a simpler format
    const formattedUsers = users.map((user: any) => {
      const email = user.email_addresses?.[0]?.email_address || ''
      const phone = user.phone_numbers?.[0]?.phone_number || ''
      return {
        id: user.id,
        email: email,
        phone: phone,
        name: user.first_name ? `${user.first_name} ${user.last_name || ''}`.trim() : email.split('@')[0],
        created_at: new Date(user.created_at).toISOString(),
        location: '', // Users from clerk don't have location by default unless in metadata
      }
    })

    return res.status(200).json(formattedUsers)
  } catch (error: any) {
    console.error('Clerk Fetch Error:', error)
    return res.status(500).json({ error: error.message })
  }
}
