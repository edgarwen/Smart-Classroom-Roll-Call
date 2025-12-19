
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  // 使用相对路径，确保在 github.io/repo-name/ 下资源加载正确
  base: './', 
  define: {
    // 兼容 GitHub Actions 中的环境变量注入
    'process.env.API_KEY': JSON.stringify(process.env.VITE_API_KEY || process.env.API_KEY)
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    sourcemap: false
  },
  server: {
    host: true
  }
});
