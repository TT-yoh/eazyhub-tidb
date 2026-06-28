import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const envPath = path.join(__dirname, '.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');

const getEnv = (key) => {
  const match = envContent.match(new RegExp(`^${key}=(.*)$`, 'm'));
  return match ? match[1].trim() : undefined;
};

const client = new S3Client({
  region: getEnv('AWS_REGION'),
  credentials: {
    accessKeyId: getEnv('AWS_ACCESS_KEY_ID'),
    secretAccessKey: getEnv('AWS_SECRET_ACCESS_KEY'),
  },
});

const bucketName = getEnv('AWS_S3_BUCKET_NAME');

async function testPut() {
  const command = new PutObjectCommand({
    Bucket: bucketName,
    Key: 'test-acl.txt',
    Body: 'Hello World',
    ContentType: 'text/plain',
    ACL: 'public-read'
  });

  try {
    const response = await client.send(command);
    console.log("Successfully uploaded to S3 with ACL:", response);
  } catch (err) {
    console.error("Error uploading to S3 with ACL:", err);
  }
}

testPut();
