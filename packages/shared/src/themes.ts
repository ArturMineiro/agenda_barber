/**
 * Paletas curadas para a página pública.
 * - primary: botões, horário selecionado, destaques
 * - secondary: fundo do topo (quando não há capa) e fundo do logo sem imagem
 * Cada par foi escolhido para ter contraste e combinar entre si.
 */
export interface ThemePreset {
  id: string;
  name: string;
  primary: string;
  secondary: string;
}

export const THEME_PRESETS: ThemePreset[] = [
  { id: "classico", name: "Clássico", primary: "#b45309", secondary: "#1c1917" },
  { id: "navy-ouro", name: "Navy & Ouro", primary: "#c9a227", secondary: "#14213d" },
  { id: "bordo", name: "Bordô Vintage", primary: "#9f1239", secondary: "#2b1d16" },
  { id: "floresta", name: "Floresta", primary: "#15803d", secondary: "#052e16" },
  { id: "terracota", name: "Terracota", primary: "#c2410c", secondary: "#3b2a20" },
  { id: "oceano", name: "Oceano", primary: "#0e7490", secondary: "#0b1d2e" },
  { id: "petroleo", name: "Petróleo & Cobre", primary: "#b87333", secondary: "#0f3b3a" },
  { id: "urbano", name: "Urbano", primary: "#7c3aed", secondary: "#111827" },
  { id: "rose", name: "Rosé", primary: "#be185d", secondary: "#3b0a2a" },
  { id: "minimal", name: "Minimalista", primary: "#18181b", secondary: "#52525b" },
];

export const DEFAULT_THEME = THEME_PRESETS[0]!;

export function findPreset(primary: string, secondary: string) {
  return THEME_PRESETS.find(
    (t) => t.primary.toLowerCase() === primary.toLowerCase() && t.secondary.toLowerCase() === secondary.toLowerCase(),
  );
}
