const IMAGEKIT_URL = "https://ik.imagekit.io/traversepakistan";
const R2_ORIGIN = "https://media.traversepakistan.com";

// WordPress origins we proxy through ImageKit. Any URL matching one of these
// gets rewritten to /wp/<path-after-uploads> so ImageKit fetches from the
// upstream WP origin (configured in the ImageKit dashboard) and returns a
// resized WebP/AVIF. Requires a URL endpoint in ImageKit dashboard:
//   Endpoint identifier: "wp"
//   Origin type: "Web Folder"
//   Base URL: https://wp.traversepakistan.com/wp-content/uploads
const WP_ORIGINS = [
  "https://traversepakistan.com/wp-content/uploads",
  "https://www.traversepakistan.com/wp-content/uploads",
  "https://wp.traversepakistan.com/wp-content/uploads",
];

function stripWpPrefix(src: string): string | null {
  for (const origin of WP_ORIGINS) {
    if (src.startsWith(origin)) return src.slice(origin.length);
  }
  return null;
}

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
    // Cache-buster scoped to hero slides only — bump when re-encoding slides
    const bust = path.startsWith("/homepageslider/") ? "&v=2" : "";
    return `${IMAGEKIT_URL}${path}?tr=w-${width},q-${q},f-auto${bust}`;
  }

  const wpPath = stripWpPrefix(src);
  if (wpPath) {
    const clean = wpPath.split("?")[0];
    return `${IMAGEKIT_URL}/wp${clean}?tr=w-${width},q-${q},f-auto`;
  }

  // Other origins (YouTube thumbnails, placehold.co, Google avatars, local)
  // Append width so the Next.js loader contract is satisfied; unknown params
  // are ignored server-side.
  const sep = src.includes("?") ? "&" : "?";
  return `${src}${sep}w=${width}`;
}
