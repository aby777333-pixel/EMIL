import { PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import { createS3Client, getBucketConfig } from './aws-config'

function shouldServeInline(contentType: string): boolean {
  return (contentType.startsWith('image/') && contentType !== 'image/svg+xml')
    || contentType.startsWith('video/')
    || contentType.startsWith('audio/')
}

export async function generatePresignedUploadUrl(fileName: string, contentType: string, isPublic = false) {
  const { bucketName, folderPrefix } = getBucketConfig()
  const cloud_storage_path = isPublic
    ? `${folderPrefix}public/uploads/${Date.now()}-${fileName}`
    : `${folderPrefix}uploads/${Date.now()}-${fileName}`
  const client = createS3Client()
  const command = new PutObjectCommand({ Bucket: bucketName, Key: cloud_storage_path })
  const uploadUrl = await getSignedUrl(client, command, { expiresIn: 3600 })
  return { uploadUrl, cloud_storage_path }
}

export async function getFileUrl(cloud_storage_path: string, contentType = 'application/octet-stream', isPublic = false) {
  const { bucketName } = getBucketConfig()
  if (isPublic) {
    const region = process.env.AWS_REGION ?? 'us-east-1'
    return `https://${bucketName}.s3.${region}.amazonaws.com/${cloud_storage_path.split('/').map(encodeURIComponent).join('/')}`
  }
  const client = createS3Client()
  const command = new GetObjectCommand({
    Bucket: bucketName,
    Key: cloud_storage_path,
    ResponseContentDisposition: shouldServeInline(contentType) ? 'inline' : 'attachment',
  })
  return getSignedUrl(client, command, { expiresIn: 3600 })
}

export async function deleteFile(cloud_storage_path: string) {
  const { bucketName } = getBucketConfig()
  const client = createS3Client()
  await client.send(new DeleteObjectCommand({ Bucket: bucketName, Key: cloud_storage_path }))
}
