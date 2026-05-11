import { S3Client, ListObjectsV2Command } from "@aws-sdk/client-s3";

const r2 = new S3Client({
  region: "auto",
  endpoint: process.env.R2_ENDPOINT!,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  },
});

const MEDIA_BASE = "https://media.traversepakistan.com";
const BUCKET = process.env.R2_BUCKET_NAME ?? "traverse-media";
const IMAGE_EXT = /\.(jpg|jpeg|png|webp|avif)$/i;
const COVER_RE = /\/cover\.(jpg|jpeg|png|webp|avif)$/i;

/**
 * Given a list of R2 URLs, returns [{url, alt}] with cover first, gallery after.
 * Works for flat folders (packages) and subfoldered galleries (tours).
 */
export function buildImagesFromR2(urls: string[], alt: string): { url: string; alt: string }[] {
  const cover = urls.find((u) => COVER_RE.test(u));
  const gallery = urls.filter((u) => !COVER_RE.test(u));
  return [
    ...(cover ? [{ url: cover, alt }] : []),
    ...gallery.map((url) => ({ url, alt })),
  ];
}

/** Lists all image objects under a given R2 prefix and returns their public URLs. */
export async function listR2Images(prefix: string): Promise<string[]> {
  try {
    const res = await r2.send(
      new ListObjectsV2Command({ Bucket: BUCKET, Prefix: prefix })
    );
    return (res.Contents ?? [])
      .map((obj) => `${MEDIA_BASE}/${encodeURI(obj.Key ?? "")}`)
      .filter((url) => IMAGE_EXT.test(url));
  } catch {
    return [];
  }
}

