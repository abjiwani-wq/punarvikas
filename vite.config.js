import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Relative base so the build also works from a file:// path (e.g. the Android WebView assets folder).
export default defineConfig({
  base: './',
  plugins: [react()],
});
