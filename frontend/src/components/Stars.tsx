import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

/** Estrelas só de leitura (aceita nota quebrada, ex.: 4.6 → 4 cheias + 1 parcial) */
export function Stars({ value, className }: { value: number; className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-0.5 text-amber-500", className)} aria-label={`${value} de 5 estrelas`}>
      {[1, 2, 3, 4, 5].map((n) => {
        const fill = Math.max(0, Math.min(1, value - n + 1));
        return (
          <span key={n} className="relative inline-block size-[1em]">
            <Star className="absolute inset-0 size-full text-zinc-300" />
            <span className="absolute inset-0 overflow-hidden" style={{ width: `${fill * 100}%` }}>
              <Star className="size-[1em] fill-current" />
            </span>
          </span>
        );
      })}
    </span>
  );
}

const LABELS = ["", "Ruim", "Regular", "Bom", "Muito bom", "Excelente"];

/** Escolha de 1 a 5 estrelas, com botões grandes para o polegar */
export function StarInput({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <div>
      <div className="flex gap-1" role="radiogroup" aria-label="Sua nota">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            role="radio"
            aria-checked={value === n}
            aria-label={`${n} estrela${n > 1 ? "s" : ""}`}
            onClick={() => onChange(n)}
            className="rounded-lg p-1 transition active:scale-90"
          >
            <Star className={cn("size-9", n <= value ? "fill-amber-400 text-amber-400" : "text-zinc-300")} />
          </button>
        ))}
      </div>
      <p className="mt-1 h-5 text-sm font-medium text-zinc-600">{LABELS[value]}</p>
    </div>
  );
}
