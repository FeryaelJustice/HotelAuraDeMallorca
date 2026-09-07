/// <reference types="vitest" />
/// <reference types="vite/client" />

import { defineConfig, loadEnv } from "vite";
import { ViteImageOptimizer } from "vite-plugin-image-optimizer";
import react from "@vitejs/plugin-react";
import { resolve } from "path";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");

  // Expose ONLY safe client-side environment variables to prevent leaking OS/system secrets
  const safeClientEnv = {
    NODE_ENV: JSON.stringify(mode),
    FRONT_URL: JSON.stringify(env.FRONT_URL || "http://hotelaurademallorca.com"),
    TRANSLATIONS_DATA_URL: JSON.stringify(env.TRANSLATIONS_DATA_URL || "https://hotelaurademallorca.com"),
    FRONT_ASSETS_URL: JSON.stringify(env.FRONT_ASSETS_URL || "https://hotelaurademallorca.com/assets"),
    API_URL: JSON.stringify(env.API_URL || "https://hotelaurademallorca.com"),
    reCAPTCHA_SITE_KEY: JSON.stringify(env.reCAPTCHA_SITE_KEY || "6Le_wa4tAAAAAJurghi0g584K9-TBNOod089b5wM"),
    STRIPE_PUBLISHABLE_KEY: JSON.stringify(env.STRIPE_PUBLISHABLE_KEY || ""),
    APP_NAME: JSON.stringify(env.APP_NAME || "Hotel Aura de Mallorca"),
    OPENWEATHERMAP_API_KEY: JSON.stringify(env.OPENWEATHERMAP_API_KEY || ""),
    OPENWEATHERMAP_BASE_URL: JSON.stringify(env.OPENWEATHERMAP_BASE_URL || "https://api.openweathermap.org"),
    ACCUWEATHER_API_KEY: JSON.stringify(env.ACCUWEATHER_API_KEY || ""),
    ACCUWEATHER_BASE_URL: JSON.stringify(env.ACCUWEATHER_BASE_URL || "https://dataservice.accuweather.com"),
  };

  return {
    define: {
      "process.env": safeClientEnv,
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
