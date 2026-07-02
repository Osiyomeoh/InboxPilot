/**
 * Alibaba Cloud OSS (Object Storage Service) integration.
 * Used to store generated PDF quotes so they persist across deployments
 * and are accessible for download links sent to customers.
 *
 * Required env vars (set in Alibaba Cloud RAM console):
 *   ALIBABA_CLOUD_ACCESS_KEY_ID
 *   ALIBABA_CLOUD_ACCESS_KEY_SECRET
 *   OSS_BUCKET       — e.g. "inboxpilot-quotes"
 *   OSS_REGION       — e.g. "oss-ap-southeast-1"
 */
import { readFile } from 'fs/promises';
import path from 'path';

export interface OssUploadResult {
  url: string;
  key: string;
  bucket: string;
}

function isOssConfigured(): boolean {
  return !!(
    process.env.ALIBABA_CLOUD_ACCESS_KEY_ID &&
    process.env.ALIBABA_CLOUD_ACCESS_KEY_SECRET &&
    process.env.OSS_BUCKET &&
    process.env.OSS_REGION
  );
}

/**
 * Upload a PDF file to Alibaba Cloud OSS.
 * Returns the public URL and object key, or null if OSS is not configured
 * (falls back to local filesystem storage gracefully).
 */
export async function uploadQuotePdf(
  localPath: string,
  inquiryId: string,
  quoteId: string,
): Promise<OssUploadResult | null> {
  if (!isOssConfigured()) {
    console.log('[oss] OSS not configured — PDF stored locally only');
    return null;
  }

  try {
    // Dynamically import ali-oss to avoid crashing if the package is missing
    const OSS = (await import('ali-oss')).default;

    const client = new OSS({
      region: process.env.OSS_REGION!,
      accessKeyId: process.env.ALIBABA_CLOUD_ACCESS_KEY_ID!,
      accessKeySecret: process.env.ALIBABA_CLOUD_ACCESS_KEY_SECRET!,
      bucket: process.env.OSS_BUCKET!,
    });

    const filename = path.basename(localPath);
    const key = `quotes/${inquiryId}/${filename}`;
    const fileBuffer = await readFile(localPath);

    const result = await client.put(key, fileBuffer, {
      mime: 'application/pdf',
      headers: {
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'public, max-age=86400',
      },
    });

    const url = `https://${process.env.OSS_BUCKET}.${process.env.OSS_REGION}.aliyuncs.com/${key}`;
    console.log(`[oss] Uploaded PDF → ${url}`);

    return { url, key, bucket: process.env.OSS_BUCKET! };
  } catch (err) {
    console.error('[oss] Upload failed (non-fatal, PDF available locally):', err);
    return null;
  }
}

/**
 * Generate a pre-signed download URL for a quote PDF stored in OSS.
 * Valid for 24 hours — suitable for emailing to customers.
 */
export async function getQuotePdfUrl(key: string): Promise<string | null> {
  if (!isOssConfigured()) return null;

  try {
    const OSS = (await import('ali-oss')).default;
    const client = new OSS({
      region: process.env.OSS_REGION!,
      accessKeyId: process.env.ALIBABA_CLOUD_ACCESS_KEY_ID!,
      accessKeySecret: process.env.ALIBABA_CLOUD_ACCESS_KEY_SECRET!,
      bucket: process.env.OSS_BUCKET!,
    });

    // Signed URL valid for 24 hours
    return client.signatureUrl(key, { expires: 86400 });
  } catch {
    return null;
  }
}
