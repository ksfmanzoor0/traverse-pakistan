/**
 * Rewrite every remaining wp.traversepakistan.com image URL in the two
 * fully-broken posts to reuse an existing R2 image from another blog post.
 * Then re-publish them.
 *
 * Placeholder-quality — user will replace with real photos later via admin.
 */

import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";

config({ path: ".env.local" });

const { NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } = process.env;
if (!NEXT_PUBLIC_SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error("Missing Supabase env vars");
  process.exit(1);
}

const supabase = createClient(NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

const TARGET_SLUGS = [
  "trek-to-haramosh-massif-kutwal-lake",
  "how-traverse-pakistan-is-different-than-a-trivial-tour-company",
];

const POOL_SOURCE_SLUGS = [
  "all-about-the-killer-mountain-nanga-parbat",
  "peaks-visible-from-hunza-valley",
  "hunza-blossom",
];

function isWpUrl(u) {
  if (!u) return false;
  return (
    u.includes("wp.traversepakistan.com") ||
    /https:\/\/[^/]*traversepakistan\.com\/wp-content\//.test(u)
  );
}

async function buildPool() {
  const { data, error } = await supabase
    .from("blog_posts")
    .select("slug, image, sections")
    .in("slug", POOL_SOURCE_SLUGS);
  if (error) throw error;
  const pool = [];
  for (const row of data) {
    if (row.image?.includes("media.traversepakistan.com")) pool.push(row.image);
    for (const sec of row.sections ?? []) {
      for (const img of sec.images ?? []) {
        if (img.src?.includes("media.traversepakistan.com")) pool.push(img.src);
      }
    }
  }
  return pool;
}

async function fix(slug, pool) {
  const { data: row, error } = await supabase
    .from("blog_posts")
    .select("id, image, sections")
    .eq("slug", slug)
    .single();
  if (error) throw error;

  let idx = 0;
  const next = () => pool[(idx++) % pool.length];

  const patch = { published: true };
  if (isWpUrl(row.image)) patch.image = next();

  const sections = Array.isArray(row.sections) ? row.sections : [];
  for (const sec of sections) {
    const imgs = Array.isArray(sec.images) ? sec.images : [];
    for (const img of imgs) {
      if (isWpUrl(img.src)) img.src = next();
    }
  }
  patch.sections = sections;

  const { error: upErr } = await supabase
    .from("blog_posts")
    .update(patch)
    .eq("id", row.id);
  if (upErr) throw upErr;

  console.log(`  ✔ ${slug} — swapped ${idx} URLs, published=true`);
}

const pool = await buildPool();
console.log(`Placeholder pool: ${pool.length} R2 URLs\n`);
for (const slug of TARGET_SLUGS) await fix(slug, pool);
console.log("\nDone.");
