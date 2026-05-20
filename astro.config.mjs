// @ts-check
import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  site: 'https://dany80213.github.io',
  base: '/cv',
  vite: {
    plugins: [tailwindcss()]
  }
});