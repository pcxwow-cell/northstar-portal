// ─── S3 / R2 STORAGE ─────────────────────────────────────
// Compatible with AWS S3, Cloudflare R2, Supabase Storage, MinIO.
// Set env vars: S3_BUCKET, S3_REGION, S3_ENDPOINT (for R2/MinIO),
//               AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY
//
// Install: npm install @aws-sdk/client-s3 @aws-sdk/s3-request-presigner

// Uncomment and install @aws-sdk packages to enable:
//
// const { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } = require("@aws-sdk/client-s3");
// const { getSignedUrl: s3SignedUrl } = require("@aws-sdk/s3-request-presigner");
//
// const client = new S3Client({
//   region: process.env.S3_REGION || "us-east-1",
//   endpoint: process.env.S3_ENDPOINT || undefined, // For R2: https://<account>.r2.cloudflarestorage.com
//   credentials: {
//     accessKeyId: process.env.AWS_ACCESS_KEY_ID,
//     secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
//   },
// });
//
// const BUCKET = process.env.S3_BUCKET || "northstar-documents";
//
// async function upload(key, buffer, mimetype) {
//   await client.send(new PutObjectCommand({
//     Bucket: BUCKET,
//     Key: key,
//     Body: buffer,
//     ContentType: mimetype,
//   }));
//   return key;
// }
//
// async function getSignedUrl(key) {
//   const command = new GetObjectCommand({ Bucket: BUCKET, Key: key });
//   return s3SignedUrl(client, command, { expiresIn: 3600 }); // 1 hour
// }
//
// async function getStream(key) {
//   const { Body } = await client.send(new GetObjectCommand({ Bucket: BUCKET, Key: key }));
//   return Body;
// }
//
// async function remove(key) {
//   await client.send(new DeleteObjectCommand({ Bucket: BUCKET, Key: key }));
// }
//
// module.exports = { upload, getSignedUrl, getStream, remove };

// Placeholder until S3 SDK is installed
throw new Error(
  "S3 storage is not configured. Install @aws-sdk/client-s3 and @aws-sdk/s3-request-presigner, " +
  "then uncomment the code in server/storage/s3.js and set S3_BUCKET, S3_REGION, AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY env vars."
);
