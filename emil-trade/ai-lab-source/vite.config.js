import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
export default defineConfig({
    // Relative asset paths so the built SPA can be served from any sub-path
    // (it is embedded in the Raptor terminal under /ai-lab/).
    base: './',
    plugins: [react()],
    server: {
        port: 3000,
        host: true,
        proxy: {
            '/api': { target: 'http://localhost:8000', changeOrigin: true },
            '/ws': { target: 'ws://localhost:8000', ws: true },
        },
    },
    build: {
        outDir: 'dist',
        sourcemap: false,
        chunkSizeWarningLimit: 900,
        rollupOptions: {
            output: {
                manualChunks: {
                    react: ['react', 'react-dom', 'react-router-dom'],
                    charts: ['recharts'],
                    flow: ['reactflow'],
                    syntax: ['react-syntax-highlighter'],
                    query: ['@tanstack/react-query'],
                },
            },
        },
    },
});
