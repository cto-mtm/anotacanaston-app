import { defineConfig } from 'vitest/config'
import vue from '@vitejs/plugin-vue'
import tailwindcss from '@tailwindcss/vite'

const tailscaleHost = process.env.TAILSCALE_HOST
const tailscalePort = process.env.TAILSCALE_PORT
  ? Number(process.env.TAILSCALE_PORT)
  : undefined

export default defineConfig({
  plugins: [vue(), tailwindcss()],
  // Capacitor loads from capacitor://localhost and needs relative paths;
  // web hosting needs absolute paths so SPA deep-links resolve assets correctly.
  base: process.env.CAPACITOR_BUILD ? './' : '/',
  build: { outDir: 'dist' },
  server: {
    host: '0.0.0.0',
    port: tailscaleHost ? 51738 : 5173,
    allowedHosts: true,
    hmr: tailscaleHost
      ? { protocol: 'wss', host: tailscaleHost, clientPort: tailscalePort }
      : undefined,
  },
  test: {
    environment: 'node',
  },
})
