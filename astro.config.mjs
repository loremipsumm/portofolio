// @ts-check
import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';

// https://astro.build/config
export default defineConfig({
  // Absolute URLs for the canonical link and social preview image (og:image). Update if the domain changes.
  site: 'https://portofolio-pi-seven-65.vercel.app',
  vite: {
    plugins: [tailwindcss()],
  },
});
