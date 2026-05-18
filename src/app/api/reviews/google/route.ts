import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const revalidate = 86400;

export interface GoogleReview {
  author: string;
  avatar: string;
  rating: number;
  text: string;
  time: number;
  relativeTime: string;
}

export async function GET() {
  const apiKey = process.env.GOOGLE_PLACES_API_KEY;
  const placeId = process.env.NEXT_PUBLIC_GOOGLE_PLACE_ID ?? "ChIJgQtFTMe93zgRJh592e6NgwM";

  if (!apiKey) {
    return NextResponse.json({ error: "GOOGLE_PLACES_API_KEY not set" }, { status: 500 });
  }

  try {
    const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=name,rating,user_ratings_total,reviews&reviews_sort=most_relevant&key=${apiKey}`;

    const res = await fetch(url, { next: { revalidate: 86400 } });

    if (!res.ok) throw new Error(`Places API error: ${res.status}`);

    const data = await res.json();

    if (data.status !== "OK") {
      return NextResponse.json(
        { error: `Places API: ${data.status}`, message: data.error_message ?? null },
        { status: 502 }
      );
    }

    const result = data.result;

    const reviews: GoogleReview[] = (result.reviews ?? [])
      .filter((r: { rating: number }) => r.rating >= 4)
      .map((r: { author_name: string; profile_photo_url: string; rating: number; text: string; time: number; relative_time_description: string }) => ({
        author: r.author_name,
        avatar: r.profile_photo_url,
        rating: r.rating,
        text: r.text,
        time: r.time,
        relativeTime: r.relative_time_description,
      }));

    return NextResponse.json({
      rating: result.rating,
      totalRatings: result.user_ratings_total,
      reviews,
    });
  } catch (error) {
    console.error("[Google Reviews]", error);
    return NextResponse.json({ error: "Failed to fetch reviews" }, { status: 500 });
  }
}
