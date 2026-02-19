import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import fs from "node:fs";

const projectRoot = fs.realpathSync(process.cwd());

export default defineConfig({
  root: projectRoot,
  plugins: [react()],
  resolve: {
    // Keep module/id paths stable when working in a Windows junction/symlink directory.
    preserveSymlinks: true,
  },
  server: {
    port: 5173,
  },
});
