import { fileURLToPath } from 'node:url'
import { mergeConfig, defineConfig, configDefaults } from 'vitest/config'
import viteConfig from './vite.config'

export default mergeConfig(
  viteConfig,
  defineConfig({
    test: {
      environment: 'jsdom',
      exclude: [...configDefaults.exclude, 'e2e/**'],
      root: fileURLToPath(new URL('./', import.meta.url)),
    },
    // 服务端渲染
    server: {
      host: '0.0.0.0', // 允许外部访问
      port: 3000,
      open: true, // 自动打开浏览器
      // 如果需要代理到其他服务器
      proxy: {
        '/api': {
          target: 'http://172.16.12.93:80',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api/, '')
        }
      }
    }
  }),
)
