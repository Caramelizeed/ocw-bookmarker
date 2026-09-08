import { defineConfig } from "vite";

export default defineConfig({
    build: {
        outDir: "dist",
        emptyOutDir: false,

        rollupOptions: {
            input: "src/background.ts",

            output: {
                entryFileNames: "background.js",
                format: "iife"
            }
        }
    }
});
