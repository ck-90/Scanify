import { defineConfig } from "vitest/config";

// Config aparte para que las pruebas no carguen el plugin de React Router.
export default defineConfig({
  test: { include: ["tests/**/*.test.ts"] },
});
