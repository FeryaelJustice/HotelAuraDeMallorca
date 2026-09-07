/// <reference types="vitest" />
/// <reference types="vite/client" />

import { defineConfig, loadEnv } from "vite";
import { ViteImageOptimizer } from "vite-plugin-image-optimizer";
import react from "@vitejs/plugin-react";
import { resolve } from "path";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");

  // Helper to safely sanitize env vars (stripping surrounding quotes or accidental whitespace)
  const cleanEnv = (val: string | undefined, fallback: string = ""): string => {
    const raw = val !== undefined && val !== null && val !== "" ? val : fallback;
    return String(raw).trim().replace(/^["']|["']$/g, "").replace(/\/+$/, "");
  };

  return {
    define: {
      "process.env.NODE_ENV": JSON.stringify(mode),
      "process.env.FRONT_URL": JSON.stringify(cleanEnv(env.FRONT_URL, "https://hotel-aura-de-mallorca.vercel.app")),
      "process.env.TRANSLATIONS_DATA_URL": JSON.stringify(cleanEnv(env.TRANSLATIONS_DATA_URL, "https://hotel-aura-de-mallorca.vercel.app")),
      "process.env.FRONT_ASSETS_URL": JSON.stringify(cleanEnv(env.FRONT_ASSETS_URL, "https://hotel-aura-de-mallorca.vercel.app/assets")),
      "process.env.API_URL": JSON.stringify(cleanEnv(env.API_URL, "https://hotel-aura-de-mallorca-backend-qkh3.onrender.com")),
      "process.env.reCAPTCHA_SITE_KEY": JSON.stringify(cleanEnv(env.reCAPTCHA_SITE_KEY, "6Le_wa4tAAAAAJurghi0g584K9-TBNOod089b5wM")),
      "process.env.STRIPE_PUBLISHABLE_KEY": JSON.stringify(cleanEnv(env.STRIPE_PUBLISHABLE_KEY, "")),
      "process.env.APP_NAME": JSON.stringify(cleanEnv(env.APP_NAME, "Hotel Aura de Mallorca")),
      "process.env.OPENWEATHERMAP_API_KEY": JSON.stringify(cleanEnv(env.OPENWEATHERMAP_API_KEY, "")),
      "process.env.OPENWEATHERMAP_BASE_URL": JSON.stringify(cleanEnv(env.OPENWEATHERMAP_BASE_URL, "https://api.openweathermap.org")),
      "process.env.ACCUWEATHER_API_KEY": JSON.stringify(cleanEnv(env.ACCUWEATHER_API_KEY, "")),
      "process.env.ACCUWEATHER_BASE_URL": JSON.stringify(cleanEnv(env.ACCUWEATHER_BASE_URL, "https://dataservice.accuweather.com")),
      "process.env": "{}",
    },
    plugins: [react(), ViteImageOptimizer({})],
    test: {
      globals: true,
      environment: "jsdom",
      css: true,
      setupFiles: "./src/test/setup.ts",
    },
    resolve: {
      alias: {
        "@": "./",
      },
    },
    build: {
      rollupOptions: {
        input: {
          main: resolve(import.meta.dirname, "index.html"),
        },
        output: {
          entryFileNames: `assets/[name]-[hash].js`,
          chunkFileNames: `assets/[name]-[hash].js`,
          assetFileNames: `assets/[name]-[hash].[ext]`,
          manualChunks(id: string) {
            if (id.includes("node_modules")) {
              if (id.includes("react") || id.includes("react-dom") || id.includes("react-router-dom")) {
                return "vendor-react";
              }
              if (id.includes("bootstrap") || id.includes("react-bootstrap")) {
                return "vendor-bootstrap";
              }
              if (id.includes("@fortawesome") || id.includes("react-icons")) {
                return "vendor-icons";
              }
              if (id.includes("@stripe")) {
                return "vendor-stripe";
              }
              if (id.includes("i18next")) {
                return "vendor-i18n";
              }
            }
          },
        },
      },
    },
    server: {
      proxy: {
        "/assets": {
          target: env.FRONT_ASSETS_URL,
          changeOrigin: true,
        },
      },
    },
  };
});
