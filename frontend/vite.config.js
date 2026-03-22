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
    host: true, // Mở kết nối mạng LAN
    port: 3000,
    open: true,
    cors: true,
    proxy: {
      "/api": {
        target: "http://127.0.0.1:8000",
        changeOrigin: true, //
      },
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
