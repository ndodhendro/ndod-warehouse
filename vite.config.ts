import { defineConfig } from "vite"
import react from "@vitejs/plugin-react"
import { VitePWA } from "vite-plugin-pwa"

const repo = process.env.GITHUB_REPOSITORY?.split("/")[1]
const base = process.env.GITHUB_PAGES === "true" && repo ? `/${repo}/` : "/"

export default defineConfig({
  base,
  server: {
    host: true,
    port: 5173,
  },
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["favicon-32.png", "apple-touch-icon.png", "pwa-192.png", "pwa-512.png", "pwa-512-maskable.png"],
      manifest: {
        id: "/",
        name: "Gudang Ndod",
        short_name: "Gudang",
        description: "Cek stok dan lokasi tas, botol minum, serta kotak makan di dalam dus.",
        lang: "id",
        dir: "ltr",
        start_url: "/",
        scope: "/",
        display: "standalone",
        background_color: "#101412",
        theme_color: "#101412",
        categories: ["business", "productivity"],
        icons: [
          { src: "pwa-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
          { src: "pwa-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
          { src: "pwa-512-maskable.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
        ],
      },
      workbox: {
        navigateFallback: "index.html",
        globPatterns: ["**/*.{js,css,html,svg,png,woff2,webmanifest}"],
      },
    }),
  ],
})
