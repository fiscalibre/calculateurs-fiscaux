// @ts-check
import { defineConfig } from 'astro/config';

import react from '@astrojs/react';
import sitemap from '@astrojs/sitemap';
import tailwindcss from '@tailwindcss/vite';

// https://astro.build/config
export default defineConfig({
  // Domaine de production — source unique pour le canonical des pages,
  // le sitemap et les URLs Open Graph. À ne changer qu'ici.
  site: 'https://clairfisc.fr',

  integrations: [react(), sitemap()],

  vite: {
    plugins: [tailwindcss()]
  }
});