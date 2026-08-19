/**
 * One-shot: upload the ~/Downloads/hunzablog images to R2 and insert the
 * "Hunza Blossom" blog post row.
 *
 * Usage: node scripts/create-hunza-blossom-post.mjs
 */

import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { createClient } from "@supabase/supabase-js";
import { readdir, readFile } from "fs/promises";
import { join, extname } from "path";
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

const SOURCE_DIR = `${process.env.HOME}/Downloads/hunzablog`;
const SLUG = "hunza-blossom";
const ID = `blog-${SLUG}`;
const CDN_BASE = "https://media.traversepakistan.com";

const MIME_MAP = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".avif": "image/avif",
};

const s3 = new S3Client({
  region: "auto",
  endpoint: R2_ENDPOINT,
  credentials: {
    accessKeyId: R2_ACCESS_KEY_ID,
    secretAccessKey: R2_SECRET_ACCESS_KEY,
  },
});

const supabase = createClient(NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function uploadAll() {
  const entries = await readdir(SOURCE_DIR);
  const all = entries.filter((f) => MIME_MAP[extname(f).toLowerCase()]);
  // Pick 7 at random (deterministic-ish: shuffle then slice)
  const shuffled = all
    .map((f) => [Math.random(), f])
    .sort(([a], [b]) => a - b)
    .map(([, f]) => f);
  const files = shuffled.slice(0, 7);

  console.log(`Uploading ${files.length} images to R2 → blog/${SLUG}/`);
  const urls = [];
  for (const file of files) {
    const ext = extname(file).toLowerCase();
    const key = `blog/${SLUG}/${randomUUID()}${ext}`;
    const body = await readFile(join(SOURCE_DIR, file));
    await s3.send(
      new PutObjectCommand({
        Bucket: R2_BUCKET_NAME,
        Key: key,
        Body: body,
        ContentType: MIME_MAP[ext],
        CacheControl: "public, max-age=31536000, immutable",
      }),
    );
    const url = `${CDN_BASE}/${key}`;
    console.log(`  ↑ ${file} → ${url}`);
    urls.push(url);
  }
  return urls;
}

function buildSections(urls) {
  // urls[0] is used as the cover; the remaining split across sections.
  const gallery = urls.slice(1);
  const chunk = (arr, size) =>
    arr.length ? [arr.slice(0, size), ...chunk(arr.slice(size), size)] : [];
  const [g1 = [], g2 = [], g3 = [], g4 = []] = chunk(gallery, 2);

  return [
    {
      id: "s-intro",
      heading: "Why Hunza in blossom season is unmissable",
      headingLevel: "h2",
      text: `<p>For a few weeks each spring, the Hunza Valley turns into a soft pink and white ocean. Apricot, cherry, apple, and almond trees bloom against the raw stone of the Karakoram — a contrast that no photograph can quite prepare you for. Locals have watched this same show for centuries; the orchards below Baltit and Altit forts were planted generations ago, and the timing of the bloom still marks the true beginning of the mountain year.</p><p>If you are only going to visit Hunza once, do it in blossom season. The valley is uncrowded, the weather is kind, and every ridgeline seems to lead to another viewpoint over the flowering terraces.</p>`,
      images: g1.map((src, i) => ({ src, alt: `Hunza blossom ${i + 1}`, caption: "" })),
    },
    {
      id: "s-when",
      heading: "When to go: the blossom window",
      headingLevel: "h2",
      text: `<p>The bloom moves up the valley with the temperature, so you can chase it for a good three weeks.</p><ul><li><strong>Late March – first week of April:</strong> Lower Hunza — Ganish, Karimabad, Altit.</li><li><strong>Second and third week of April:</strong> Upper Hunza — Gulmit, Passu, Sost.</li><li><strong>Late April – early May:</strong> High-altitude villages like Hussaini, Zood Khun, and the Chapursan Valley.</li></ul><p>Weather is generally clear and mild in the day (12–20°C) and cold at night. Bring a warm layer; the light drops fast once the sun leaves the peaks.</p>`,
      images: g2.map((src, i) => ({ src, alt: `Hunza blossom ${i + 4}`, caption: "" })),
    },
    {
      id: "s-do",
      heading: "Things to do during blossom season",
      headingLevel: "h2",
      text: `<p>The obvious answer is <em>walk</em>. Every path in Hunza during blossom is a good path. A few specific ideas:</p><ul><li><strong>Altit and Baltit Forts</strong> — the old royal residences of Hunza, ringed by orchards. Baltit sits above Karimabad; Altit below it, near the river.</li><li><strong>Duikar viewpoint / Eagle&rsquo;s Nest</strong> — the classic panorama over the valley. Sunrise here in blossom is the shot everyone comes for.</li><li><strong>Hopper Valley</strong> — an hour up a side road from Aliabad; glacier at the head, blossoms on the terraces.</li><li><strong>Attabad Lake</strong> — the water turns unreal turquoise in April against the pink orchards along the shore.</li><li><strong>Passu Cones</strong> — the sawtooth peaks above the KKH are at their most photogenic with cherry blossoms in the foreground.</li></ul>`,
      images: g3.map((src, i) => ({ src, alt: `Hunza blossom ${i + 7}`, caption: "" })),
    },
    {
      id: "s-practical",
      heading: "Getting there and practical notes",
      headingLevel: "h2",
      text: `<p>Islamabad to Hunza is two full days by road via the Karakoram Highway (roughly 600 km) or a short PIA flight to Gilgit followed by a three-hour drive. The road is scenic and safe; the flight is dramatic but weather-dependent — plan a buffer day on either side if you fly.</p><p>Accommodation in Karimabad, Altit, and Gulmit fills up fast in April — book at least a month ahead. Cash is still king in the valley (ATMs exist in Aliabad and Gilgit only), and Zong or SCOM SIM cards are the most reliable for signal.</p><p>Bring a wide-angle lens, comfortable walking shoes, and a slow morning routine. Blossom season rewards the traveler who takes their time.</p>`,
      images: g4.map((src, i) => ({ src, alt: `Hunza blossom ${i + 10}`, caption: "" })),
    },
  ];
}

async function insertPost(urls) {
  const cover = urls[0];
  const sections = buildSections(urls);

  const row = {
    id: ID,
    slug: SLUG,
    title: "Hunza in Blossom: A Traveler's Guide to Spring in the Karakoram",
    excerpt:
      "For a few weeks each April, apricot and cherry blossoms turn the Hunza Valley pink against the raw peaks of the Karakoram. Here is when to go, where to walk, and what makes blossom season the best time to visit.",
    content: "",
    image: cover,
    tag: "Seasons",
    tags: ["hunza", "gilgit baltistan", "blossom", "spring", "karakoram"],
    categories: ["Blossom", "Destinations", "hunza", "Seasons"],
    author: "Traverse Pakistan",
    read_time: "6 min read",
    destination_slug: "hunza",
    meta_title: "Hunza in Blossom: When to Go & What to See in Spring",
    meta_description:
      "Hunza's apricot and cherry blossom season lasts about three weeks in April. Here is the exact window per village, the best viewpoints, and how to plan your trip.",
    sections,
    published: true,
    published_at: new Date().toISOString(),
  };

  const { error } = await supabase
    .from("blog_posts")
    .upsert(row, { onConflict: "id" });

  if (error) {
    console.error("Supabase insert failed:", error.message);
    process.exit(1);
  }
  console.log(`\nInserted /blog/${SLUG}`);
}

const urls = await uploadAll();
await insertPost(urls);
