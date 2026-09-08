import { defineConfig } from "vite";

export default defineConfig({
    build: {
        outDir: "dist",
        emptyOutDir: false,

        rollupOptions: {
            input: "src/popup.ts",

            output: {
                entryFileNames: "popup.js",
                format: "iife"
            }
        }
    }
});
