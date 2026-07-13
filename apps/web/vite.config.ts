import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

const AWS_API_ORIGIN = 'https://4njro4e2y6.execute-api.ca-central-1.amazonaws.com';

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': {
        target: AWS_API_ORIGIN,
        changeOrigin: true,
        secure: true,
      },
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    css: false,
  },
});
