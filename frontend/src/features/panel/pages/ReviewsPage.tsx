import { Eye, EyeOff, MessageCircle, Star } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Avatar, EmptyState, PageHeader, Skeleton } from "@/components/ui/misc";
import { Stars } from "@/components/Stars";
import { cn, formatDateOnly, whatsappLink } from "@/lib/utils";
import { useBarbershop, useReviews, useSetReviewHidden } from "../api";

const fmt = (n: number) => n.toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
const plural = (n: number) => `${n} ${n === 1 ? "avaliação" : "avaliações"}`;

export function ReviewsPage() {
  const { data, isLoading } = useReviews();
  const { data: shop } = useBarbershop();
  const setHidden = useSetReviewHidden();
  const isTeam = shop?.teamType === "TEAM";

  return (
    <div className="space-y-5">
      <PageHeader title="Avaliações" description="O que os clientes acharam do atendimento." />

      {isLoading ? (
        <Skeleton className="h-36" />
      ) : !data?.count || data.average === null ? (
        <EmptyState
          icon={<Star />}
          title="Nenhuma avaliação ainda"
          description="Depois do atendimento, o cliente avalia pelo link do agendamento. Na Agenda, use “Pedir avaliação” no menu do horário para mandar o link pelo WhatsApp."
        />
      ) : (
        <>
          <div className="flex flex-col gap-5 rounded-2xl border border-zinc-200/80 bg-white p-5 sm:flex-row sm:items-center">
            <div className="text-center sm:w-40">
              <p className="text-5xl font-semibold tracking-tight tabular-nums">{fmt(data.average)}</p>
              <Stars value={data.average} className="mt-1 text-lg" />
              <p className="mt-1 text-sm text-zinc-500">{plural(data.count)}</p>
            </div>
            <div className="flex-1 space-y-1.5">
              {([5, 4, 3, 2, 1] as const).map((n) => {
                const c = data.distribution[n];
                return (
                  <div key={n} className="flex items-center gap-2 text-sm">
                    <span className="w-3 text-zinc-500 tabular-nums">{n}</span>
                    <Star className="size-3.5 fill-amber-400 text-amber-400" />
                    <div className="h-2 flex-1 overflow-hidden rounded-full bg-zinc-100">
                      <div className="h-full rounded-full bg-amber-400" style={{ width: `${(c / data.count) * 100}%` }} />
                    </div>
                    <span className="w-8 text-right text-zinc-500 tabular-nums">{c}</span>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="space-y-2">
            {data.reviews.map((r) => (
              <div key={r.id} className={cn("rounded-2xl border border-zinc-200/80 bg-white p-4", r.hidden && "opacity-60")}>
                <div className="flex items-start gap-3">
                  <Avatar name={r.clientName} className="size-10" />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                      <p className="truncate font-medium">{r.clientName}</p>
                      <Stars value={r.rating} className="text-sm" />
                      {r.hidden && <Badge tone="neutral">Oculta na página</Badge>}
                    </div>
                    <p className="truncate text-xs text-zinc-500">
                      {r.service.name}
                      {isTeam && ` · ${r.professional.name}`} · atendido em {formatDateOnly(r.appointment.startsAt)}
                    </p>
                  </div>
                </div>
                {r.comment && <p className="mt-3 text-sm leading-relaxed whitespace-pre-line text-zinc-700">{r.comment}</p>}
                <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2 border-t border-zinc-100 pt-3 text-xs font-medium">
                  <a
                    href={whatsappLink(r.appointment.clientPhone, `Olá ${r.clientName.split(" ")[0]}! Obrigado pela avaliação 🙏`)}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-emerald-700 hover:underline"
                  >
                    <MessageCircle className="size-3.5" /> Responder no WhatsApp
                  </a>
                  <button
                    onClick={() => setHidden.mutate({ id: r.id, hidden: !r.hidden })}
                    disabled={setHidden.isPending}
                    className="inline-flex items-center gap-1 text-zinc-600 hover:underline"
                  >
                    {r.hidden ? <Eye className="size-3.5" /> : <EyeOff className="size-3.5" />}
                    {r.hidden ? "Mostrar na página" : "Ocultar da página"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
