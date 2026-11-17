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
 * Fundos da página pública. Cada um remapeia a escala zinc (50 = fundo … 900 = texto)
 * e a cor dos cartões: as telas continuam usando bg-zinc-50, text-zinc-900 etc.
 * LIGHT não troca nada (é o padrão do sistema).
 */
type Scale = [string, string, string, string, string, string, string, string, string, string, string];
const STEPS = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950] as const;

export interface PageBackground {
  label: string;
  dark: boolean;
  /** zinc 50 → 950 */
  scale: Scale | null;
  card: string;
}

export const PAGE_BACKGROUNDS: Record<PageTheme, PageBackground> = {
  LIGHT: { label: "Claro", dark: false, scale: null, card: "#ffffff" },
  CREAM: {
    label: "Creme",
    dark: false,
    scale: ["#f7f3ea", "#efe8da", "#e2d8c5", "#cfc2a9", "#a39780", "#7d7262", "#5f564a", "#4a4238", "#342e27", "#231f1a", "#15120f"],
    card: "#fffdf8",
  },
  ICE: {
    label: "Gelo",
    dark: false,
    scale: ["#eef3f7", "#e1e9f0", "#ccd8e3", "#b0c0cf", "#8597a8", "#64748b", "#4b5a6b", "#3a4756", "#283340", "#1a222c", "#0f141a"],
    card: "#ffffff",
  },
  DARK: {
    label: "Escuro",
    dark: true,
    scale: ["#0b0b0d", "#1f1f23", "#2c2c31", "#3f3f46", "#8b8b94", "#a1a1aa", "#c4c4cc", "#d4d4d8", "#e4e4e7", "#f4f4f5", "#fafafa"],
    card: "#161618",
  },
  GRAPHITE: {
    label: "Grafite",
    dark: true,
    scale: ["#1c1d21", "#2a2b30", "#36373d", "#4a4b52", "#8e8f98", "#a5a6ae", "#c6c7cd", "#d6d7dc", "#e6e7ea", "#f5f5f6", "#fafafa"],
    card: "#25262b",
  },
  NAVY: {
    label: "Marinho",
    dark: true,
    scale: ["#0b1220", "#16203a", "#1f2b4a", "#33416a", "#8090b5", "#a3b0cd", "#c3cce0", "#d5dcea", "#e5e9f2", "#f3f5fa", "#fafbfd"],
    card: "#121b30",
  },
  GREEN: {
    label: "Verde-garrafa",
    dark: true,
    scale: ["#0b1712", "#15261e", "#1e3329", "#2f4a3d", "#82a394", "#a3bdb1", "#c3d5cc", "#d4e1db", "#e4ede9", "#f3f7f5", "#fafcfb"],
    card: "#12221a",
  },
  WINE: {
    label: "Vinho",
    dark: true,
    scale: ["#1a0b10", "#2c151c", "#3a1e27", "#55303c", "#b08893", "#c7a6af", "#dac4ca", "#e5d5da", "#efe5e8", "#f8f2f4", "#fcf9fa"],
    card: "#251117",
  },
  COFFEE: {
    label: "Café",
    dark: true,
    scale: ["#16100b", "#261c15", "#33261d", "#4b3a2d", "#a58f7c", "#bfaa98", "#d6c6b8", "#e2d6cb", "#ede5dd", "#f7f2ee", "#fbf9f7"],
    card: "#20170f",
  },
};

export const isDarkTheme = (t: PageTheme = "LIGHT") => PAGE_BACKGROUNDS[t]?.dark ?? false;

/** Cor de fundo da página (barra do navegador, miniaturas) */
export const pageBg = (t: PageTheme = "LIGHT") => PAGE_BACKGROUNDS[t]?.scale?.[0] ?? "#fafafa";

/** Variáveis CSS do fundo escolhido (vazio no Claro) */
export function themeVars(t: PageTheme = "LIGHT"): Record<string, string> {
  const bg = PAGE_BACKGROUNDS[t];
  if (!bg?.scale) return {};
  const vars: Record<string, string> = { "--color-card": bg.card };
  STEPS.forEach((step, i) => (vars[`--color-zinc-${step}`] = bg.scale![i]!));
  return vars;
}

/** Classes que ligam os ajustes de CSS do fundo (cartões, faixas de aviso no escuro) */
export function themeClasses(t: PageTheme = "LIGHT") {
  return [t !== "LIGHT" && "public-themed", isDarkTheme(t) && "public-dark"].filter(Boolean).join(" ");
}

/**
 * No fundo escuro, um botão preto some. Se a cor principal for escura demais,
 * usa a cor de apoio (se ela aparecer) ou um cinza claro.
 */
export function accentFor(primary: string, secondary: string, pageTheme: PageTheme = "LIGHT") {
  if (!isDarkTheme(pageTheme) || brightness(primary) >= 60) return primary;
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
    ...themeVars(pageTheme),
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
    root.classList.toggle("public-themed", theme !== "LIGHT");
    root.classList.toggle("public-dark", isDarkTheme(theme));
    const meta = document.querySelector('meta[name="theme-color"]');
    const prevMeta = meta?.getAttribute("content");
    if (theme !== "LIGHT") meta?.setAttribute("content", pageBg(theme));
    return () => {
      for (const k of Object.keys(vars)) root.style.removeProperty(k);
      root.classList.remove("public-themed", "public-dark");
      if (prevMeta) meta?.setAttribute("content", prevMeta);
    };
  }, [primary, secondary, theme]);
}
