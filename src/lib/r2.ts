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

async function sha256hexBytes(bytes: Uint8Array): Promise<string> {
  const view = new Uint8Array(bytes.byteLength);
  view.set(bytes);
  const buf = await crypto.subtle.digest("SHA-256", view.buffer);
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function awsSigV4Headers(
  method: string,
  url: URL,
  accessKey: string,
  secretKey: string,
  body?: Uint8Array,
  contentType?: string,
): Promise<Record<string, string>> {
  const now = new Date();
  const datestamp = now.toISOString().slice(0, 10).replace(/-/g, "");
  const amzdate = datestamp + "T" + now.toISOString().slice(11, 19).replace(/:/g, "") + "Z";
  const region = "auto";
  const service = "s3";
  const payloadHash = body ? await sha256hexBytes(body) : await sha256hex("");

  const contentTypeHeader = contentType ? `content-type:${contentType}\n` : "";
  const canonicalHeaders =
    contentTypeHeader +
    `host:${url.hostname}\nx-amz-content-sha256:${payloadHash}\nx-amz-date:${amzdate}\n`;
  const signedHeaders = contentType
    ? "content-type;host;x-amz-content-sha256;x-amz-date"
    : "host;x-amz-content-sha256;x-amz-date";
  const canonicalRequest = [method, url.pathname, url.searchParams.toString(), canonicalHeaders, signedHeaders, payloadHash].join("\n");

  const credentialScope = `${datestamp}/${region}/${service}/aws4_request`;
  const stringToSign = `AWS4-HMAC-SHA256\n${amzdate}\n${credentialScope}\n${await sha256hex(canonicalRequest)}`;

  const kDate = await hmac(new TextEncoder().encode("AWS4" + secretKey).buffer as ArrayBuffer, datestamp);
  const kRegion = await hmac(kDate, region);
  const kService = await hmac(kRegion, service);
  const kSigning = await hmac(kService, "aws4_request");
  const signature = hex(await hmac(kSigning, stringToSign));

  const headers: Record<string, string> = {
    Authorization: `AWS4-HMAC-SHA256 Credential=${accessKey}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`,
    "x-amz-date": amzdate,
    "x-amz-content-sha256": payloadHash,
  };
  if (contentType) headers["content-type"] = contentType;
  return headers;
}

export async function putR2Marker(key: string): Promise<{ ok: boolean; error?: string }> {
  const endpoint = process.env.R2_ENDPOINT;
  const accessKey = process.env.R2_ACCESS_KEY_ID;
  const secretKey = process.env.R2_SECRET_ACCESS_KEY;
  if (!endpoint || !accessKey || !secretKey) {
    return { ok: false, error: "R2 credentials not configured" };
  }
  const url = new URL(`${endpoint}/${BUCKET}/${encodeURI(key)}`);
  const headers = await awsSigV4Headers("PUT", url, accessKey, secretKey);
  const res = await fetch(url.toString(), { method: "PUT", headers, body: "" });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    return { ok: false, error: `R2 PUT ${res.status}: ${text.slice(0, 200)}` };
  }
  return { ok: true };
}

export async function putR2Object(
  key: string,
  body: Uint8Array,
  contentType: string,
): Promise<{ ok: boolean; url?: string; error?: string }> {
  const endpoint = process.env.R2_ENDPOINT;
  const accessKey = process.env.R2_ACCESS_KEY_ID;
  const secretKey = process.env.R2_SECRET_ACCESS_KEY;
  if (!endpoint || !accessKey || !secretKey) {
    return { ok: false, error: "R2 credentials not configured" };
  }
  const url = new URL(`${endpoint}/${BUCKET}/${encodeURI(key)}`);
  const headers = await awsSigV4Headers("PUT", url, accessKey, secretKey, body, contentType);
  const res = await fetch(url.toString(), { method: "PUT", headers, body: body as BodyInit });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    return { ok: false, error: `R2 PUT ${res.status}: ${text.slice(0, 200)}` };
  }
  return { ok: true, url: `${MEDIA_BASE}/${encodeURI(key)}` };
}

export async function deleteR2Object(key: string): Promise<{ ok: boolean; error?: string }> {
  const endpoint = process.env.R2_ENDPOINT;
  const accessKey = process.env.R2_ACCESS_KEY_ID;
  const secretKey = process.env.R2_SECRET_ACCESS_KEY;
  if (!endpoint || !accessKey || !secretKey) {
    return { ok: false, error: "R2 credentials not configured" };
  }
  const url = new URL(`${endpoint}/${BUCKET}/${encodeURI(key)}`);
  const headers = await awsSigV4Headers("DELETE", url, accessKey, secretKey);
  const res = await fetch(url.toString(), { method: "DELETE", headers });
  if (!res.ok && res.status !== 404) {
    const text = await res.text().catch(() => "");
    return { ok: false, error: `R2 DELETE ${res.status}: ${text.slice(0, 200)}` };
  }
  return { ok: true };
}

// Reverse-map a media URL back to its R2 key. Only handles keys served from
// this bucket's public host; external URLs return null (deletion skipped).
export function r2KeyFromUrl(url: string): string | null {
  const prefix = `${MEDIA_BASE}/`;
  if (!url.startsWith(prefix)) return null;
  return decodeURI(url.slice(prefix.length));
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
