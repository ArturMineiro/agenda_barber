import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { fileURLToPath, URL } from "node:url";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
  build: {
    rollupOptions: {
      output: {
        // bibliotecas mudam pouco: ficam num arquivo próprio e continuam no cache do celular a cada deploy
        manualChunks(id) {
          if (/node_modules[\\/](react|react-dom|scheduler|react-router|react-router-dom)[\\/]/.test(id)) return "react";
          if (/node_modules[\\/](@tanstack|sonner)[\\/]/.test(id)) return "query";
        },
      },
    },
  },
  server: {
    port: 5173,
    // mesma origem para o cookie de sessão funcionar sem dor de cabeça
    proxy: { "/api": "http://localhost:3333", "/uploads": "http://localhost:3333" },
  },
});
