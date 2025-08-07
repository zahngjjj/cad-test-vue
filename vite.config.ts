import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueJsx from '@vitejs/plugin-vue-jsx'
import vueDevTools from 'vite-plugin-vue-devtools'
import { fileURLToPath, URL } from 'node:url'

export default defineConfig({
  plugins: [vue(), vueJsx(), vueDevTools()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    }
  },
  assetsInclude: ['**/*.wasm'],
  server: {
    host: '0.0.0.0', // 允许外部访问
    port: 5173, // 指定端口
    open: true, // 自动打开浏览器
    fs: {
      allow: ['..', './node_modules/@mlightcad/libredwg-web']
    }
  },
  optimizeDeps: {
    exclude: ['@mlightcad/libredwg-web']
  }
})
