import { S3Client, ListObjectsV2Command } from "@aws-sdk/client-s3";

import { config } from "dotenv";

config({ path: ".env.local" });

const { R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_ENDPOINT } = process.env;

if (!R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY || !R2_ENDPOINT) {
  console.error("Missing R2 credentials (R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_ENDPOINT) in .env.local");
  process.exit(1);
}

const r2 = new S3Client({
  region: "auto",
  endpoint: R2_ENDPOINT,
  credentials: {
    accessKeyId: R2_ACCESS_KEY_ID,
    secretAccessKey: R2_SECRET_ACCESS_KEY,
  },
});

const BUCKET = "traverse-media";
const MEDIA = "https://media.traversepakistan.com";
const IMAGE_EXT = /\.(jpg|jpeg|png|webp|avif)$/i;

const map = {};

let token;
do {
  const res = await r2.send(new ListObjectsV2Command({
    Bucket: BUCKET,
    Prefix: "packages/",
    ContinuationToken: token,
  }));
  for (const obj of res.Contents ?? []) {
    if (!IMAGE_EXT.test(obj.Key)) continue;
    const parts = obj.Key.split("/"); // ["packages", slug, filename]
    if (parts.length !== 3) continue;
    const slug = parts[1];
    if (!map[slug]) map[slug] = [];
    map[slug].push(`${MEDIA}/${obj.Key}`);
  }
  token = res.NextContinuationToken;
} while (token);

console.log(JSON.stringify(map, null, 2));
