import { Link } from "react-router-dom";
import { Eye } from "lucide-react";
import type { BarbershopStatus } from "@navalha/shared";

const TEXT: Partial<Record<BarbershopStatus, string>> = {
  PENDING: "Só você está vendo. A página fica no ar para os clientes assim que o cadastro for aprovado.",
  SUSPENDED: "A barbearia está suspensa: os clientes não conseguem abrir esta página agora.",
  REJECTED: "O cadastro não foi aprovado: os clientes não conseguem abrir esta página.",
};

/** Faixa fixa no topo da página pública em modo prévia (antes da aprovação) */
export function PreviewBanner({ status }: { status: BarbershopStatus }) {
  return (
    // cores fixas: a escala zinc muda com o fundo escolhido (no escuro, zinc-900 vira quase branco)
    <div className="sticky top-0 z-30 border-b border-white/10 text-white backdrop-blur" style={{ backgroundColor: "rgb(24 24 27 / 0.95)" }}>
      <div className="mx-auto flex max-w-xl items-center gap-3 px-4 py-2.5">
        <Eye className="size-4 shrink-0 text-amber-400" />
        <p className="min-w-0 flex-1 text-xs leading-snug sm:text-sm">
          <strong className="font-semibold">Prévia da sua página.</strong> {TEXT[status] ?? TEXT.PENDING}
        </p>
        <Link to="/painel" className="shrink-0 rounded-lg bg-white/10 px-2.5 py-1.5 text-xs font-semibold ring-1 ring-white/20 hover:bg-white/20">
          Painel
        </Link>
      </div>
    </div>
  );
}
