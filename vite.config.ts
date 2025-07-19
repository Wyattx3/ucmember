import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // Load environment variables for potential future use
  loadEnv(mode, process.cwd(), '')
  
  return {
    plugins: [react()],
    
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
    
    // Build optimizations for production
    build: {
      target: 'es2018',
      outDir: 'dist',
      assetsDir: 'assets',
      sourcemap: mode === 'development',
      minify: mode === 'production' ? 'esbuild' : false,
      rollupOptions: {
        output: {
          manualChunks: {
            vendor: ['react', 'react-dom'],
            animations: ['framer-motion'],
            ui: ['styled-components', 'daisyui']
          }
        }
      },
      chunkSizeWarningLimit: 1000
    },
    
    // Performance optimizations
    optimizeDeps: {
      include: ['react', 'react-dom', 'framer-motion']
    },
    
    server: {
      port: 3000,
      host: true,
      cors: true,
      proxy: {
        '/api/placid': {
          target: 'https://api.placid.app',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api\/placid/, ''),
          secure: true,
          headers: {
            'Origin': 'https://api.placid.app'
          }
        }
      }
    },
    
    // Preview configuration
    preview: {
      port: 4173,
      host: true
    },
    
    // Environment variables
    define: {
      __APP_VERSION__: JSON.stringify(process.env.npm_package_version || '1.0.0'),
      __BUILD_TIME__: JSON.stringify(new Date().toISOString()),
      __MODE__: JSON.stringify(mode)
    },
    
    // Base URL for production
    base: mode === 'production' ? '/' : '/'
  }
})
