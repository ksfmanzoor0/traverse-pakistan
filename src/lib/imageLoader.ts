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
  // Non-R2 images (WP, YouTube, placehold.co, Google) pass through unchanged
  if (!src.startsWith(R2_ORIGIN)) return src;

  const path = src.slice(R2_ORIGIN.length);
  const q = quality ?? 80;
  return `${IMAGEKIT_URL}${path}?tr=w-${width},q-${q},f-auto`;
}
