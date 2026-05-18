import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import fs from "fs";
import path from "path";

const SOURCE = "/Users/kashifmanzoor/Downloads/packages";
const R2_PREFIX = "packages";

const r2 = new S3Client({
  region: "auto",
  endpoint: "https://455676071213557fe34d7e16fec6f08e.r2.cloudflarestorage.com",
  credentials: {
    accessKeyId: "238fd8b9fed207929ccff9af089d1426",
    secretAccessKey: "b63abea0e5b302147c04f1016409aeac61918d2421a945b4146c3a6dd1cef724",
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
