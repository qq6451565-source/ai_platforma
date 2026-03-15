import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import fs from "node:fs";

const projectRoot = fs.realpathSync(process.cwd());

const manualVendorChunk = (id: string) => {
  const normalizedId = id.replaceAll("\\", "/");
  if (!normalizedId.includes("node_modules")) return undefined;
  if (normalizedId.includes("agora-rtc-sdk-ng")) return "agora-vendor";
  if (normalizedId.includes("@mediapipe")) return "vision-vendor";
  return "vendor";
};

export default defineConfig({
  root: projectRoot,
  plugins: [react()],
  build: {
    reportCompressedSize: false,
    chunkSizeWarningLimit: 1500,
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
