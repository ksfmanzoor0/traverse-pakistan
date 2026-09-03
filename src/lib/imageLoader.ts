const IMAGEKIT_URL = "https://ik.imagekit.io/traversepakistan";
const R2_ORIGIN = "https://media.traversepakistan.com";

export default function imageKitLoader({
  src,
  width,
  quality,
}: {
  src: string;
  width: number;
  quality?: number;
}): string {
  const q = quality ?? 70;

  if (src.startsWith(R2_ORIGIN)) {
    const path = src.slice(R2_ORIGIN.length);
    return `${IMAGEKIT_URL}${path}?tr=w-${width},q-${q},f-auto`;
  }

  // Other origins (YouTube thumbnails, placehold.co, Google avatars, local)
  // Append width so the Next.js loader contract is satisfied; unknown params
  // are ignored server-side.
  const sep = src.includes("?") ? "&" : "?";
  return `${src}${sep}w=${width}`;
}
