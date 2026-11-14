import { Star } from "lucide-react";
import { Avatar } from "@/components/ui/misc";
import { Stars } from "@/components/Stars";
import type { PublicBarbershop } from "./api";

const monthFmt = new Intl.DateTimeFormat("pt-BR", { month: "short", year: "numeric" });

/** "4,8" */
export const formatRating = (n: number) => n.toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 });

/** Nota pequena ao lado do nome do serviço */
export function RatingInline({ rating }: { rating: { average: number; count: number } | null }) {
  if (!rating) return null;
  return (
    <span className="inline-flex items-center gap-0.5 text-xs font-medium text-zinc-600">
      <Star className="size-3 fill-amber-400 text-amber-400" />
      {formatRating(rating.average)}
      <span className="font-normal text-zinc-400">({rating.count})</span>
    </span>
  );
}

/** Seção "O que dizem os clientes" na página da barbearia */
export function ReviewsSection({ reviews, showProfessional }: { reviews: PublicBarbershop["reviews"]; showProfessional: boolean }) {
  if (!reviews.count || reviews.average === null) return null;
  return (
    <section id="avaliacoes" className="mt-8 scroll-mt-4">
      <div className="mb-3 flex items-end justify-between gap-3">
        <h2 className="text-lg font-semibold">Avaliações</h2>
        <div className="flex items-center gap-2 text-sm">
          <span className="text-2xl font-semibold tabular-nums">{formatRating(reviews.average)}</span>
          <div>
            <Stars value={reviews.average} className="text-sm" />
            <p className="text-xs text-zinc-500">
              {reviews.count} avaliaç{reviews.count === 1 ? "ão" : "ões"}
            </p>
          </div>
        </div>
      </div>
      <div className="space-y-2">
        {reviews.latest.map((r) => (
          <div key={r.id} className="rounded-2xl border border-zinc-200/80 bg-white p-4 shadow-xs">
            <div className="flex items-center gap-3">
              <Avatar name={r.clientName} className="size-9 text-xs" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{r.clientName}</p>
                <p className="truncate text-xs text-zinc-500">
                  {r.service}
                  {showProfessional && ` com ${r.professional.split(" ")[0]}`} · {monthFmt.format(new Date(r.createdAt))}
                </p>
              </div>
              <Stars value={r.rating} className="text-sm" />
            </div>
            {r.comment && <p className="mt-2.5 text-sm leading-relaxed whitespace-pre-line text-zinc-700">{r.comment}</p>}
          </div>
        ))}
      </div>
    </section>
  );
}
