import type * as React from "react";

/** Texto branco ou preto, o que tiver mais contraste com a cor */
export function readableOn(hex: string) {
  const n = parseInt(hex.slice(1), 16);
  const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  return (r * 299 + g * 587 + b * 114) / 1000 > 150 ? "#18181b" : "#ffffff";
}

/** Variáveis CSS usadas pela página pública (bg-brand, text-brand-foreground…) */
export function brandVars(primary: string, secondary: string) {
  return {
    "--color-brand": primary,
    "--color-brand-foreground": readableOn(primary),
    "--color-brand-2": secondary,
    "--color-brand-2-foreground": readableOn(secondary),
  } as React.CSSProperties;
}

/**
 * Fundo do topo da página: a capa enviada (com degradê para o texto ler bem)
 * ou, sem capa, um degradê entre as duas cores da paleta.
 */
export function heroBackground(primary: string, secondary: string, coverUrl?: string | null): React.CSSProperties {
  if (coverUrl) {
    return {
      backgroundColor: secondary,
      backgroundImage: `linear-gradient(to bottom, transparent 45%, rgb(0 0 0 / .35)), url(${coverUrl})`,
      backgroundSize: "cover",
      backgroundPosition: "center",
    };
  }
  return {
    backgroundColor: secondary,
    backgroundImage: `radial-gradient(120% 140% at 100% 0%, ${primary}cc 0%, transparent 55%), linear-gradient(135deg, ${secondary} 0%, ${secondary} 40%, ${primary}55 100%)`,
  };
}
