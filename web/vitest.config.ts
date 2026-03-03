import { defineConfig } from "vitest/config"
import path from "path"
import react from "@vitejs/plugin-react"

export default defineConfig({
    plugins: [react()],
    resolve: {
        alias: {
            "@": path.resolve(__dirname, "./src"),
        },
    },
    test: {
        globals: true,
        environment: "jsdom",
        setupFiles: ["./src/test/setup.ts"],
        include: ["tests/components/**/*.test.ts?(x)", "src/**/*.test.ts?(x)", "src/**/*.spec.ts?(x)"],
        exclude: ["src/tests/**", "tests/e2e/**", "node_modules/**", "dist/**"],
    },
})
