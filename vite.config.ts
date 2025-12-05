import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

// Vite 設定：用函式拿到 mode，再設定 base & 環境變數
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '', '');

  return {
    // GitHub Pages 子路徑
    base: '/INDI-HUNTER/',

    // 保留你原本的開發伺服器設定
    server: {
      port: 3000,
      host: '0.0.0.0',
    },

    plugins: [react()],

    define: {
      'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
    },

    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
  };
});

