import * as React from "react";
import { Instagram, MapPin, MessageCircle, Star } from "lucide-react";
import { heroBackground } from "@/lib/theme";
import { cn, whatsappLink } from "@/lib/utils";
import type { PublicBarbershop } from "./api";

/** Listras diagonais suaves (referência ao poste de barbearia) sobre o degradê, quando não há capa */
const STRIPES = "repeating-linear-gradient(135deg, rgb(255 255 255 / .045) 0 12px, transparent 12px 30px)";

interface HeroProps {
  shop: PublicBarbershop["barbershop"];
  compact: boolean;
  /** selo ao lado do logo (ex.: "Aberto agora") */
  badge?: React.ReactNode;
  /** nota média: vira um chip que rola até as avaliações */
  rating?: { average: number | null; count: number };
}

/** Topo da página pública: capa, logo, nome e contatos em botões */
export function Hero({ shop, compact, badge, rating }: HeroProps) {
  const bg = heroBackground(shop.primaryColor, shop.secondaryColor, shop.coverUrl);
  const location = [shop.address, shop.city].filter(Boolean).join(" · ");

  return (
    <header>
      <div
        className={cn("relative transition-all", compact ? "h-24" : "h-40 sm:h-56")}
        style={shop.coverUrl ? bg : { ...bg, backgroundImage: `${STRIPES}, ${bg.backgroundImage}` }}
      />
      <div className="mx-auto max-w-xl px-4">
        <div className="relative -mt-10 flex items-end justify-between gap-3">
          <div
            className="flex size-20 shrink-0 items-center justify-center overflow-hidden rounded-3xl border-4 border-zinc-50 bg-brand-2 bg-cover bg-center font-display text-3xl font-bold text-brand-2-foreground shadow-lg"
            style={{ backgroundImage: shop.logoUrl ? `url(${shop.logoUrl})` : undefined }}
          >
            {!shop.logoUrl && shop.name[0]}
          </div>
          {badge && <div className="pb-1">{badge}</div>}
        </div>

        <h1 className="mt-3 font-display text-[1.7rem] leading-tight font-semibold tracking-tight sm:text-3xl">{shop.name}</h1>
        {!compact && shop.description && <p className="mt-1.5 text-sm leading-relaxed whitespace-pre-line text-zinc-600">{shop.description}</p>}

        <div className="no-scrollbar -mx-4 mt-3 flex gap-2 overflow-x-auto px-4 pb-0.5">
          {!compact && rating?.count && rating.average !== null ? (
            <Chip href="#avaliacoes" icon={<Star className="fill-amber-400 text-amber-400" />} external={false}>
              {rating.average.toLocaleString("pt-BR", { minimumFractionDigits: 1 })} · {rating.count} avaliaç{rating.count === 1 ? "ão" : "ões"}
            </Chip>
          ) : null}
          {location && (
            <Chip href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(location)}`} icon={<MapPin />}>
              {location}
            </Chip>
          )}
          {shop.instagram && (
            <Chip href={`https://instagram.com/${shop.instagram}`} icon={<Instagram />}>
              @{shop.instagram}
            </Chip>
          )}
          {shop.whatsapp && (
            <Chip href={whatsappLink(shop.whatsapp)} icon={<MessageCircle />} className="text-emerald-700">
              WhatsApp
            </Chip>
          )}
        </div>
      </div>
    </header>
  );
}

function Chip({
  href,
  icon,
  children,
  className,
  external = true,
}: {
  href: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  external?: boolean;
}) {
  return (
    <a
      href={href}
      {...(external ? { target: "_blank", rel: "noreferrer" } : {})}
      className={cn(
        "inline-flex max-w-[16rem] shrink-0 items-center gap-1.5 rounded-full bg-white px-3 py-1.5 text-xs font-medium text-zinc-700 shadow-xs ring-1 ring-zinc-200 transition hover:ring-zinc-300 active:scale-[0.97] [&_svg]:size-3.5 [&_svg]:shrink-0",
        className,
      )}
    >
      {icon}
      <span className="truncate">{children}</span>
    </a>
  );
}
