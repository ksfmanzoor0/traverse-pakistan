import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
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

const SLUGS = [
  "hunza-naran-6day",
  "hunza-naran-naltar-7day",
  "swat-chitral-kailash-7day",
];

async function uploadCover(slug) {
  const localPath = path.join(SOURCE, slug, "cover.jpg");
  if (!fs.existsSync(localPath)) {
    console.log(`SKIP ${slug} — no local cover.jpg`);
    return null;
  }
  const key = `${R2_PREFIX}/${slug}/cover.jpg`;
  const body = fs.readFileSync(localPath);
  await r2.send(new PutObjectCommand({ Bucket: BUCKET, Key: key, Body: body, ContentType: "image/jpeg" }));
  const url = `https://media.traversepakistan.com/${key}`;
  console.log(`UPLOADED ${url}`);
  return url;
}

for (const slug of SLUGS) {
  await uploadCover(slug);
}
