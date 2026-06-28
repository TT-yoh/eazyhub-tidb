import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import { v4 as uuidv4 } from 'uuid'

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { filename, contentType } = req.body

  if (!filename || !contentType) {
    return res.status(400).json({ error: 'Missing filename or contentType' })
  }

  const client = new S3Client({
    region: process.env.AWS_REGION || 'us-east-1',
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
    },
  })

  // Generate a unique file name
  const extension = filename.split('.').pop()
  const uniqueFilename = `products/${uuidv4()}.${extension}`
  
  const bucket = process.env.AWS_S3_BUCKET_NAME

  if (!bucket) {
    return res.status(500).json({ error: 'S3 bucket not configured' })
  }

  const command = new PutObjectCommand({
    Bucket: bucket,
    Key: uniqueFilename,
    ContentType: contentType,
  })

  try {
    const signedUrl = await getSignedUrl(client, command, { expiresIn: 3600 })
    
    // Construct the final public URL that will be used to access the image
    const publicUrl = `https://${bucket}.s3.${process.env.AWS_REGION}.amazonaws.com/${uniqueFilename}`

    res.status(200).json({ signedUrl, publicUrl })
  } catch (err) {
    console.error('Error generating presigned URL:', err)
    res.status(500).json({ error: 'Failed to generate upload URL' })
  }
}
