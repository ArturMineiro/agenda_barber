import { Link } from "react-router-dom";
import { Logo } from "@/components/Logo";

export function NotFoundPage() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-4 px-6 text-center">
      <Logo />
      <h1 className="text-xl font-semibold">Página não encontrada</h1>
      <Link to="/" className="text-sm font-medium underline underline-offset-4">
        Voltar ao início
      </Link>
    </div>
  );
}
