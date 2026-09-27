import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 3000,
    host: true,
    watch: {
      ignored: [
        '**/scratch/**',
        '**/scratch_chrome/**',
        '**/data/**',
        '**/docs/**',
        '**/supabase/**',
        '**/.git/**',
        '**/node_modules/**',
        '**/dist/**',
      ],
    },
  },
});
