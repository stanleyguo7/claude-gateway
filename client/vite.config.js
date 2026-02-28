import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const clientPort = Number(process.env.VITE_CLIENT_PORT) || 3000;
const serverPort = Number(process.env.VITE_SERVER_PORT) || 3001;

export default defineConfig({
  plugins: [react()],
  server: {
    port: clientPort,
    proxy: {
      '/api': {
        target: `http://localhost:${serverPort}`,
        changeOrigin: true
      },
      '/gateway-ws': {
        target: `ws://localhost:${serverPort}`,
        ws: true
      }
    }
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './src/__tests__/setup.js'
  }
});
