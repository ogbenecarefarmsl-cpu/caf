import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'node:path'

import { cloudflare } from "@cloudflare/vite-plugin";

const chunkNameForPage = (id: string) => {
  const normalized = id.replace(/\\/g, '/');
  const pagesIndex = normalized.indexOf('/src/pages/');
  if (pagesIndex === -1) return undefined;

  const pagePath = normalized.slice(pagesIndex + '/src/pages/'.length);
  const parsed = path.parse(pagePath);
  return `page-${parsed.name.toLowerCase().replace(/page$/, '')}`;
};

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), cloudflare()],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          const pageChunk = chunkNameForPage(id);
          if (pageChunk) return pageChunk;

          if (id.includes('node_modules')) {
            if (id.includes('/react/') || id.includes('/react-dom/') || id.includes('/react-router-dom/')) return 'react';
            if (id.includes('@tanstack/react-query')) return 'query';
            if (id.includes('react-hook-form')) return 'forms';
            if (id.includes('lucide-react')) return 'ui';
            if (id.includes('socket.io-client')) return 'realtime';
            if (id.includes('dexie') || id.includes('zustand')) return 'storage';
            if (
              id.includes('@capacitor/') ||
              id.includes('@capacitor-mlkit/') ||
              id.includes('@aparajita/') ||
              id.includes('@capgo/')
            ) {
              return 'native';
            }
          }

          return undefined;
        },
      },
    },
  },
})
