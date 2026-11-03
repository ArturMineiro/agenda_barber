import { Plus, X } from "lucide-react";
import { WEEKDAYS } from "@navalha/shared";
import { Switch } from "@/components/ui/switch";
import { minutesToTime, timeToMinutes } from "@/lib/utils";
import type { WorkingHour } from "@/types/api";

interface Props {
  value: WorkingHour[];
  onChange: (hours: WorkingHour[]) => void;
}

/** Ordem de exibição começando na segunda */
const ORDER = [1, 2, 3, 4, 5, 6, 0];

/**
 * Grade semanal: liga/desliga o dia e define um ou mais intervalos
 * (ex.: 09:00–12:00 e 13:00–19:00 para ter pausa de almoço).
 */
export function HoursEditor({ value, onChange }: Props) {
  const byDay = (d: number) => value.filter((h) => h.weekday === d).sort((a, b) => a.startMinute - b.startMinute);

  const setDay = (d: number, list: WorkingHour[]) => onChange([...value.filter((h) => h.weekday !== d), ...list]);

  const toggle = (d: number, on: boolean) =>
    setDay(d, on ? [{ weekday: d, startMinute: 9 * 60, endMinute: 18 * 60 }] : []);

  const addInterval = (d: number) => {
    const list = byDay(d);
    const last = list[list.length - 1];
    const start = last ? Math.min(last.endMinute + 60, 23 * 60) : 9 * 60;
    setDay(d, [...list, { weekday: d, startMinute: start, endMinute: Math.min(start + 4 * 60, 24 * 60 - 1) }]);
  };

  const update = (d: number, idx: number, patch: Partial<WorkingHour>) =>
    setDay(d, byDay(d).map((h, i) => (i === idx ? { ...h, ...patch } : h)));

  const removeInterval = (d: number, idx: number) => setDay(d, byDay(d).filter((_, i) => i !== idx));

  const copyToAll = (d: number) => {
    const src = byDay(d);
    onChange(ORDER.filter((x) => byDay(x).length > 0 || x === d).flatMap((x) => src.map((h) => ({ ...h, weekday: x }))));
  };

  return (
    <div className="divide-y divide-zinc-100">
      {ORDER.map((d) => {
        const list = byDay(d);
        const on = list.length > 0;
        return (
          <div key={d} className="py-3 first:pt-0 last:pb-0">
            <div className="flex items-center justify-between">
              <span className="w-24 text-sm font-medium">{WEEKDAYS[d]}</span>
              {on && (
                <button type="button" onClick={() => copyToAll(d)} className="mr-auto ml-2 text-xs text-zinc-500 hover:text-zinc-900">
                  copiar p/ dias ativos
                </button>
              )}
              <Switch checked={on} onChange={(v) => toggle(d, v)} />
            </div>
            {on ? (
              <div className="mt-2 space-y-2">
                {list.map((h, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <input
                      type="time"
                      value={minutesToTime(h.startMinute)}
                      onChange={(e) => e.target.value && update(d, i, { startMinute: timeToMinutes(e.target.value) })}
                      className="h-10 flex-1 rounded-xl border border-zinc-200 px-3 tabular-nums"
                    />
                    <span className="text-zinc-400">até</span>
                    <input
                      type="time"
                      value={minutesToTime(h.endMinute)}
                      onChange={(e) => e.target.value && update(d, i, { endMinute: timeToMinutes(e.target.value) })}
                      className="h-10 flex-1 rounded-xl border border-zinc-200 px-3 tabular-nums"
                    />
                    <button type="button" onClick={() => removeInterval(d, i)} className="rounded-lg p-2 text-zinc-400 hover:bg-zinc-100" aria-label="Remover intervalo">
                      <X className="size-4" />
                    </button>
                  </div>
                ))}
                <button type="button" onClick={() => addInterval(d)} className="inline-flex items-center gap-1 text-xs font-medium text-zinc-600 hover:text-zinc-900">
                  <Plus className="size-3.5" /> Adicionar intervalo
                </button>
              </div>
            ) : (
              <p className="mt-1 text-xs text-zinc-400">Fechado</p>
            )}
          </div>
        );
      })}
    </div>
  );
}

/** Resumo curto: "Seg–Sáb · 09:00–19:00" */
export function hoursSummary(hours: WorkingHour[]) {
  if (!hours.length) return "Sem horários definidos";
  const days = [...new Set(hours.map((h) => h.weekday))].length;
  const start = Math.min(...hours.map((h) => h.startMinute));
  const end = Math.max(...hours.map((h) => h.endMinute));
  return `${days} dia(s) por semana · ${minutesToTime(start)}–${minutesToTime(end)}`;
}
