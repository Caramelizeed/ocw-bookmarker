import { defineConfig } from "vite";

export default defineConfig({
    build: {
        outDir: "dist",
        emptyOutDir: true,

        rollupOptions: {
            input: "src/content.ts",

            output: {
                entryFileNames: "content.js",
                format: "iife"
            }
        }
    }
});
