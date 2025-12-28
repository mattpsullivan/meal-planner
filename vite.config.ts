import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import path from 'path';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');

  // Check process.env first (for CI), then loadEnv (for local .env files)
  const basePath = process.env['VITE_BASE_PATH'] ?? env['VITE_BASE_PATH'] ?? '/';

  // Log the base path during build for debugging
  console.log(`[vite.config] mode=${mode}, basePath="${basePath}"`);
  console.log(
    `[vite.config] process.env.VITE_BASE_PATH="${process.env['VITE_BASE_PATH'] ?? 'undefined'}"`
  );
  console.log(`[vite.config] env.VITE_BASE_PATH="${env['VITE_BASE_PATH'] ?? 'undefined'}"`);

  return {
    // Base path for GitHub Pages deployment
    // Set VITE_BASE_PATH=/repo-name/ in CI or .env.production
    base: basePath,
    // TEMP: Force development mode to see full React error messages
    define: {
      'process.env.NODE_ENV': JSON.stringify('development'),
    },
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    server: {
      port: 5173, // Fixed container-internal port
      host: true, // Listen on all interfaces for Docker
    },
    preview: {
      port: 4173,
      host: true,
    },
    build: {
      // Enable sourcemaps for debugging production issues
      sourcemap: true,
      // TEMP: Disable minification to see full error messages
      minify: false,
      rollupOptions: {
        output: {
          manualChunks: {
            vendor: ['react', 'react-dom', 'react-router-dom'],
            query: ['@tanstack/react-query'],
          },
        },
      },
    },
  };
});
