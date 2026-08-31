import type { TourBlock } from "./tour-block";

export interface Region {
  id: string;
  slug: string;
  name: string;
  heroImage: string;
  description: string;
  destinationSlugs: string[];
  tourCount: number;
  metaTitle: string;
  metaDescription: string;
  bodyBlocks?: TourBlock[];
}
