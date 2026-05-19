"use client";

import { useEffect, useState } from "react";
import Image from "next/image";

interface GoogleReview {
  author: string;
  avatar: string;
  rating: number;
  text: string;
  time: number;
  relativeTime: string;
}

interface ReviewsData {
  rating: number;
  totalRatings: number;
  reviews: GoogleReview[];
}

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <svg
          key={star}
          width="14"
          height="14"
          viewBox="0 0 20 20"
          fill="currentColor"
          className={star <= rating ? "text-[var(--warning)]" : "text-[var(--on-dark-tertiary)]"}
        >
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
      ))}
    </div>
  );
}

function ReviewCard({ review }: { review: GoogleReview }) {
  const [expanded, setExpanded] = useState(false);
  const isLong = review.text.length > 200;
  const displayText = isLong && !expanded ? review.text.slice(0, 200) + "…" : review.text;

  return (
    <div className="bg-[var(--on-dark-glass)] border border-[var(--on-dark-border)] rounded-[var(--radius-md)] p-5 flex flex-col gap-4 h-full backdrop-blur-sm">
      <div className="flex items-center gap-3">
        <div className="relative w-10 h-10 rounded-[var(--radius-full)] overflow-hidden bg-[var(--on-dark-glass)] shrink-0">
          {review.avatar ? (
            <Image src={review.avatar} alt={review.author} fill className="object-cover" unoptimized />
          ) : (
            <span className="w-full h-full flex items-center justify-center text-[var(--on-dark)] text-[13px] font-bold">
              {review.author.charAt(0).toUpperCase()}
            </span>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[13px] font-semibold text-[var(--on-dark)] truncate">{review.author}</p>
          <p className="text-[11px] text-[var(--on-dark-tertiary)]">{review.relativeTime}</p>
        </div>
        <GoogleLogo />
      </div>

      <StarRating rating={review.rating} />

      <p className="text-[13px] text-[var(--on-dark-secondary)] leading-relaxed flex-1">
        &ldquo;{displayText}&rdquo;
        {isLong && (
          <button
            type="button"
            onClick={() => setExpanded(!expanded)}
            className="ml-1 text-[var(--primary-muted)] font-medium text-[13px] cursor-pointer hover:underline"
          >
            {expanded ? "Show less" : "Read more"}
          </button>
        )}
      </p>
    </div>
  );
}

function GoogleLogo() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" aria-label="Google" className="shrink-0">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
    </svg>
  );
}

function OverallRating({ rating, totalRatings }: { rating: number; totalRatings: number }) {
  return (
    <div className="flex flex-col items-center gap-2">
      <span className="text-[48px] font-bold text-[var(--on-dark)] leading-none tabular-nums">
        {rating.toFixed(1)}
      </span>
      <StarRating rating={Math.round(rating)} />
      <p className="text-[12px] text-[var(--on-dark-tertiary)]">
        {totalRatings.toLocaleString()} Google reviews
      </p>
      <a
        href="https://search.google.com/local/writereview?placeid=ChIJgQtFTMe93zgRJh592e6NgwM"
        target="_blank"
        rel="noopener noreferrer"
        className="text-[12px] text-[var(--primary-muted)] font-semibold hover:underline"
      >
        Write a review
      </a>
    </div>
  );
}

export function GoogleReviews() {
  const [data, setData] = useState<ReviewsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/reviews/google")
      .then((r) => r.json())
      .then((d) => { if (!d.error) setData(d); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <section className="relative bg-[var(--bg-dark)] py-16 px-4">
        <div className="max-w-[1280px] mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-[var(--on-dark-glass)] rounded-[var(--radius-md)] h-48 animate-pulse" />
            ))}
          </div>
        </div>
      </section>
    );
  }

  if (!data) return null;

  return (
    <section className="relative bg-[var(--bg-dark)] py-16 px-4">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: "radial-gradient(circle at 1px 1px, white 1px, transparent 0)", backgroundSize: "40px 40px" }} />
      </div>
      <div className="max-w-[1280px] mx-auto relative">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-8 mb-10">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-[var(--primary-muted)] mb-2">Reviews</p>
            <h2 className="text-[28px] sm:text-[32px] font-bold text-[var(--on-dark)] tracking-tight leading-tight">
              What our travellers say
            </h2>
            <p className="mt-1 text-[14px] text-[var(--on-dark-secondary)]">
              Real reviews from Google — verified travellers
            </p>
          </div>
          <OverallRating rating={data.rating} totalRatings={data.totalRatings} />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {data.reviews.map((review, i) => (
            <ReviewCard key={i} review={review} />
          ))}
        </div>

        <div className="mt-8 text-center">
          <a
            href="https://www.google.com/maps/place/?q=place_id:ChIJgQtFTMe93zgRJh592e6NgwM"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 h-11 px-6 border border-[var(--on-dark-border)] text-[13px] font-semibold text-[var(--on-dark)] rounded-[var(--radius-sm)] hover:bg-[var(--on-dark-glass)] transition-colors"
          >
            <GoogleLogo />
            View all reviews on Google
          </a>
        </div>
      </div>
    </section>
  );
}
