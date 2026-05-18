const MEDIA_BASE = "https://media.traversepakistan.com";
const BUCKET = process.env.R2_BUCKET_NAME ?? "traverse-media";
const IMAGE_EXT = /\.(jpg|jpeg|png|webp|avif)$/i;
const COVER_RE = /\/cover\.(jpg|jpeg|png|webp|avif)$/i;

async function sha256hex(data: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(data));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function hmac(key: ArrayBuffer, data: string): Promise<ArrayBuffer> {
  const k = await crypto.subtle.importKey("raw", key, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return crypto.subtle.sign("HMAC", k, new TextEncoder().encode(data));
}

function hex(buf: ArrayBuffer): string {
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function awsSigV4Headers(
  method: string,
  url: URL,
  accessKey: string,
  secretKey: string,
): Promise<Record<string, string>> {
  const now = new Date();
  const datestamp = now.toISOString().slice(0, 10).replace(/-/g, "");
  const amzdate = datestamp + "T" + now.toISOString().slice(11, 19).replace(/:/g, "") + "Z";
  const region = "auto";
  const service = "s3";
  const payloadHash = await sha256hex("");

  const canonicalHeaders = `host:${url.hostname}\nx-amz-content-sha256:${payloadHash}\nx-amz-date:${amzdate}\n`;
  const signedHeaders = "host;x-amz-content-sha256;x-amz-date";
  const canonicalRequest = [method, url.pathname, url.searchParams.toString(), canonicalHeaders, signedHeaders, payloadHash].join("\n");

  const credentialScope = `${datestamp}/${region}/${service}/aws4_request`;
  const stringToSign = `AWS4-HMAC-SHA256\n${amzdate}\n${credentialScope}\n${await sha256hex(canonicalRequest)}`;

  const kDate = await hmac(new TextEncoder().encode("AWS4" + secretKey).buffer as ArrayBuffer, datestamp);
  const kRegion = await hmac(kDate, region);
  const kService = await hmac(kRegion, service);
  const kSigning = await hmac(kService, "aws4_request");
  const signature = hex(await hmac(kSigning, stringToSign));

  return {
    Authorization: `AWS4-HMAC-SHA256 Credential=${accessKey}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`,
    "x-amz-date": amzdate,
    "x-amz-content-sha256": payloadHash,
  };
}

export function buildImagesFromR2(urls: string[], alt: string): { url: string; alt: string }[] {
  const cover = urls.find((u) => COVER_RE.test(u));
  const gallery = urls.filter((u) => !COVER_RE.test(u));
  return [
    ...(cover ? [{ url: cover, alt }] : []),
    ...gallery.map((url) => ({ url, alt })),
  ];
}

export async function listR2Images(prefix: string): Promise<string[]> {
  try {
    const endpoint = process.env.R2_ENDPOINT;
    const accessKey = process.env.R2_ACCESS_KEY_ID;
    const secretKey = process.env.R2_SECRET_ACCESS_KEY;
    if (!endpoint || !accessKey || !secretKey) return [];

    const url = new URL(`${endpoint}/${BUCKET}`);
    url.searchParams.set("list-type", "2");
    url.searchParams.set("prefix", prefix);

    const headers = await awsSigV4Headers("GET", url, accessKey, secretKey);
    const res = await fetch(url.toString(), { headers });
    if (!res.ok) return [];

    const text = await res.text();
    const keys = [...text.matchAll(/<Key>([^<]+)<\/Key>/g)].map((m) => m[1]);
    return keys.map((key) => `${MEDIA_BASE}/${encodeURI(key)}`).filter((u) => IMAGE_EXT.test(u));
  } catch (err) {
    console.error("[r2] listR2Images failed:", err);
    return [];
  }
}
