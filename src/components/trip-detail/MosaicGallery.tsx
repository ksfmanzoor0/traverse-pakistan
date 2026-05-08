"use client";

import Image from "next/image";
import { useState } from "react";
import { cn } from "@/lib/utils";
import type { TourImage } from "@/types/tour";

interface MosaicGalleryProps {
  images: TourImage[];
  tourName: string;
}

export function MosaicGallery({ images: rawImages, tourName }: MosaicGalleryProps) {
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const [failedUrls, setFailedUrls] = useState<Set<string>>(new Set());

  const images = rawImages.filter(img => !failedUrls.has(img.url));
  const onImgError = (url: string) => setFailedUrls(prev => new Set([...prev, url]));

  const openLightbox = (index: number) => {
    setActiveIndex(index);
    setLightboxOpen(true);
    document.body.style.overflow = "hidden";
  };

  const closeLightbox = () => {
    setLightboxOpen(false);
    document.body.style.overflow = "";
  };

  const navigate = (dir: 1 | -1) => {
    setActiveIndex((prev) => (prev + dir + images.length) % images.length);
  };

  return (
    <>
      {/* Mosaic Grid */}
      <div className="relative h-[300px] sm:h-[420px] lg:h-[480px] rounded-xl overflow-hidden">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 h-full">
          {/* Hero image (left half) */}
          <button
            type="button"
            onClick={() => openLightbox(0)}
            className="relative h-full cursor-pointer overflow-hidden"
          >
            {images[0] && (
              <Image
                src={images[0].url}
                alt={images[0].alt}
                fill
                className="object-cover hover:scale-105 transition-transform duration-500"
                sizes="(max-width: 640px) 100vw, 50vw"
                priority
                onError={() => onImgError(images[0].url)}
              />
            )}
          </button>

          {/* 2x2 grid (right half) */}
          <div className="hidden sm:grid grid-cols-2 grid-rows-2 gap-2 h-full">
            {images.slice(1, 5).map((img, i) => (
              <button
                key={i}
                type="button"
                onClick={() => openLightbox(i + 1)}
                className="relative overflow-hidden cursor-pointer"
              >
                <Image
                  src={img.url}
                  alt={img.alt}
                  fill
                  className="object-cover hover:scale-105 transition-transform duration-500"
                  sizes="25vw"
                  onError={() => onImgError(img.url)}
                />
              </button>
            ))}
          </div>
        </div>

        {/* Show all photos button */}
        <button
          type="button"
          onClick={() => openLightbox(0)}
          className="absolute bottom-4 right-4 px-4 py-2 bg-[var(--bg-primary)] text-[var(--text-primary)] text-[13px] font-semibold rounded-full shadow-lg hover:shadow-xl transition-shadow cursor-pointer flex items-center gap-2"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="3" y="3" width="7" height="7" />
            <rect x="14" y="3" width="7" height="7" />
            <rect x="14" y="14" width="7" height="7" />
            <rect x="3" y="14" width="7" height="7" />
          </svg>
          Show all photos
        </button>
      </div>

      {/* Lightbox */}
      {lightboxOpen && (
        <div className="fixed inset-0 z-[100] bg-black/95 flex items-center justify-center">
          <button
            type="button"
            onClick={closeLightbox}
            className="absolute top-4 right-4 w-10 h-10 flex items-center justify-center text-white/70 hover:text-white bg-white/10 rounded-full cursor-pointer z-10"
            aria-label="Close"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>

          {/* Counter */}
          <span className="absolute top-4 left-4 text-[14px] text-white/60 z-10">
            {activeIndex + 1} / {images.length}
          </span>

          {/* Nav arrows */}
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="absolute left-4 top-1/2 -translate-y-1/2 w-12 h-12 flex items-center justify-center bg-white/10 hover:bg-white/20 rounded-full text-white cursor-pointer z-10"
            aria-label="Previous"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M15 18l-6-6 6-6" />
            </svg>
          </button>
          <button
            type="button"
            onClick={() => navigate(1)}
            className="absolute right-4 top-1/2 -translate-y-1/2 w-12 h-12 flex items-center justify-center bg-white/10 hover:bg-white/20 rounded-full text-white cursor-pointer z-10"
            aria-label="Next"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M9 18l6-6-6-6" />
            </svg>
          </button>

          {/* Image */}
          <div className="relative w-full max-w-4xl h-[70vh] mx-8">
            {images[activeIndex] && (
              <Image
                src={images[activeIndex].url}
                alt={images[activeIndex].alt}
                fill
                className="object-contain"
                sizes="90vw"
                onError={() => onImgError(images[activeIndex].url)}
              />
            )}
          </div>
        </div>
      )}
    </>
  );
}
