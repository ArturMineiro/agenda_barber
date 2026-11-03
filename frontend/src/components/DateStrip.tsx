import * as React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { WEEKDAYS_SHORT } from "@navalha/shared";
import { addDays, cn, fromDateKey, toDateKey } from "@/lib/utils";

interface DateStripProps {
  value: string;
  onChange: (date: string) => void;
  /** primeiro dia selecionável (padrão: sem limite) */
  min?: string;
  max?: string;
  days?: number;
  /** cor do dia selecionado (página pública usa a cor da barbearia) */
  activeClassName?: string;
}

const monthFmt = new Intl.DateTimeFormat("pt-BR", { month: "long", year: "numeric" });

/** Fita de dias com rolagem horizontal — confortável para o polegar */
export function DateStrip({ value, onChange, min, max, days = 14, activeClassName = "bg-zinc-900 text-white" }: DateStripProps) {
  const [start, setStart] = React.useState(() => {
    const base = min ? fromDateKey(min) : addDays(fromDateKey(value), -3);
    return toDateKey(fromDateKey(value) < base ? fromDateKey(value) : base);
  });
  const ref = React.useRef<HTMLDivElement>(null);
  const today = toDateKey(new Date());

  // se a data selecionada sair da janela visível, reposiciona
  React.useEffect(() => {
    const s = fromDateKey(start);
    const v = fromDateKey(value);
    if (v < s || v >= addDays(s, days)) setStart(toDateKey(min && v < addDays(fromDateKey(min), 3) ? fromDateKey(min) : addDays(v, -3)));
  }, [value, start, days, min]);

  React.useEffect(() => {
    ref.current?.querySelector<HTMLElement>("[data-active=true]")?.scrollIntoView({ inline: "center", block: "nearest", behavior: "smooth" });
  }, [value, start]);

  const list = Array.from({ length: days }, (_, i) => addDays(fromDateKey(start), i));
  const canPrev = !min || fromDateKey(start) > fromDateKey(min);
  const canNext = !max || addDays(fromDateKey(start), days) <= fromDateKey(max);

  const shift = (dir: -1 | 1) => {
    let next = addDays(fromDateKey(start), dir * 7);
    if (min && next < fromDateKey(min)) next = fromDateKey(min);
    setStart(toDateKey(next));
  };

  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <span className="text-sm font-medium text-zinc-700 first-letter:uppercase">{monthFmt.format(fromDateKey(value))}</span>
        <div className="flex gap-1">
          <button disabled={!canPrev} onClick={() => shift(-1)} className="rounded-lg p-1.5 text-zinc-500 hover:bg-zinc-100 disabled:opacity-30" aria-label="Semana anterior">
            <ChevronLeft className="size-4" />
          </button>
          <button disabled={!canNext} onClick={() => shift(1)} className="rounded-lg p-1.5 text-zinc-500 hover:bg-zinc-100 disabled:opacity-30" aria-label="Próxima semana">
            <ChevronRight className="size-4" />
          </button>
        </div>
      </div>
      <div ref={ref} className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0">
        {list.map((d) => {
          const key = toDateKey(d);
          const disabled = (min && key < min) || (max && key > max);
          const active = key === value;
          return (
            <button
              key={key}
              data-active={active}
              disabled={!!disabled}
              onClick={() => onChange(key)}
              className={cn(
                "flex w-14 shrink-0 flex-col items-center rounded-2xl py-2.5 transition disabled:opacity-30",
                active ? cn(activeClassName, "shadow-md") : "bg-white ring-1 ring-zinc-200 hover:ring-zinc-300",
              )}
            >
              <span className={cn("text-[11px] font-medium uppercase", active ? "opacity-80" : "text-zinc-500")}>
                {key === today ? "Hoje" : WEEKDAYS_SHORT[d.getDay()]}
              </span>
              <span className="text-lg font-semibold tabular-nums">{d.getDate()}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
