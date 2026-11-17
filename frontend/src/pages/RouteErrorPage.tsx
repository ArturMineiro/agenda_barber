import { useEffect, useState } from "react";
import { Link, isRouteErrorResponse, useRouteError } from "react-router-dom";
import { RefreshCw } from "lucide-react";
import { Logo } from "@/components/Logo";
import { Button, buttonVariants } from "@/components/ui/button";
import { isStaleBuildError, reloadForNewVersion } from "@/lib/stale-build";
import { NotFoundPage } from "./NotFoundPage";

/** Tela de erro do app (no lugar da tela padrão do React Router) */
export function RouteErrorPage() {
  const error = useRouteError();
  const stale = isStaleBuildError(error);
  const [reloading, setReloading] = useState(stale);

  useEffect(() => {
    if (stale && !reloadForNewVersion()) setReloading(false);
  }, [stale]);

  if (isRouteErrorResponse(error) && error.status === 404) return <NotFoundPage />;
  console.error(error);

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-4 bg-zinc-50 px-6 text-center">
      <Logo />
      {reloading ? (
        <p className="flex items-center gap-2 text-sm text-zinc-600">
          <RefreshCw className="size-4 animate-spin" /> Carregando a versão mais nova…
        </p>
      ) : (
        <>
          <div className="space-y-1">
            <h1 className="text-xl font-semibold">Algo deu errado</h1>
            <p className="max-w-sm text-sm text-zinc-600">
              {stale
                ? "O site foi atualizado enquanto você navegava. Recarregue a página para continuar."
                : "Não conseguimos abrir esta tela. Recarregue a página; se continuar, tente de novo em instantes."}
            </p>
          </div>
          <div className="flex gap-2">
            <Button onClick={() => window.location.reload()}>
              <RefreshCw className="size-4" /> Recarregar
            </Button>
            <Link to="/" className={buttonVariants({ variant: "outline" })}>
              Início
            </Link>
          </div>
        </>
      )}
    </div>
  );
}
