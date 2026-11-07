import { S3Client, PutObjectCommand, HeadObjectCommand } from "@aws-sdk/client-s3";
import fs from "fs";
import path from "path";

import { config } from "dotenv";

config({ path: ".env.local" });

const { R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_ENDPOINT } = process.env;

if (!R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY || !R2_ENDPOINT) {
  console.error("Missing R2 credentials (R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_ENDPOINT) in .env.local");
  process.exit(1);
}

const SOURCE = "/Users/kashifmanzoor/Downloads/packages";
const R2_PREFIX = "packages";

const r2 = new S3Client({
  region: "auto",
  endpoint: R2_ENDPOINT,
  credentials: {
    accessKeyId: R2_ACCESS_KEY_ID,
    secretAccessKey: R2_SECRET_ACCESS_KEY,
  },
});

const BUCKET = "traverse-media";

function contentType(filename) {
  const ext = path.extname(filename).toLowerCase();
  if (ext === ".jpg" || ext === ".jpeg") return "image/jpeg";
  if (ext === ".png") return "image/png";
  if (ext === ".webp") return "image/webp";
  if (ext === ".avif") return "image/avif";
  return "application/octet-stream";
}

async function exists(key) {
  try {
    await r2.send(new HeadObjectCommand({ Bucket: BUCKET, Key: key }));
    return true;
  } catch {
    return false;
  }
}

async function main() {
  const force = process.argv.includes("--force");
  const slugFolders = fs.readdirSync(SOURCE).filter(f =>
    fs.statSync(path.join(SOURCE, f)).isDirectory()
  );

  let uploaded = 0, skipped = 0, failed = 0;
  const total = slugFolders.reduce((acc, slug) =>
    acc + fs.readdirSync(path.join(SOURCE, slug)).filter(f =>
      /\.(jpg|jpeg|png|webp|avif)$/i.test(f)
    ).length, 0
  );

  console.log(`Uploading ${total} images across ${slugFolders.length} packages... ${force ? "(FORCE overwrite)" : ""}\n`);

  for (const slug of slugFolders) {
    const slugDir = path.join(SOURCE, slug);
    const files = fs.readdirSync(slugDir).filter(f => /\.(jpg|jpeg|png|webp|avif)$/i.test(f));
    process.stdout.write(`  ${slug} (${files.length} files)... `);

    let slugUploaded = 0;
    for (const file of files) {
      const key = `${R2_PREFIX}/${slug}/${file}`;
      const fileSize = fs.statSync(path.join(slugDir, file)).size;
      if (fileSize >= 1_000_000) { skipped++; continue; }
      if (!force && await exists(key)) { skipped++; continue; }
      try {
        const body = fs.readFileSync(path.join(slugDir, file));
        await r2.send(new PutObjectCommand({
          Bucket: BUCKET,
          Key: key,
          Body: body,
          ContentType: contentType(file),
          CacheControl: "public, max-age=31536000, immutable",
        }));
        uploaded++;
        slugUploaded++;
      } catch (err) {
        console.error(`\n    FAILED ${file}: ${err.message}`);
        failed++;
      }
    }
    console.log(`done (${slugUploaded} new)`);
  }

  console.log(`\nDone. Uploaded: ${uploaded} | Skipped (already exists): ${skipped} | Failed: ${failed}`);
}

main().catch(console.error);
