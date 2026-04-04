import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import fs from "node:fs";

const projectRoot = fs.realpathSync(process.cwd());

const manualVendorChunk = (id: string) => {
  const n = id.replaceAll("\\", "/");
  if (!n.includes("node_modules")) return undefined;

  // Heavy SDK — isolated, only loaded by Room page
  if (n.includes("agora-rtc-sdk-ng")) return "agora-vendor";
  // Heavy SDK — isolated, only loaded by Register face-verify
  if (n.includes("@mediapipe")) return "vision-vendor";

  // UI framework (biggest portion) — changes less often than app code
  if (n.includes("/antd/") || n.includes("/@ant-design/") || /\/rc-[a-z]/.test(n))
    return "antd-vendor";

  // React core — almost never changes between deploys
  if (n.includes("/react-dom/") || n.includes("/react/") || n.includes("/scheduler/"))
    return "react-vendor";

  // Everything else (axios, i18next, dayjs, react-router, tanstack, etc.)
  return "vendor";
};

export default defineConfig({
  root: projectRoot,
  plugins: [react()],
  esbuild: {
    // Strip console.debug & console.info from production builds
    drop: process.env.NODE_ENV === "production" ? ["debugger"] : [],
    pure: process.env.NODE_ENV === "production" ? ["console.debug", "console.info"] : [],
  },
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
