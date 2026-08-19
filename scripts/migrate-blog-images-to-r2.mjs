/**
 * Read the match TSV (WP filename → local path), upload each matched file
 * to R2 under blog/{slug}/{uuid}.{ext}, and rewrite the corresponding URLs
 * in blog_posts (cover + sections.images[].src). Unmatched files are left
 * with their broken wp.traversepakistan.com URLs and will show as broken
 * image icons until sourced.
 *
 * Also unpublishes the 3 fully-broken posts.
 */

import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { createClient } from "@supabase/supabase-js";
import { readFile } from "fs/promises";
import { basename, extname } from "path";
import { config } from "dotenv";
import { randomUUID } from "crypto";

config({ path: ".env.local" });

const {
  NEXT_PUBLIC_SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY,
  R2_BUCKET_NAME,
  R2_ACCESS_KEY_ID,
  R2_SECRET_ACCESS_KEY,
  R2_ENDPOINT,
} = process.env;

for (const [k, v] of Object.entries({
  NEXT_PUBLIC_SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY,
  R2_BUCKET_NAME,
  R2_ACCESS_KEY_ID,
  R2_SECRET_ACCESS_KEY,
  R2_ENDPOINT,
})) {
  if (!v) {
    console.error(`Missing ${k} in .env.local`);
    process.exit(1);
  }
}

const MATCH_TSV =
  "/private/tmp/claude-501/-Users-kashifmanzoor-Downloads-New-Website-traverse-pakistan/05ac1306-4b19-42d9-93f2-5bad8eaaf773/scratchpad/final-match.tsv";

const CDN_BASE = "https://media.traversepakistan.com";

const MIME_MAP = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".avif": "image/avif",
};

const UNPUBLISH_SLUGS = new Set([
  "how-traverse-pakistan-is-different-than-a-trivial-tour-company",
  "leos-workshop-explores-walled-city-of-lahore-2",
  "trek-to-haramosh-massif-kutwal-lake",
]);

const s3 = new S3Client({
  region: "auto",
  endpoint: R2_ENDPOINT,
  credentials: {
    accessKeyId: R2_ACCESS_KEY_ID,
    secretAccessKey: R2_SECRET_ACCESS_KEY,
  },
});

const supabase = createClient(NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

function isWpUrl(u) {
  if (!u) return false;
  return (
    u.includes("wp.traversepakistan.com") ||
    /https:\/\/[^/]*traversepakistan\.com\/wp-content\//.test(u)
  );
}

async function loadMatchMap() {
  const raw = await readFile(MATCH_TSV, "utf-8");
  const map = new Map();
  for (const line of raw.split("\n")) {
    if (!line.trim()) continue;
    const [name, path] = line.split("\t");
    if (path) map.set(name, path);
  }
  return map;
}

async function uploadToR2(localPath, slug) {
  const ext = extname(localPath).toLowerCase();
  const mime = MIME_MAP[ext] ?? "image/jpeg";
  const key = `blog/${slug}/${randomUUID()}${ext}`;
  const body = await readFile(localPath);
  await s3.send(
    new PutObjectCommand({
      Bucket: R2_BUCKET_NAME,
      Key: key,
      Body: body,
      ContentType: mime,
      CacheControl: "public, max-age=31536000, immutable",
    }),
  );
  return `${CDN_BASE}/${key}`;
}

async function main() {
  const matches = await loadMatchMap();
  console.log(`Loaded ${matches.size} matched local paths`);

  const { data: rows, error } = await supabase
    .from("blog_posts")
    .select("id, slug, image, sections");
  if (error) throw error;

  let uploaded = 0;
  let leftBroken = 0;

  for (const row of rows) {
    // Cache within one post — same filename might be reused
    const uploadedByName = new Map();

    async function resolve(url) {
      if (!isWpUrl(url)) return { url, changed: false };
      const filename = basename(new URL(url).pathname);
      if (uploadedByName.has(filename)) {
        return { url: uploadedByName.get(filename), changed: true };
      }
      const localPath = matches.get(filename);
      if (!localPath) {
        leftBroken++;
        return { url, changed: false };
      }
      const r2 = await uploadToR2(localPath, row.slug);
      uploadedByName.set(filename, r2);
      uploaded++;
      console.log(`  ↑ ${row.slug} ← ${filename}`);
      return { url: r2, changed: true };
    }

    // Cover
    const cover = await resolve(row.image);
    // Sections
    const sections = Array.isArray(row.sections) ? row.sections : [];
    let sectionsChanged = false;
    for (const section of sections) {
      const imgs = Array.isArray(section.images) ? section.images : [];
      for (const img of imgs) {
        const r = await resolve(img.src);
        if (r.changed) {
          img.src = r.url;
          sectionsChanged = true;
        }
      }
    }

    const patch = {};
    if (cover.changed) patch.image = cover.url;
    if (sectionsChanged) patch.sections = sections;
    if (UNPUBLISH_SLUGS.has(row.slug)) patch.published = false;

    if (Object.keys(patch).length > 0) {
      const { error: upErr } = await supabase
        .from("blog_posts")
        .update(patch)
        .eq("id", row.id);
      if (upErr) {
        console.error(`  ✗ ${row.slug} update failed:`, upErr.message);
      } else {
        const bits = [];
        if (cover.changed) bits.push("cover");
        if (sectionsChanged) bits.push("sections");
        if (UNPUBLISH_SLUGS.has(row.slug)) bits.push("unpublished");
        console.log(`  ✔ ${row.slug} updated: ${bits.join(", ")}`);
      }
    }
  }

  console.log(`\nDone. Uploaded ${uploaded} images to R2. ${leftBroken} URLs still broken (no local match).`);
  console.log(`Unpublished: ${[...UNPUBLISH_SLUGS].join(", ")}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
