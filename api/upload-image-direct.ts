import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'
import { v4 as uuidv4 } from 'uuid'

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { filename, contentType, base64Data } = req.body

  if (!filename || !contentType || !base64Data) {
    return res.status(400).json({ error: 'Missing required fields' })
  }

  const client = new S3Client({
    region: process.env.AWS_REGION || 'us-east-1',
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
    },
  })

  const extension = filename.split('.').pop()
  const uniqueFilename = `products/${uuidv4()}.${extension}`
  const bucket = process.env.AWS_S3_BUCKET_NAME

  if (!bucket) {
    return res.status(500).json({ error: 'S3 bucket not configured' })
  }

  // Convert base64 to buffer
  const buffer = Buffer.from(base64Data.replace(/^data:image\/\w+;base64,/, ''), 'base64')

  const command = new PutObjectCommand({
    Bucket: bucket,
    Key: uniqueFilename,
    ContentType: contentType,
    Body: buffer,
  })

  try {
    await client.send(command)
    
    const publicUrl = `https://${bucket}.s3.${process.env.AWS_REGION}.amazonaws.com/${uniqueFilename}`
    res.status(200).json({ publicUrl })
  } catch (err) {
    console.error('Error uploading directly to S3:', err)
    res.status(500).json({ error: 'Failed to upload image' })
  }
}
