// Project images live in src/assets/projects/ so Astro can optimize them (WebP, several widths) at build time.
import type { ImageMetadata } from 'astro';

const all = import.meta.glob<ImageMetadata>('/src/assets/projects/*.{png,jpg,jpeg,webp}', { eager: true, import: 'default' });

/** Image metadata for a file name stored in projects.json, or undefined if the file does not exist. */
export function projectImage(file?: string): ImageMetadata | undefined {
  return file ? all[`/src/assets/projects/${file}`] : undefined;
}
