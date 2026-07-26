import { defineConfig } from 'vite'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = dirname(fileURLToPath(import.meta.url))

export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        main: resolve(root, 'index.html'),
        dimensions: resolve(root, 'dimensions.html'),
        cosmic: resolve(root, 'cosmic.html'),
      },
    },
  },
  plugins: [
    {
      name: 'scale-clean-urls',
      configureServer(server) {
        server.middlewares.use((req, _res, next) => {
          if (req.url === '/dimensions' || req.url === '/dimensions/') {
            req.url = '/dimensions.html'
          }
          if (req.url === '/cosmic' || req.url === '/cosmic/') {
            req.url = '/cosmic.html'
          }
          next()
        })
      },
    },
  ],
})
