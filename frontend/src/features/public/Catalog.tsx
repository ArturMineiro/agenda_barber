import * as React from "react";
import { ChevronLeft, ChevronRight, Clock, Images } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { cn, formatDuration, formatMoney } from "@/lib/utils";
import type { PublicBarbershop } from "./api";

export type CatalogService = PublicBarbershop["services"][number];

/**
 * Catálogo de cortes: carrossel com a foto de capa de cada serviço.
 * Tocar abre a ficha (galeria + descrição) com o botão de agendar.
 * Imagens leves: WebP 900x1125 com lazy loading; só as 2 primeiras carregam de cara.
 */
export function CatalogCarousel({ services, onOpen }: { services: CatalogService[]; onOpen: (s: CatalogService) => void }) {
  const withPhotos = services.filter((s) => s.photos.length > 0);
  const scroller = React.useRef<HTMLDivElement>(null);
  if (!withPhotos.length) return null;

  const scrollBy = (dir: 1 | -1) => scroller.current?.scrollBy({ left: dir * scroller.current.clientWidth * 0.8, behavior: "smooth" });

  return (
    <section className="mb-7">
      <div className="mb-3 flex items-end justify-between">
        <div>
          <h2 className="text-lg font-semibold">Nossos cortes</h2>
          <p className="text-sm text-zinc-500">Toque para ver as fotos e agendar</p>
        </div>
        {withPhotos.length > 2 && (
          <div className="hidden gap-1 sm:flex">
            <button onClick={() => scrollBy(-1)} className="rounded-full bg-white p-2 ring-1 ring-zinc-200 hover:bg-zinc-50" aria-label="Anterior">
              <ChevronLeft className="size-4" />
            </button>
            <button onClick={() => scrollBy(1)} className="rounded-full bg-white p-2 ring-1 ring-zinc-200 hover:bg-zinc-50" aria-label="Próximo">
              <ChevronRight className="size-4" />
            </button>
          </div>
        )}
      </div>

      <div ref={scroller} className="no-scrollbar -mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto scroll-px-4 px-4 pb-1">
        {withPhotos.map((s, i) => (
          <button
            key={s.id}
            onClick={() => onOpen(s)}
            className="group relative aspect-[4/5] w-[62%] shrink-0 snap-start overflow-hidden rounded-3xl bg-zinc-200 text-left shadow-sm sm:w-[40%]"
          >
            <img
              src={s.photos[0]!.url}
              alt={s.name}
              width={900}
              height={1125}
              loading={i < 2 ? "eager" : "lazy"}
              decoding="async"
              className="size-full object-cover transition duration-500 group-hover:scale-105"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-transparent" />
            {s.photos.length > 1 && (
              <span className="absolute top-3 right-3 inline-flex items-center gap-1 rounded-full bg-black/45 px-2 py-0.5 text-[11px] font-medium text-white backdrop-blur">
                <Images className="size-3" /> {s.photos.length}
              </span>
            )}
            <div className="absolute inset-x-0 bottom-0 p-4 text-white">
              <p className="line-clamp-2 leading-tight font-semibold">{s.name}</p>
              <p className="mt-1 flex items-center gap-2 text-sm text-white/80">
                <span className="font-semibold text-white">{formatMoney(s.priceCents)}</span>
                <span className="inline-flex items-center gap-1">
                  <Clock className="size-3" /> {formatDuration(s.durationMinutes)}
                </span>
              </p>
            </div>
          </button>
        ))}
      </div>
    </section>
  );
}

/** Miniatura na lista de serviços (abre a ficha sem escolher o serviço) */
export function ServiceThumb({ service, onOpen }: { service: CatalogService; onOpen: (s: CatalogService) => void }) {
  const photo = service.photos[0];
  if (!photo) return null;
  return (
    <span
      role="button"
      tabIndex={0}
      onClick={(e) => {
        e.stopPropagation();
        onOpen(service);
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          e.stopPropagation();
          onOpen(service);
        }
      }}
      className="relative h-[72px] w-[58px] shrink-0 overflow-hidden rounded-xl bg-zinc-100 ring-1 ring-zinc-200"
      aria-label={`Ver fotos de ${service.name}`}
    >
      <img src={photo.thumbUrl} alt="" width={240} height={300} loading="lazy" decoding="async" className="size-full object-cover" />
      {service.photos.length > 1 && (
        <span className="absolute right-1 bottom-1 rounded-full bg-black/55 px-1.5 text-[10px] font-medium text-white">{service.photos.length}</span>
      )}
    </span>
  );
}

/** Ficha do corte: galeria deslizável, preço, duração, descrição e agendar */
export function ServiceSheet({
  service,
  onClose,
  onBook,
  bookLabel = "Agendar este corte",
}: {
  service: CatalogService | null;
  onClose: () => void;
  /** sem onBook (modo fila), a ficha só mostra as fotos */
  onBook?: (s: CatalogService) => void;
  bookLabel?: string;
}) {
  const [index, setIndex] = React.useState(0);
  const track = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => setIndex(0), [service?.id]);

  if (!service) return null;
  const photos = service.photos;

  const goTo = (i: number) => {
    const el = track.current;
    if (!el) return;
    el.scrollTo({ left: i * el.clientWidth, behavior: "smooth" });
  };
  const onScroll = () => {
    const el = track.current;
    if (el) setIndex(Math.round(el.scrollLeft / el.clientWidth));
  };

  return (
    <Dialog
      open
      onClose={onClose}
      title={service.name}
      description={
        <span className="inline-flex items-center gap-3">
          <span className="font-semibold text-zinc-900">{formatMoney(service.priceCents)}</span>
          <span className="inline-flex items-center gap-1">
            <Clock className="size-3.5" /> {formatDuration(service.durationMinutes)}
          </span>
        </span>
      }
      className="sm:max-w-md"
      footer={
        onBook ? (
          <Button variant="brand" size="lg" className="w-full" onClick={() => onBook(service)}>
            {bookLabel} · {formatMoney(service.priceCents)}
          </Button>
        ) : undefined
      }
    >
      {photos.length > 0 && (
        <div className="relative -mx-5 mb-4">
          <div ref={track} onScroll={onScroll} className="no-scrollbar flex snap-x snap-mandatory overflow-x-auto">
            {photos.map((p, i) => (
              <img
                key={p.url}
                src={p.url}
                alt={`${service.name} — foto ${i + 1}`}
                width={900}
                height={1125}
                loading={i === 0 ? "eager" : "lazy"}
                decoding="async"
                className="aspect-[4/5] max-h-[58dvh] w-full shrink-0 snap-center bg-zinc-100 object-cover"
              />
            ))}
          </div>
          {photos.length > 1 && (
            <>
              <div className="absolute inset-x-0 bottom-3 flex justify-center gap-1.5">
                {photos.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => goTo(i)}
                    className={cn("h-1.5 rounded-full bg-white/60 transition-all", i === index ? "w-5 bg-white" : "w-1.5")}
                    aria-label={`Foto ${i + 1}`}
                  />
                ))}
              </div>
              {index > 0 && (
                <button
                  onClick={() => goTo(index - 1)}
                  className="absolute top-1/2 left-3 hidden -translate-y-1/2 rounded-full bg-white/85 p-2 shadow sm:block"
                  aria-label="Foto anterior"
                >
                  <ChevronLeft className="size-4" />
                </button>
              )}
              {index < photos.length - 1 && (
                <button
                  onClick={() => goTo(index + 1)}
                  className="absolute top-1/2 right-3 hidden -translate-y-1/2 rounded-full bg-white/85 p-2 shadow sm:block"
                  aria-label="Próxima foto"
                >
                  <ChevronRight className="size-4" />
                </button>
              )}
            </>
          )}
        </div>
      )}

      {service.description ? (
        <p className="text-sm whitespace-pre-line text-zinc-600">{service.description}</p>
      ) : (
        photos.length === 0 && <p className="text-sm text-zinc-500">Sem fotos deste serviço ainda.</p>
      )}
    </Dialog>
  );
}
