import { defineConfig } from "tsup";

export default defineConfig({
  // seed compilado junto para rodar em produção: node dist/seed.js
  entry: { server: "src/server.ts", seed: "prisma/seed.ts" },
  format: ["esm"],
  target: "node22",
  clean: true,
  sourcemap: true,
  // o pacote compartilhado é TS puro: entra no bundle
  noExternal: ["@navalha/shared"],
});
