// One-off recursive upload for tour images. Walks a local slug directory
// (including subfolders like gallery/) and mirrors it under tours/<slug>/
// on R2. Skips already-present keys unless --force is passed.
//
// Usage:
//   node scripts/upload-tours-recursive.mjs <slug> [--force]
// Example:
//   node scripts/upload-tours-recursive.mjs skardu-khaplu-deosai-5day-flight

import { S3Client, PutObjectCommand, HeadObjectCommand } from "@aws-sdk/client-s3";
import fs from "fs";
import path from "path";
import { config } from "dotenv";

config({ path: ".env.local" });

const {
  R2_BUCKET_NAME,
  R2_ACCESS_KEY_ID,
  R2_SECRET_ACCESS_KEY,
  R2_ENDPOINT,
} = process.env;

if (!R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY || !R2_ENDPOINT) {
  console.error("Missing R2 credentials in .env.local");
  process.exit(1);
}

const slug = process.argv[2];
if (!slug) {
  console.error("Usage: node scripts/upload-tours-recursive.mjs <slug> [--force]");
  process.exit(1);
}
const force = process.argv.includes("--force");
const LOCAL_ROOT = `${process.env.HOME}/Downloads/r2/tours/${slug}`;
const R2_PREFIX = `tours/${slug}`;
const BUCKET = R2_BUCKET_NAME ?? "traverse-media";

if (!fs.existsSync(LOCAL_ROOT)) {
  console.error(`Not found: ${LOCAL_ROOT}`);
  process.exit(1);
}

const r2 = new S3Client({
  region: "auto",
  endpoint: R2_ENDPOINT,
  credentials: { accessKeyId: R2_ACCESS_KEY_ID, secretAccessKey: R2_SECRET_ACCESS_KEY },
});

const IMAGE = /\.(jpe?g|png|webp|avif)$/i;

function contentType(f) {
  const ext = path.extname(f).toLowerCase();
  if (ext === ".jpg" || ext === ".jpeg") return "image/jpeg";
  if (ext === ".png") return "image/png";
  if (ext === ".webp") return "image/webp";
  if (ext === ".avif") return "image/avif";
  return "application/octet-stream";
}

function walk(dir) {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name.startsWith(".")) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(full));
    else if (IMAGE.test(entry.name)) out.push(full);
  }
  return out;
}

async function keyExists(key) {
  try {
    await r2.send(new HeadObjectCommand({ Bucket: BUCKET, Key: key }));
    return true;
  } catch { return false; }
}

async function main() {
  const files = walk(LOCAL_ROOT);
  console.log(`Uploading ${files.length} files for ${slug}${force ? " (FORCE)" : ""}\n`);
  let uploaded = 0, skipped = 0, failed = 0;
  for (const abs of files) {
    const rel = path.relative(LOCAL_ROOT, abs).split(path.sep).join("/");
    const key = `${R2_PREFIX}/${rel}`;
    if (!force && (await keyExists(key))) { skipped++; console.log(`  skip  ${key}`); continue; }
    try {
      await r2.send(new PutObjectCommand({
        Bucket: BUCKET,
        Key: key,
        Body: fs.readFileSync(abs),
        ContentType: contentType(abs),
        CacheControl: "public, max-age=31536000, immutable",
      }));
      uploaded++;
      console.log(`  ✓     ${key}`);
    } catch (err) {
      failed++;
      console.error(`  FAIL  ${key}: ${err.message}`);
    }
  }
  console.log(`\nDone. Uploaded ${uploaded}, skipped ${skipped}, failed ${failed}.`);
}

main().catch((e) => { console.error(e); process.exit(1); });
