import * as React from "react";
import { Link } from "react-router-dom";
import { Clock, MessageCircle, Moon, Navigation, Sparkles } from "lucide-react";
import { APP_NAME } from "@navalha/shared";
import { Skeleton } from "@/components/ui/misc";
import { readableOn } from "@/lib/theme";
import { cn, formatDuration, formatMoney, whatsappLink } from "@/lib/utils";
import { Hero } from "./Hero";
import { usePublicQueue, type PublicBarbershop, type PublicQueueItem } from "./api";
import { ServiceSheet, type CatalogService } from "./Catalog";

/** "1h05" fica inteiro; "35" + "min" separados para o número aparecer grande */
function waitParts(min: number) {
  if (min < 60) return { value: String(min), unit: "min" };
  return { value: formatDuration(min), unit: "" };
}

function statusOf(p: PublicQueueItem) {
  if (!p.open) return "closed" as const;
  if (!p.inService && p.waiting === 0) return "free" as const;
  return "busy" as const;
}

/** Re-renderiza a cada 20s para o "há X s" */
function useNow(ms = 20_000) {
  const [now, setNow] = React.useState(Date.now());
  React.useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), ms);
    return () => clearInterval(t);
  }, [ms]);
  return now;
}

/**
 * Página pública no modo "ordem de chegada".
 * Responde em um segundo: quanto vou esperar, e com quem? O cliente não entra na fila pelo link.
 */
export function QueueView({ data, slug }: { data: PublicBarbershop; slug: string }) {
  const { barbershop: shop, services } = data;
  const [viewing, setViewing] = React.useState<CatalogService | null>(null);
  const { data: queue, isLoading, dataUpdatedAt } = usePublicQueue(slug, true);
  const now = useNow();
  const location = [shop.address, shop.city].filter(Boolean).join(", ");

  const open = (queue ?? []).filter((p) => p.open);
  const sorted = [...(queue ?? [])].sort((a, b) => {
    if (a.open !== b.open) return a.open ? -1 : 1;
    return a.estimatedWaitMinutes - b.estimatedWaitMinutes;
  });
  const best = open.length ? open.reduce((m, p) => (p.estimatedWaitMinutes < m.estimatedWaitMinutes ? p : m)) : null;
  const totalWaiting = open.reduce((s, p) => s + p.waiting, 0);
  const seconds = dataUpdatedAt ? Math.max(0, Math.round((now - dataUpdatedAt) / 1000)) : 0;
  // cor principal clara (ex.: dourado) não lê bem no branco: usa a cor de apoio
  const priceColor = readableOn(shop.primaryColor) === "#ffffff" ? shop.primaryColor : shop.secondaryColor;

  return (
    <>
      <Hero
        shop={shop}
        compact={false}
        badge={
          queue && (
            <span
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ring-1",
                open.length ? "bg-emerald-50 text-emerald-700 ring-emerald-200" : "bg-zinc-100 text-zinc-500 ring-zinc-200",
              )}
            >
              <span className={cn("size-1.5 rounded-full", open.length ? "animate-pulse bg-emerald-500" : "bg-zinc-400")} />
              {open.length ? "Aberto agora" : "Fechado agora"}
            </span>
          )
        }
      />

      <div className="mx-auto max-w-xl space-y-7 px-4 pt-5 pb-32">
        {/* Destaque: menor espera */}
        {isLoading ? (
          <Skeleton className="h-36 rounded-3xl" />
        ) : (
          <section className="relative overflow-hidden rounded-3xl bg-brand-2 p-5 text-brand-2-foreground shadow-lg">
            <div className="absolute -top-12 -right-12 size-40 rounded-full bg-brand opacity-30 blur-2xl" />
            <div className="relative">
              <div className="flex items-center justify-between">
                <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold tracking-widest uppercase opacity-80">
                  <span className="relative flex size-2">
                    <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                    <span className="relative inline-flex size-2 rounded-full bg-emerald-400" />
                  </span>
                  Fila ao vivo
                </span>
                <span className="text-[11px] opacity-60">{seconds < 10 ? "atualizado agora" : `há ${seconds}s`}</span>
              </div>

              {best ? (
                <>
                  <p className="mt-4 text-sm opacity-75">{best.estimatedWaitMinutes === 0 ? "Tem cadeira livre" : "Menor espera agora"}</p>
                  <div className="mt-0.5 flex items-end justify-between gap-4">
                    <p className="font-display text-5xl leading-none font-semibold tracking-tight">
                      {best.estimatedWaitMinutes === 0 ? (
                        "Agora"
                      ) : (
                        <>
                          ~{waitParts(best.estimatedWaitMinutes).value}
                          <span className="ml-1 text-xl font-medium opacity-80">{waitParts(best.estimatedWaitMinutes).unit}</span>
                        </>
                      )}
                    </p>
                    <div className="text-right">
                      <p className="text-2xl leading-none font-semibold tabular-nums">{totalWaiting}</p>
                      <p className="mt-1 text-[11px] opacity-70">{totalWaiting === 1 ? "pessoa esperando" : "pessoas esperando"}</p>
                    </div>
                  </div>
                  <p className="mt-3 text-sm opacity-90">
                    com <strong>{best.name.split(" ")[0]}</strong> · atendimento por ordem de chegada, é só chegar
                  </p>
                </>
              ) : (
                <div className="mt-4 flex items-center gap-3">
                  <Moon className="size-8 opacity-70" />
                  <div>
                    <p className="text-lg font-semibold">Ninguém atendendo agora</p>
                    <p className="text-sm opacity-75">Confira mais tarde ou chame no WhatsApp.</p>
                  </div>
                </div>
              )}
            </div>
          </section>
        )}

        {/* Barbeiros */}
        <section>
          <h2 className="mb-3 text-lg font-semibold">Escolha com quem cortar</h2>
          {isLoading ? (
            <div className="space-y-2.5">
              <Skeleton className="h-24 rounded-2xl" />
              <Skeleton className="h-24 rounded-2xl" />
            </div>
          ) : (
            <div className="space-y-2.5">
              {sorted.map((p) => (
                <BarberCard key={p.id} item={p} best={best?.id === p.id && open.length > 1} />
              ))}
            </div>
          )}
        </section>

        {/* Serviços */}
        {services.length > 0 && (
          <section>
            <h2 className="mb-3 text-lg font-semibold">Serviços e preços</h2>
            <div className="grid grid-cols-2 gap-2.5">
              {services.map((s) => (
                <div key={s.id} className="flex flex-col overflow-hidden rounded-2xl bg-white shadow-xs ring-1 ring-zinc-200/80">
                  {s.photos[0] && (
                    <button onClick={() => setViewing(s)} className="relative -mb-1 block aspect-[4/5] w-full" aria-label={`Ver fotos de ${s.name}`}>
                      <img src={s.photos[0].url} alt={s.name} width={900} height={1125} loading="lazy" decoding="async" className="size-full object-cover" />
                      {s.photos.length > 1 && (
                        <span className="absolute top-2 right-2 rounded-full bg-black/50 px-1.5 text-[10px] font-medium text-white">{s.photos.length} fotos</span>
                      )}
                    </button>
                  )}
                  <div className="flex flex-1 flex-col p-4">
                  <p className="leading-snug font-medium">{s.name}</p>
                  {s.description && <p className="mt-0.5 line-clamp-2 text-xs text-zinc-500">{s.description}</p>}
                  <div className="mt-auto flex items-end justify-between pt-3">
                    <span className="text-lg font-semibold" style={{ color: priceColor }}>
                      {formatMoney(s.priceCents)}
                    </span>
                    <span className="inline-flex items-center gap-1 text-[11px] text-zinc-500">
                      <Clock className="size-3" /> {formatDuration(s.durationMinutes)}
                    </span>
                  </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        <ServiceSheet service={viewing} onClose={() => setViewing(null)} />

        <p className="text-center text-xs text-zinc-400">
          Página por{" "}
          <Link to="/" className="font-medium hover:text-zinc-600">
            {APP_NAME}
          </Link>
        </p>
      </div>

      {/* Rodapé fixo: ações principais ao alcance do polegar */}
      {(location || shop.whatsapp) && (
        <div className="fixed inset-x-0 bottom-0 z-20 border-t border-zinc-200/70 bg-white/90 backdrop-blur-xl pb-safe">
          <div className="mx-auto flex max-w-xl gap-2 px-4 pt-3">
            {location && (
              <a
                href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(location)}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex h-12 flex-1 items-center justify-center gap-2 rounded-2xl bg-brand font-semibold text-brand-foreground shadow-md transition hover:brightness-110 active:scale-[0.98]"
              >
                <Navigation className="size-4" /> Como chegar
              </a>
            )}
            {shop.whatsapp && (
              <a
                href={whatsappLink(shop.whatsapp)}
                target="_blank"
                rel="noreferrer"
                aria-label="WhatsApp"
                className={cn(
                  "inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-emerald-500 font-semibold text-white shadow-md transition hover:bg-emerald-600 active:scale-[0.98]",
                  location ? "w-12" : "flex-1",
                )}
              >
                <MessageCircle className="size-5" />
                {!location && "WhatsApp"}
              </a>
            )}
          </div>
        </div>
      )}
    </>
  );
}

const RING = { free: "ring-emerald-500", busy: "ring-amber-400", closed: "ring-zinc-200" };
const DOT = { free: "bg-emerald-500", busy: "bg-amber-400", closed: "bg-zinc-300" };

function BarberCard({ item, best }: { item: PublicQueueItem; best: boolean }) {
  const status = statusOf(item);
  const initials = item.name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]!.toUpperCase())
    .join("");
  const wait = waitParts(item.estimatedWaitMinutes);
  const people = Math.min(item.waiting, 6);

  return (
    <div
      className={cn(
        "relative flex items-center gap-3.5 rounded-2xl bg-white p-4 shadow-xs ring-1 ring-zinc-200/80 transition",
        status === "closed" && "bg-zinc-50 shadow-none",
        best && "ring-2 ring-brand",
      )}
    >
      {best && (
        <span className="absolute -top-2.5 right-4 inline-flex items-center gap-1 rounded-full bg-brand px-2 py-0.5 text-[10px] font-semibold text-brand-foreground shadow">
          <Sparkles className="size-3" /> Menor espera
        </span>
      )}

      <div className="relative shrink-0">
        <div
          className={cn(
            "flex size-14 items-center justify-center overflow-hidden rounded-full bg-zinc-100 bg-cover bg-center text-sm font-semibold text-zinc-600 ring-[3px] ring-offset-2",
            RING[status],
            status === "closed" && "grayscale",
          )}
          style={{ backgroundImage: item.avatarUrl ? `url(${item.avatarUrl})` : undefined }}
        >
          {!item.avatarUrl && initials}
        </div>
        <span className={cn("absolute -right-0.5 -bottom-0.5 size-4 rounded-full ring-[3px] ring-white", DOT[status], status === "free" && "animate-pulse")} />
      </div>

      <div className="min-w-0 flex-1">
        <p className={cn("truncate font-semibold", status === "closed" && "text-zinc-400")}>{item.name}</p>
        {status === "closed" && <p className="text-sm text-zinc-400">Não está atendendo agora</p>}
        {status === "free" && <p className="text-sm font-medium text-emerald-700">Cadeira livre — chegou, cortou</p>}
        {status === "busy" && (
          <div className="mt-1 flex items-center gap-2">
            <div className="flex -space-x-1">
              {Array.from({ length: people }, (_, i) => (
                <span key={i} className="size-3.5 rounded-full bg-zinc-300 ring-2 ring-white" style={{ opacity: 1 - i * 0.12 }} />
              ))}
            </div>
            <span className="text-sm text-zinc-500">
              {item.waiting === 0 ? "atendendo agora" : `${item.waiting} ${item.waiting === 1 ? "esperando" : "esperando"}`}
            </span>
          </div>
        )}
      </div>

      {status === "busy" && (
        <div className="text-right">
          <p className="text-2xl leading-none font-semibold tracking-tight tabular-nums">
            ~{wait.value}
            {wait.unit && <span className="ml-0.5 text-xs font-medium text-zinc-500">{wait.unit}</span>}
          </p>
          <p className="mt-1 text-[11px] text-zinc-400">de espera</p>
        </div>
      )}
    </div>
  );
}
