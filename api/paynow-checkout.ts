import { Paynow } from "paynow"

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { orderId, amount, customerEmail } = req.body

    if (!orderId || !amount) {
      return res.status(400).json({ error: 'Missing required order parameters' })
    }

    const paynow = new Paynow(
      process.env.PAYNOW_INTEGRATION_ID || '',
      process.env.PAYNOW_INTEGRATION_KEY || ''
    )

    paynow.resultUrl = "https://your-project.vercel.app/api/paynow-webhook" 
    paynow.returnUrl = `http://localhost:5173/orders/${orderId}?payment=success` // In production, this should be the actual URL

    const payment = paynow.createPayment(`Order-${orderId}`, customerEmail || "guest@eazyhub.com")
    payment.add("EazyHub Unified Order", parseFloat(amount))

    const response = await paynow.send(payment)

    if (response.success) {
      return res.status(200).json({ 
        success: true, 
        redirectUrl: response.redirectUrl, 
        pollUrl: response.pollUrl
      })
    } else {
      return res.status(400).json({ error: response.error || "Failed to initiate Paynow transaction" })
    }
  } catch (error: any) {
    console.error("Paynow Error:", error.message)
    return res.status(500).json({ error: error.message })
  }
}
