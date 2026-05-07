"use client";

import Image from "next/image";
import { useState } from "react";

interface Props {
  images: string[];
  fallback: string;
  alt: string;
  available: number;
}

export function RoomImageCarousel({ images, fallback, alt, available }: Props) {
  const imgs = (images.length > 0 ? images : fallback ? [fallback] : []).filter(Boolean);
  const [idx, setIdx] = useState(0);

  const prev = () => setIdx((i) => (i - 1 + imgs.length) % imgs.length);
  const next = () => setIdx((i) => (i + 1) % imgs.length);

  return (
    <div className="relative aspect-[3/2] bg-[var(--bg-subtle)]">
      {imgs[idx] && (
        <Image
          key={idx}
          src={imgs[idx]}
          alt={`${alt} — photo ${idx + 1}`}
          fill
          className="object-cover"
          sizes="300px"
        />
      )}

      {/* Availability badge */}
      <span
        className={`absolute top-2 right-2 z-10 px-2 py-0.5 text-[10px] font-bold uppercase rounded-[var(--radius-full)] ${
          available <= 2
            ? "bg-[var(--warning)] text-[var(--on-dark)]"
            : "bg-[var(--bg-primary)]/80 backdrop-blur-sm text-[var(--text-primary)]"
        }`}
      >
        {available} left
      </span>

      {imgs.length > 1 && (
        <>
          {/* Prev */}
          <button
            type="button"
            onClick={prev}
            className="absolute left-2 top-1/2 -translate-y-1/2 z-10 w-8 h-8 rounded-[var(--radius-sm)] bg-black/50 text-white flex items-center justify-center hover:bg-black/70 active:scale-95 transition-all duration-[var(--duration-fast)]"
            aria-label="Previous image"
          >
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
              <path d="M10 3L5 8L10 13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>

          {/* Next */}
          <button
            type="button"
            onClick={next}
            className="absolute right-2 top-1/2 -translate-y-1/2 z-10 w-8 h-8 rounded-[var(--radius-sm)] bg-black/50 text-white flex items-center justify-center hover:bg-black/70 active:scale-95 transition-all duration-[var(--duration-fast)]"
            aria-label="Next image"
          >
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
              <path d="M6 3L11 8L6 13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>

          {/* Dot indicators */}
          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1 z-10">
            {imgs.map((_, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setIdx(i)}
                aria-label={`Photo ${i + 1}`}
                className={`w-1.5 h-1.5 rounded-full transition-all duration-[var(--duration-fast)] ${
                  i === idx ? "bg-white scale-125" : "bg-white/50"
                }`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
