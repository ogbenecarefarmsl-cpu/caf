import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

import { cloudflare } from "@cloudflare/vite-plugin";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), cloudflare()],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          const normalized = id.replace(/\\/g, '/');

          if (normalized.includes('node_modules')) {
            if (
              normalized.includes('/react/') ||
              normalized.includes('/react-dom/') ||
              normalized.includes('/react-router-dom/')
            ) return 'react';
            if (normalized.includes('@tanstack/react-query')) return 'query';
            if (normalized.includes('react-hook-form')) return 'forms';
            if (normalized.includes('recharts') || normalized.includes('d3-')) return 'charts';
            if (normalized.includes('lucide-react')) return 'ui';
            if (normalized.includes('socket.io-client')) return 'realtime';
            if (normalized.includes('dexie') || normalized.includes('zustand')) return 'storage';
            if (
              normalized.includes('@capacitor/') ||
              normalized.includes('@capacitor-mlkit/') ||
              normalized.includes('@aparajita/') ||
              normalized.includes('@capgo/')
            ) {
              return 'native';
            }
          }

          if (normalized.includes('/src/pages/')) {
            if (normalized.includes('/src/pages/pos/')) return 'pos-pages';
            if (normalized.includes('/src/pages/marketer/')) return 'marketer-pages';
            if (normalized.includes('/src/pages/admin/')) {
              if (normalized.includes('Report') || normalized.includes('Audit')) return 'admin-reports';
              if (
                normalized.includes('Finance') ||
                normalized.includes('Cash') ||
                normalized.includes('Salary') ||
                normalized.includes('Reconciliation')
              ) return 'admin-finance';
              if (
                normalized.includes('Product') ||
                normalized.includes('Inventory') ||
                normalized.includes('Stock') ||
                normalized.includes('Purchase') ||
                normalized.includes('Transfer') ||
                normalized.includes('Supplier')
              ) return 'admin-inventory';
              return 'admin-pages';
            }
          }

          return undefined;
        },
      },
    },
  },
})
