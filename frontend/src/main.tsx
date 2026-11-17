import React from "react";
import ReactDOM from "react-dom/client";
import { QueryClientProvider } from "@tanstack/react-query";
import { RouterProvider } from "react-router-dom";
import { Toaster } from "sonner";
import { queryClient } from "@/lib/query-client";
import { router } from "@/router";
import { ConfirmHost } from "@/components/ConfirmHost";
import { registerServiceWorker } from "@/lib/push";
import { reloadForNewVersion } from "@/lib/stale-build";
import "./index.css";

registerServiceWorker();

// arquivo de uma versão antiga não existe mais (houve deploy): recarrega para pegar a nova
window.addEventListener("vite:preloadError", (e) => {
  if (reloadForNewVersion()) e.preventDefault();
});

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
      <Toaster position="top-center" richColors closeButton />
      <ConfirmHost />
    </QueryClientProvider>
  </React.StrictMode>,
);
