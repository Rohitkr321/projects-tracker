const { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const { v4: uuidv4 } = require('uuid');
const path = require('path');
const fs = require('fs');

const REGION     = process.env.AWS_REGION      || 'ap-south-1';
const BUCKET     = process.env.AWS_BUCKET_NAME || 'ga-backend-repo';

const s3 = new S3Client({
  region: REGION,
  credentials: {
    accessKeyId:     process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

// Returns a presigned PUT URL for the frontend to upload directly to S3.
// Key format: IssuesTracker/images/{issueId}/{uuid}.jpg
//             IssuesTracker/files/{issueId}/{uuid}.ext
exports.getPresignedPutUrl = async (type, issueId, originalFilename, contentType) => {
  const ext = path.extname(originalFilename) || (type === 'images' ? '.jpg' : '');
  const folder = `IssuesTracker/${type}/${issueId}`;
  const key    = `${folder}/${uuidv4()}${ext}`;

  const command = new PutObjectCommand({
    Bucket:      BUCKET,
    Key:         key,
    ContentType: contentType || 'application/octet-stream',
  });

  const presignedUrl = await getSignedUrl(s3, command, { expiresIn: 300 }); // 5-min upload window
  return { presignedUrl, key };
};

// Returns a presigned GET URL so the frontend can securely display a private S3 object.
exports.getPresignedGetUrl = async (key, expiresIn = 3600) => {
  const command = new GetObjectCommand({ Bucket: BUCKET, Key: key });
  return getSignedUrl(s3, command, { expiresIn });
};

// Upload a locally-saved file to S3 (used after multer writes to disk).
// Returns the S3 key. Deletes the local file after a successful upload.
exports.uploadFileToS3 = async (localPath, issueId, originalFilename, mimeType) => {
  const ext    = path.extname(originalFilename) || '';
  const folder = mimeType && mimeType.startsWith('image/') ? 'images' : 'files';
  const key    = `IssuesTracker/${folder}/${issueId}/${uuidv4()}${ext}`;

  const stats = fs.statSync(localPath);
  const body  = fs.createReadStream(localPath);

  await s3.send(new PutObjectCommand({
    Bucket:        BUCKET,
    Key:           key,
    Body:          body,
    ContentType:   mimeType || 'application/octet-stream',
    ContentLength: stats.size,
  }));

  try { fs.unlinkSync(localPath); } catch (_) {}
  return key;
};

exports.deleteObject = async (key) => {
  if (!key) return;
  try {
    await s3.send(new DeleteObjectCommand({ Bucket: BUCKET, Key: key }));
  } catch (err) {
    console.warn('[S3] delete failed:', err.message);
  }
};
