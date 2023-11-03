/// <reference types="vitest" />
/// <reference types="vite/client" />

import { defineConfig, loadEnv } from "vite";
import { ViteImageOptimizer } from "vite-plugin-image-optimizer";
import react from "@vitejs/plugin-react";
import { resolve } from "path";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  return {
    define: {
      "process.env": env,
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
          main: resolve(__dirname, "index.html"),
        },
      },
    },
    server: {
      proxy: {
        "/assets": {
          target: env.FRONT_URL, // Change to the appropriate URL
          changeOrigin: true,
        },
        "/i18n": {
          target: env.FRONT_URL, // Replace with your backend server URL
          changeOrigin: true,
          onProxyReq(proxyReq) {
            // Add CORS headers to the proxy request
            proxyReq.setHeader("Origin", env.FRONT_URL); // Replace with your frontend URL
            proxyReq.setHeader("Access-Control-Allow-Origin", env.FRONT_URL); // Replace with your frontend URL
            proxyReq.setHeader(
              "Access-Control-Allow-Methods",
              "GET, POST, OPTIONS, PUT, DELETE"
            );
            proxyReq.setHeader(
              "Access-Control-Allow-Headers",
              "origin, x-requested-with, content-type"
            );
          },
        },
      },
    },
  };
});
