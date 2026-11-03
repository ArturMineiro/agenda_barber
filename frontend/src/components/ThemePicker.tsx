import * as React from "react";
import { Check, Paintbrush } from "lucide-react";
import { findPreset, THEME_PRESETS } from "@navalha/shared";
import { readableOn } from "@/lib/theme";
import { cn } from "@/lib/utils";

interface Props {
  primary: string;
  secondary: string;
  onChange: (colors: { primary: string; secondary: string }) => void;
}

/**
 * Paletas prontas (duas cores que combinam) + opção personalizada.
 * Cada cartão mostra como fica: fundo na cor de apoio e um "botão" na cor principal.
 */
export function ThemePicker({ primary, secondary, onChange }: Props) {
  const current = findPreset(primary, secondary);
  const [custom, setCustom] = React.useState(!current);

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-3 gap-2 sm:gap-2.5 xl:grid-cols-5">
        {THEME_PRESETS.map((t) => {
          const active = !custom && current?.id === t.id;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => {
                setCustom(false);
                onChange({ primary: t.primary, secondary: t.secondary });
              }}
              className={cn(
                "group relative overflow-hidden rounded-xl text-left ring-1 ring-zinc-200 transition hover:ring-zinc-400",
                active && "ring-2 ring-zinc-900 hover:ring-zinc-900",
              )}
            >
              <div className="flex h-11 items-end p-1.5 sm:h-14 sm:p-2" style={{ background: t.secondary }}>
                <span
                  className="rounded-md px-2 py-0.5 text-[10px] font-semibold"
                  style={{ background: t.primary, color: readableOn(t.primary) }}
                >
                  Agendar
                </span>
              </div>
              <div className="flex items-center justify-between gap-1 bg-white px-2 py-1.5 sm:px-2.5">
                <span className="truncate text-[11px] font-medium sm:text-xs">{t.name}</span>
                {active && <Check className="size-3.5 shrink-0" />}
              </div>
            </button>
          );
        })}

        <button
          type="button"
          onClick={() => setCustom(true)}
          className={cn(
            "flex min-h-[4.5rem] flex-col sm:min-h-[5.5rem] items-center justify-center gap-1 rounded-xl border border-dashed border-zinc-300 text-xs font-medium text-zinc-600 transition hover:border-zinc-400",
            custom && "border-solid border-zinc-900 ring-1 ring-zinc-900",
          )}
        >
          <Paintbrush className="size-4" />
          Personalizado
        </button>
      </div>

      {custom && (
        <div className="grid grid-cols-2 gap-3 rounded-xl bg-zinc-50 p-3 ring-1 ring-zinc-200 animate-in">
          <ColorInput label="Cor principal" hint="Botões e destaques" value={primary} onChange={(v) => onChange({ primary: v, secondary })} />
          <ColorInput label="Cor de apoio" hint="Fundo do topo" value={secondary} onChange={(v) => onChange({ primary, secondary: v })} />
        </div>
      )}
    </div>
  );
}

function ColorInput({ label, hint, value, onChange }: { label: string; hint: string; value: string; onChange: (v: string) => void }) {
  return (
    <label className="flex cursor-pointer items-center gap-3">
      <span className="relative size-10 shrink-0 overflow-hidden rounded-xl ring-1 ring-black/10" style={{ background: value }}>
        <input type="color" value={value} onChange={(e) => onChange(e.target.value)} className="absolute inset-0 size-full cursor-pointer opacity-0" />
      </span>
      <span className="min-w-0">
        <span className="block text-sm font-medium">{label}</span>
        <span className="block text-xs text-zinc-500">
          {hint} · <span className="font-mono uppercase">{value}</span>
        </span>
      </span>
    </label>
  );
}
