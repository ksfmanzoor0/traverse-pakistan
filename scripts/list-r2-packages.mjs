import { S3Client, ListObjectsV2Command } from "@aws-sdk/client-s3";

const r2 = new S3Client({
  region: "auto",
  endpoint: "https://455676071213557fe34d7e16fec6f08e.r2.cloudflarestorage.com",
  credentials: {
    accessKeyId: "238fd8b9fed207929ccff9af089d1426",
    secretAccessKey: "b63abea0e5b302147c04f1016409aeac61918d2421a945b4146c3a6dd1cef724",
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
