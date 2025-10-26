/*import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
})
*/
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      // 代理所有以/api开头的请求
      '/api': {
        target: 'http://8.148.191.101',  // 你的后端服务器地址
        changeOrigin: true,              // 需要虚拟托管站点
        rewrite: (path) => path.replace(/^\/api/, '') // 可选，重写路径
      },
      // 如果需要代理其他路径，可以继续添加规则
      '/other-api': {
        target: 'http://8.148.191.101',
        changeOrigin: true
      }
    }
  }
})
