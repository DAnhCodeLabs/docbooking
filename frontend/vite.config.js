import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import path from "path";
import { defineConfig } from "vite";

export default defineConfig({
  corePlugins: {
    preflight: false,
  },
  plugins: [react(), tailwindcss()],

  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },

  server: {
    host: true, // Cho phép LAN + ngrok
    port: 3000,
    open: true,
    cors: true,

    // Proxy tất cả /api về backend local (linh hoạt nhất)
    proxy: {
      "/api": {
        target: "http://127.0.0.1:8000",
        changeOrigin: true,
        secure: false,
      },
    },

    // Fix lỗi "host not allowed" của ngrok
    allowedHosts: [
      "localhost",
      "127.0.0.1",
      ".ngrok-free.dev", // ← wildcard cho tất cả ngrok (rất tiện!)
    ],

    // HMR hoạt động tốt trên ngrok https
    hmr: {
      clientPort: 443,
    },
  },

  optimizeDeps: {
    include: [
      "antd",
      "@ant-design/icons",
      "react",
      "react-dom",
      "react-router-dom",
    ],
  },

  build: {
    sourcemap: process.env.NODE_ENV !== "production",
  },
});
