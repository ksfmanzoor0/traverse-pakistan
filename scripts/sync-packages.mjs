import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  ListObjectsV2Command,
} from "@aws-sdk/client-s3";
import fs from "fs";
import path from "path";

const SOURCE    = "/Users/kashifmanzoor/Downloads/packages";
const R2_PREFIX = "packages";
const CDN_BASE  = "https://media.traversepakistan.com";
const BUCKET    = "traverse-media";

const r2 = new S3Client({
  region: "auto",
  endpoint: "https://455676071213557fe34d7e16fec6f08e.r2.cloudflarestorage.com",
  credentials: {
    accessKeyId: "238fd8b9fed207929ccff9af089d1426",
    secretAccessKey: "b63abea0e5b302147c04f1016409aeac61918d2421a945b4146c3a6dd1cef724",
  },
});

function contentType(filename) {
  const ext = path.extname(filename).toLowerCase();
  if (ext === ".jpg" || ext === ".jpeg") return "image/jpeg";
  if (ext === ".png")  return "image/png";
  if (ext === ".webp") return "image/webp";
  if (ext === ".avif") return "image/avif";
  return "application/octet-stream";
}

// Returns Map<filename, sizeInBytes>
async function listR2Folder(prefix) {
  const files = new Map();
  let token;
  do {
    const res = await r2.send(new ListObjectsV2Command({
      Bucket: BUCKET,
      Prefix: prefix,
      ContinuationToken: token,
    }));
    for (const obj of res.Contents ?? []) {
      const filename = obj.Key.slice(prefix.length);
      if (filename) files.set(filename, obj.Size ?? 0);
    }
    token = res.IsTruncated ? res.NextContinuationToken : undefined;
  } while (token);
  return files;
}

async function main() {
  const slugs = fs.readdirSync(SOURCE)
    .filter(f => fs.statSync(path.join(SOURCE, f)).isDirectory())
    .sort();

  let uploaded = 0, deleted = 0, failed = 0;
  const supabaseRows = {};

  console.log(`Syncing ${slugs.length} package folders to R2...\n`);

  for (const slug of slugs) {
    const slugDir  = path.join(SOURCE, slug);
    const r2Prefix = `${R2_PREFIX}/${slug}/`;

    const localFiles = new Set(
      fs.readdirSync(slugDir).filter(f => /\.(jpg|jpeg|png|webp|avif)$/i.test(f))
    );
    const r2FileMap = await listR2Folder(r2Prefix); // Map<filename, size>

    // Large on R2 (>1MB) → delete + re-upload local version if it exists
    const r2Large   = new Set([...r2FileMap.entries()].filter(([, s]) => s > 1_000_000).map(([f]) => f));
    const toDelete  = [...r2FileMap.keys()].filter(f => !localFiles.has(f) || r2Large.has(f));
    const toUpload  = [...localFiles].filter(f => !r2FileMap.has(f) || r2Large.has(f));

    process.stdout.write(
      `  ${slug}  +${toUpload.length} upload  -${toDelete.length} delete  (${r2Large.size} large purged)... `
    );

    // Always force-overwrite cover.jpg too
    const uploadSet = new Set([...toUpload, ...[...localFiles].filter(f => /^cover\./i.test(f))]);

    for (const file of uploadSet) {
      try {
        const body = fs.readFileSync(path.join(slugDir, file));
        await r2.send(new PutObjectCommand({
          Bucket: BUCKET,
          Key: `${r2Prefix}${file}`,
          Body: body,
          ContentType: contentType(file),
          CacheControl: "public, max-age=31536000, immutable",
        }));
        uploaded++;
      } catch (err) {
        console.error(`\n    UPLOAD FAILED ${file}: ${err.message}`);
        failed++;
      }
    }

    // Delete R2 files that no longer exist locally
    for (const file of toDelete) {
      try {
        await r2.send(new DeleteObjectCommand({ Bucket: BUCKET, Key: `${r2Prefix}${file}` }));
        deleted++;
      } catch (err) {
        console.error(`\n    DELETE FAILED ${file}: ${err.message}`);
        failed++;
      }
    }

    // Build final image URL list from local files (cover first, rest sorted)
    const coverFile = [...localFiles].find(f => /^cover\./i.test(f));
    const otherFiles = [...localFiles].filter(f => !/^cover\./i.test(f)).sort();
    const orderedFiles = coverFile ? [coverFile, ...otherFiles] : otherFiles;
    supabaseRows[slug] = orderedFiles.map(f => `${CDN_BASE}/${r2Prefix}${f}`);

    console.log("done");
  }

  console.log(`\nR2 sync complete — uploaded: ${uploaded}  deleted: ${deleted}  failed: ${failed}`);

  // Write Supabase SQL
  const sqlPath = "/tmp/sync-packages.sql";
  const lines = Object.entries(supabaseRows).map(([slug, urls]) => {
    const json = JSON.stringify(urls).replace(/'/g, "''");
    return `UPDATE packages SET images = '${json}'::jsonb WHERE slug = '${slug}';`;
  });
  fs.writeFileSync(sqlPath, lines.join("\n") + "\n");
  console.log(`Supabase SQL written → ${sqlPath}`);
}

main().catch(console.error);
