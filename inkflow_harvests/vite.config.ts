import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig, loadEnv} from 'vite';

export default defineConfig(({mode}) => {
  const env = loadEnv(mode, '.', '');
  return {
    base: './',
    plugins: [react(), tailwindcss()],
    define: {
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // 添加代理配置
      proxy: {
        '/api': 'http://localhost:3000',   // 将所有 /api 请求转发到后端
        // 本地预览时把 /harvests/* 转发到 AI Core worker（与生产 Pages Function 行为一致）
        '/harvests': {
          target: 'https://harvests-api.inkflowapp.workers.dev',
          changeOrigin: true,
        },
      },
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify — file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Exclude Chrome profile dirs from file watcher to avoid EBUSY errors
      watch: {
        ignored: ['**/profiles/**', '**/node_modules/**', '**/data/**'],
      },
    },
  };
});
