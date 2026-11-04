import * as React from "react";
import type { PageTheme } from "@navalha/shared";

/** Brilho percebido da cor (0 = preto, 255 = branco) */
export function brightness(hex: string) {
  const n = parseInt(hex.slice(1), 16);
  const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  return (r * 299 + g * 587 + b * 114) / 1000;
}

/** Texto branco ou preto, o que tiver mais contraste com a cor */
export function readableOn(hex: string) {
  return brightness(hex) > 150 ? "#18181b" : "#ffffff";
}

/**
 * No fundo escuro, um botão preto some. Se a cor principal for escura demais,
 * usa a cor de apoio (se ela aparecer) ou um cinza claro.
 */
export function accentFor(primary: string, secondary: string, pageTheme: PageTheme = "LIGHT") {
  if (pageTheme !== "DARK" || brightness(primary) >= 60) return primary;
  return brightness(secondary) >= 60 ? secondary : "#e4e4e7";
}

/** Variáveis CSS usadas pela página pública (bg-brand, text-brand-foreground…) */
export function brandVars(primary: string, secondary: string, pageTheme: PageTheme = "LIGHT") {
  primary = accentFor(primary, secondary, pageTheme);
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

/**
 * Aplica o tema da barbearia na página pública: cores no <html> (para valer também
 * nas janelas, que abrem fora da página) e o modo escuro, se escolhido.
 * Ao sair da página (ex.: ir para o painel), tudo volta ao normal.
 */
export function usePublicTheme(shop: { primaryColor: string; secondaryColor: string; pageTheme?: PageTheme } | undefined) {
  const primary = shop?.primaryColor;
  const secondary = shop?.secondaryColor;
  const theme = shop?.pageTheme ?? "LIGHT";
  React.useEffect(() => {
    if (!primary || !secondary) return;
    const root = document.documentElement;
    const vars = brandVars(primary, secondary, theme) as Record<string, string>;
    for (const [k, v] of Object.entries(vars)) root.style.setProperty(k, v);
    root.classList.toggle("public-dark", theme === "DARK");
    const meta = document.querySelector('meta[name="theme-color"]');
    const prevMeta = meta?.getAttribute("content");
    if (theme === "DARK") meta?.setAttribute("content", "#0b0b0d");
    return () => {
      for (const k of Object.keys(vars)) root.style.removeProperty(k);
      root.classList.remove("public-dark");
      if (prevMeta) meta?.setAttribute("content", prevMeta);
    };
  }, [primary, secondary, theme]);
}
