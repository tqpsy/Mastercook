/// <reference types="vitest/config" />
import { readFileSync } from 'node:fs';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

const pacchetto = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8')) as { version: string };

// BASE_URL: "/" su Cloudflare Pages, "/Mastercook/" su GitHub Pages (impostato dal workflow).
const base = process.env.BASE_URL_APP ?? '/';

// Versione mostrata nelle Impostazioni: numero del pacchetto + data della pubblicazione (ora italiana),
// così si vede subito se il telefono ha l'ultima.
const pubblicata = new Intl.DateTimeFormat('it-IT', { timeZone: 'Europe/Rome', dateStyle: 'short', timeStyle: 'short' }).format(new Date());
const versioneApp = `${pacchetto.version} del ${pubblicata}`;

export default defineConfig({
  base,
  define: { __VERSIONE_APP__: JSON.stringify(versioneApp) },
  plugins: [
    react(),
    VitePWA({
      registerType: 'prompt',
      includeAssets: ['favicon.svg', 'apple-touch-icon.png'],
      manifest: {
        name: 'Masterfood',
        short_name: 'Masterfood',
        description: 'La spesa, la dispensa e le ricette della tua famiglia',
        lang: 'it',
        id: base,
        start_url: base,
        scope: base,
        display: 'standalone',
        orientation: 'portrait',
        background_color: '#f7f8f3',
        theme_color: '#4d6b2a',
        icons: [
          { src: 'pwa-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'pwa-512-maskable.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
        navigateFallback: `${base}index.html`,
        runtimeCaching: [
          {
            // Motori di OCR e lettura codici (Tesseract.js, ZXing): scaricati la prima volta, poi offline.
            urlPattern: ({ url }) => url.hostname.endsWith('jsdelivr.net'),
            handler: 'CacheFirst',
            options: { cacheName: 'masterfood-motori', expiration: { maxEntries: 30 }, cacheableResponse: { statuses: [0, 200] } },
          },
          {
            // Dati di riferimento statici e versionati (/rif/v<n>/): una volta scaricati non cambiano.
            urlPattern: ({ url }) => url.pathname.includes('/rif/'),
            handler: 'CacheFirst',
            options: { cacheName: 'masterfood-rif', expiration: { maxEntries: 100 } },
          },
        ],
      },
    }),
  ],
  test: {
    environment: 'node',
    setupFiles: ['./src/test/setup.ts'],
  },
});
