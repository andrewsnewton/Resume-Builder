import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { viteStaticCopy } from 'vite-plugin-static-copy';

export default defineConfig({
  plugins: [
    react(),
    viteStaticCopy({
      targets: [
        {
          src: 'manifest.json',
          dest: '.'
        },
        {
          src: 'metadata.json',
          dest: '.'
        },
        {
          src: 'icon.png', 
          dest: '.',
          errorOnExist: false
        }
      ]
    })
  ],
  define: {
    // Safely inject the API key. 
    // Note: In local dev, make sure to set VITE_API_KEY or use the CLI method provided previously.
    'process.env.API_KEY': JSON.stringify(process.env.API_KEY || '')
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        main: 'index.html'
      },
      output: {
        // Extensions often prefer non-hashed filenames for simplicity, 
        // though hashing is usually fine for side panels.
        entryFileNames: `assets/[name].js`,
        chunkFileNames: `assets/[name].js`,
        assetFileNames: `assets/[name].[ext]`
      }
    }
  }
});