import react from "@vitejs/plugin-react";
import path from "path";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react()],
  css: {
    preprocessorOptions: {
      less: {
        javascriptEnabled: true,
      },
    },
  },
  define: {
    "process.env": process.env,
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes("node_modules")) return;

          if (id.includes("/node_modules/@radix-ui/")) {
            return "vendor-radix";
          }
          if (id.includes("/node_modules/lucide-react/")) {
            return "vendor-icons";
          }
          if (id.includes("/node_modules/@dnd-kit/")) {
            return "vendor-dnd";
          }
          if (id.includes("/node_modules/date-fns/")) {
            return "vendor-date";
          }
          if (
            id.includes("/node_modules/axios/") ||
            id.includes("/node_modules/socket.io-client/")
          ) {
            return "vendor-network";
          }
          if (id.includes("/node_modules/nuqs/")) {
            return "vendor-url-state";
          }
        },
      },
    },
  },
  server: {
    // cho phép truy cập từ subdomain cụ thể
    host: "0.0.0.0",
    port: 3002,
    strictPort: true,
    proxy: {
      "/socket.io": {
        target: "http://localhost:8080",
        changeOrigin: true,
        ws: true,
      },
    },
  },
  preview: {
    host: "0.0.0.0",
    port: 3002,
    // nếu cần HTTPS, bật phần này:
    // https: {
    //   key: fs.readFileSync("./certs/localhost.key"),
    //   cert: fs.readFileSync("./certs/localhost.crt"),
    // }
  },
});
