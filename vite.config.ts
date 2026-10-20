import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    // В разработке фронтенд на 5173, API на 3000 — проксируем, чтобы cookie
    // сессии считались своими и не упирались в запрет межсайтовых запросов.
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: false,
      },
    },
  },
})
