"use client";

import Image from "next/image";
import { useState } from "react";
import { Container } from "@/components/ui/Container";

const videos = [
  {
    id: "YU4nkUbzscw",
    chapter: "01",
    title: "Elements of Pakistan",
    description: "A cinematic odyssey across deserts, glaciers, and ancient valleys — the soul of Pakistan in motion.",
    featured: true,
  },
  {
    id: "-lRiuXiCEuQ",
    chapter: "02",
    title: "Experiencing Blossom in Hunza",
    description: "Cherry blossoms paint the valley pink as spring awakens in the mountains.",
  },
  {
    id: "fKasqulbWVU",
    chapter: "03",
    title: "Stroll into Colorful Hunza",
    description: "Golden autumn light transforms Hunza into a living painting.",
  },
  {
    id: "mn8bKlkWo3s",
    chapter: "04",
    title: "Aerial Snow Views — Pipeline Track",
    description: "A breathtaking drone journey through snow-covered Ayubia and Dunga Gali.",
  },
  {
    id: "mDrxZG6Bn5Y",
    chapter: "05",
    title: "A Minute in Swat & Ushu Forest",
    description: "Emerald rivers, ancient forests, and the magic of Malam Jabba.",
  },
  {
    id: "8Ex7KEpPHWg",
    chapter: "06",
    title: "Secrets of Kirthar",
    description: "Uncharted Sindh — wild landscapes and forgotten stories of the south.",
  },
];

export function VideoStories() {
  const [activeVideo, setActiveVideo] = useState<string | null>(null);
  const featured = videos[0];
  const chapters = videos.slice(1);

  const openTheater = (videoId: string) => {
    setActiveVideo(videoId);
    document.body.style.overflow = "hidden";
  };

  const closeTheater = () => {
    setActiveVideo(null);
    document.body.style.overflow = "";
  };

  return (
    <>
      <section className="relative bg-[var(--bg-dark)] py-20 sm:py-24 overflow-hidden">
        {/* Subtle grain */}
        <div className="absolute inset-0 opacity-[0.02]" style={{ backgroundImage: "radial-gradient(circle at 1px 1px, white 1px, transparent 0)", backgroundSize: "32px 32px" }} />

        <Container wide className="relative">
          <div className="text-center mb-12">
            <span className="inline-block text-[11px] font-bold uppercase tracking-[0.15em] text-[var(--primary-muted)] mb-3">
              The Journey Awaits
            </span>
            <h2
              className="text-[var(--on-dark)] font-semibold tracking-[-0.015em] leading-tight"
              style={{ fontSize: "clamp(1.375rem, 1.2rem + 1vw, 2.25rem)" }}
            >
              Stories from the Road
            </h2>
            <p className="mt-3 text-[var(--on-dark-tertiary)] max-w-md mx-auto" style={{ fontSize: "var(--text-lg)" }}>
              Six films. Six journeys. One Pakistan you&apos;ve never seen before.
            </p>
          </div>

          {/* Featured hero video */}
          <button
            type="button"
            onClick={() => openTheater(featured.id)}
            className="group relative w-full aspect-[21/9] rounded-[var(--radius-lg)] overflow-hidden cursor-pointer mb-5"
          >
            <Image
              src={`https://img.youtube.com/vi/${featured.id}/maxresdefault.jpg`}
              alt={featured.title}
              fill
              className="object-cover transition-transform duration-700 group-hover:scale-[1.03]"
              sizes="100vw"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-black/10 group-hover:from-black/70 transition-all duration-500" />

            {/* Play button */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-[var(--on-dark-glass-hover)] backdrop-blur-sm flex items-center justify-center group-hover:scale-110 group-hover:bg-[var(--on-dark-glass-hover)] transition-all duration-300 ring-2 ring-[var(--on-dark-glass-hover)]">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="white" className="ml-1">
                  <polygon points="8,5 19,12 8,19" />
                </svg>
              </div>
            </div>

            {/* Meta */}
            <div className="absolute bottom-0 left-0 right-0 p-6 sm:p-8">
              <span className="inline-block px-3 py-1 text-[10px] font-bold uppercase tracking-[0.1em] bg-[var(--on-dark-glass-hover)] backdrop-blur-sm text-[var(--on-dark)] rounded-[var(--radius-full)] mb-3">
                Chapter {featured.chapter}
              </span>
              <h3
                className="text-xl sm:text-2xl lg:text-3xl font-bold text-[var(--on-dark)] tracking-[-0.02em]"
                style={{ textShadow: "0 2px 12px rgba(0,0,0,0.5)" }}
              >
                {featured.title}
              </h3>
              <p className="text-[14px] text-[var(--on-dark-secondary)] mt-2 max-w-lg">{featured.description}</p>
            </div>
          </button>

          {/* Chapter grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
            {chapters.map((video) => (
              <button
                key={video.id}
                type="button"
                onClick={() => openTheater(video.id)}
                className="group text-left cursor-pointer"
              >
                <div className="relative aspect-video rounded-[var(--radius-sm)] overflow-hidden mb-2.5">
                  <Image
                    src={`https://img.youtube.com/vi/${video.id}/mqdefault.jpg`}
                    alt={video.title}
                    fill
                    className="object-cover transition-transform duration-500 group-hover:scale-[1.05]"
                    sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw"
                  />
                  <div className="absolute inset-0 bg-black/20 group-hover:bg-black/10 transition-colors" />
                  <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    <div className="w-10 h-10 rounded-full bg-[var(--on-dark-glass-hover)] backdrop-blur-sm flex items-center justify-center">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="white">
                        <polygon points="8,5 19,12 8,19" />
                      </svg>
                    </div>
                  </div>
                  <span className="absolute top-2 left-2 text-[10px] font-bold text-[var(--on-dark-secondary)] bg-black/40 backdrop-blur-sm px-1.5 py-0.5 rounded">
                    {video.chapter}
                  </span>
                </div>
                <h4 className="text-[13px] font-semibold text-[var(--on-dark-secondary)] leading-snug line-clamp-2 group-hover:text-[var(--primary-muted)] transition-colors">
                  {video.title}
                </h4>
              </button>
            ))}
          </div>

          {/* YouTube CTA */}
          <div className="text-center mt-10">
            <a
              href="https://www.youtube.com/@TraversePakistan"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2.5 h-11 px-6 bg-white/10 hover:bg-[var(--on-dark-glass-hover)] text-[var(--on-dark)] text-[14px] font-semibold rounded-[var(--radius-full)] border border-[var(--on-dark-border)] transition-all duration-200"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                <path d="M23.5 6.2a3 3 0 00-2.1-2.1C19.5 3.5 12 3.5 12 3.5s-7.5 0-9.4.6A3 3 0 00.5 6.2 31.9 31.9 0 000 12a31.9 31.9 0 00.5 5.8 3 3 0 002.1 2.1c1.9.6 9.4.6 9.4.6s7.5 0 9.4-.6a3 3 0 002.1-2.1A31.9 31.9 0 0024 12a31.9 31.9 0 00-.5-5.8zM9.6 15.6V8.4l6.3 3.6-6.3 3.6z" />
              </svg>
              Watch all stories on YouTube
            </a>
          </div>
        </Container>
      </section>

      {/* ── Theater Mode ── */}
      {activeVideo && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center">
          <div className="absolute inset-0 bg-black/95 backdrop-blur-sm" onClick={closeTheater} />
          <div className="relative w-full max-w-5xl mx-4 sm:mx-8">
            <button
              type="button"
              onClick={closeTheater}
              className="absolute -top-12 right-0 w-10 h-10 flex items-center justify-center text-[var(--on-dark-secondary)] hover:text-[var(--on-dark)] bg-[var(--on-dark-glass)] hover:bg-white/20 rounded-full cursor-pointer transition-colors z-10"
              aria-label="Close"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
            <div className="relative w-full aspect-video rounded-[var(--radius-md)] overflow-hidden bg-black">
              <iframe
                src={`https://www.youtube.com/embed/${activeVideo}?autoplay=1&rel=0&modestbranding=1`}
                className="absolute inset-0 w-full h-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
              />
            </div>
            <div className="mt-4 text-center">
              <span className="text-[11px] font-bold uppercase tracking-[0.1em] text-[var(--primary-muted)]">
                Chapter {videos.find((v) => v.id === activeVideo)?.chapter}
              </span>
              <h3 className="text-lg font-bold text-[var(--on-dark)] mt-1">
                {videos.find((v) => v.id === activeVideo)?.title}
              </h3>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
