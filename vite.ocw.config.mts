import { defineConfig } from "vite";

export default defineConfig({
    build: {
        outDir: "dist",
        emptyOutDir: false,

        rollupOptions: {
            input: "src/ocw.ts",

            output: {
                entryFileNames: "ocw.js",
                format: "iife"
            }
        }
    }
});
