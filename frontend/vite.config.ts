import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import fs from "node:fs";

const projectRoot = fs.realpathSync(process.cwd());

const manualVendorChunk = (id: string) => {
  const normalizedId = id.replaceAll("\\", "/");
  if (!normalizedId.includes("node_modules")) return undefined;
  if (normalizedId.includes("agora-rtc-sdk-ng")) return "agora-vendor";
  if (normalizedId.includes("@mediapipe")) return "vision-vendor";
  if (normalizedId.includes("@ant-design/icons")) return "icons-vendor";
  if (normalizedId.includes("/antd/")) return "antd-vendor";
  if (normalizedId.includes("@ant-design") || normalizedId.includes("@emotion")) return "style-vendor";
  if (normalizedId.includes("/rc-")) return "rc-vendor";
  if (normalizedId.includes("@tanstack/react-query")) return "query-vendor";
  if (normalizedId.includes("react-i18next") || normalizedId.includes("i18next")) return "i18n-vendor";
  if (normalizedId.includes("@react-oauth")) return "auth-vendor";
  if (
    normalizedId.includes("react-router-dom")
    || normalizedId.includes("/react-router/")
    || normalizedId.includes("/react-dom/")
    || normalizedId.includes("/react/")
    || normalizedId.includes("/scheduler/")
  ) {
    return "react-vendor";
  }
  return "vendor";
};

export default defineConfig({
  root: projectRoot,
  plugins: [react()],
  build: {
    reportCompressedSize: false,
    chunkSizeWarningLimit: 1400,
    rollupOptions: {
      output: {
        manualChunks: manualVendorChunk,
      },
    },
  },
  resolve: {
    // Keep module/id paths stable when working in a Windows junction/symlink directory.
    preserveSymlinks: true,
  },
  server: {
    port: 5173,
  },
  test: {
    environment: "node",
    globals: false,
    include: ["src/**/*.test.ts"],
  },
});
