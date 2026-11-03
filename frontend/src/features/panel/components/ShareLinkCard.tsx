import { Copy, ExternalLink, Share2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { publicUrl } from "@/lib/utils";
import type { Barbershop } from "@/types/api";

export function ShareLinkCard({ shop }: { shop: Barbershop }) {
  const url = publicUrl(shop.slug);
  const live = shop.status === "ACTIVE";

  const copy = async () => {
    await navigator.clipboard.writeText(url);
    toast.success("Link copiado!");
  };

  const share = async () => {
    const text = `Agende seu horário na ${shop.name}: ${url}`;
    if (navigator.share) {
      await navigator.share({ title: shop.name, text, url }).catch(() => {});
    } else {
      window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank");
    }
  };

  return (
    <div className="relative overflow-hidden rounded-2xl bg-zinc-900 p-5 text-white">
      <div className="absolute -top-16 -right-10 size-48 rounded-full bg-amber-500/25 blur-3xl" />
      <div className="relative">
        <p className="text-sm text-zinc-400">{live ? "Seu link de agendamento" : "Seu link (ativo após aprovação)"}</p>
        <p className="mt-1 truncate font-mono text-lg font-medium">{url.replace(/^https?:\/\//, "")}</p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Button size="sm" className="bg-white text-zinc-900 hover:bg-zinc-100" onClick={copy}>
            <Copy /> Copiar
          </Button>
          <Button size="sm" className="bg-white/10 hover:bg-white/20" onClick={share} disabled={!live}>
            <Share2 /> Compartilhar
          </Button>
          <a href={url} target="_blank" rel="noreferrer" className="inline-flex h-9 items-center gap-2 rounded-xl px-3 text-sm text-zinc-300 hover:bg-white/10">
            <ExternalLink className="size-4" /> Ver página
          </a>
        </div>
      </div>
    </div>
  );
}
