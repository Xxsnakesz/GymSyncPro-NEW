import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import viteCompression from "vite-plugin-compression";
import { visualizer } from "rollup-plugin-visualizer";
export default defineConfig({
  plugins: [
    react(),
    // Generate gzip & brotli assets for production
    viteCompression({ algorithm: 'gzip', ext: '.gz' }),
    viteCompression({ algorithm: 'brotliCompress', ext: '.br' }),
    // Bundle analysis (open dist/stats.html after build)
    visualizer({ filename: "dist/stats.html", template: "treemap", gzipSize: true, brotliSize: true, open: false }),
    // Removed Replit-specific plugins (ESM-only) to keep local dev build compatible
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "client", "src"),
      "@shared": path.resolve(__dirname, "shared"),
      "@assets": path.resolve(__dirname, "attached_assets"),
    },
  },
  root: path.resolve(__dirname, "client"),
  build: {
    outDir: path.resolve(__dirname, "dist/public"),
    emptyOutDir: true,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('react')) return 'react';
            if (id.includes('@radix-ui') || id.includes('class-variance-authority') || id.includes('clsx')) return 'ui';
            if (id.includes('@tanstack')) return 'query';
            if (id.includes('date-fns')) return 'date';
            if (id.includes('recharts')) return 'charts';
            if (id.includes('html5-qrcode') || id.includes('qrcode')) return 'qr';
            if (id.includes('zod')) return 'zod';
            if (id.includes('lucide-react')) return 'icons';
            return 'vendor';
          }
        }
      }
    }
  },
  server: {
    fs: {
      strict: true,
      deny: ["**/.*"],
    },
  },
});
