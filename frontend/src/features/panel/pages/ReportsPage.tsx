import * as React from "react";
import { ArrowDownRight, ArrowUpRight, BarChart3, CalendarDays, DollarSign, Receipt, UserX } from "lucide-react";
import { WEEKDAYS_SHORT } from "@navalha/shared";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState, PageHeader, Skeleton, StatCard, Tabs } from "@/components/ui/misc";
import { addDaysToKey, cn, formatDateKeyShort, formatMoney, todayKey } from "@/lib/utils";
import { useBarbershop, useReport } from "../api";

/** Cor única das barras (uma série por gráfico): azul validado contra o fundo branco (contraste ≥ 3:1) */
const BAR = "#2a78d6";

type Preset = "month" | "last-month" | "30d" | "year";

/** Períodos prontos, no calendário da barbearia */
function rangeOf(preset: Preset) {
  const today = todayKey();
  const [y, m] = today.split("-").map(Number) as [number, number];
  const pad = (n: number) => String(n).padStart(2, "0");
  const lastDay = (yy: number, mm: number) => new Date(Date.UTC(yy, mm, 0)).getUTCDate();
  if (preset === "month") return { from: `${y}-${pad(m)}-01`, to: `${y}-${pad(m)}-${pad(lastDay(y, m))}` };
  if (preset === "last-month") {
    const [py, pm] = m === 1 ? [y - 1, 12] : [y, m - 1];
    return { from: `${py}-${pad(pm)}-01`, to: `${py}-${pad(pm)}-${pad(lastDay(py, pm))}` };
  }
  if (preset === "30d") return { from: addDaysToKey(today, -29), to: today };
  return { from: `${y}-01-01`, to: `${y}-12-31` };
}

const PRESETS: { value: Preset; label: string }[] = [
  { value: "month", label: "Este mês" },
  { value: "last-month", label: "Mês passado" },
  { value: "30d", label: "Últimos 30 dias" },
  { value: "year", label: "Este ano" },
];

const pct = (n: number) => `${Math.round(n * 100)}%`;

export function ReportsPage() {
  const [preset, setPreset] = React.useState<Preset>("month");
  const range = rangeOf(preset);
  const { data: shop } = useBarbershop();
  const { data: r, isLoading } = useReport(range.from, range.to);
  const queue = shop?.bookingMode === "QUEUE";

  const delta = r && r.previous.revenueCents > 0 ? r.totals.revenueCents / r.previous.revenueCents - 1 : null;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Relatórios"
        description={`${formatDateKeyShort(range.from)} a ${formatDateKeyShort(range.to)}${queue ? " · atendimentos da fila" : ""}`}
      />

      <Tabs value={preset} onChange={setPreset} items={PRESETS} />

      {isLoading || !r ? (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <StatCard
              label="Faturamento"
              icon={<DollarSign />}
              value={formatMoney(r.totals.revenueCents)}
              hint={
                delta === null ? (
                  "sem base para comparar"
                ) : (
                  <span className={cn("inline-flex items-center gap-0.5 font-medium", delta >= 0 ? "text-emerald-700" : "text-red-700")}>
                    {delta >= 0 ? <ArrowUpRight className="size-3.5" /> : <ArrowDownRight className="size-3.5" />}
                    {delta >= 0 ? "+" : "−"}
                    {pct(Math.abs(delta))} vs período anterior
                  </span>
                )
              }
            />
            <StatCard label="Atendimentos" icon={<CalendarDays />} value={r.totals.done} hint={`${r.previous.done} no período anterior`} />
            <StatCard label="Ticket médio" icon={<Receipt />} value={formatMoney(r.totals.ticketCents)} hint="por atendimento" />
            <StatCard
              label="Faltas"
              icon={<UserX />}
              value={pct(r.totals.noShowRate)}
              hint={`${r.totals.noShow} cliente(s) não vieram`}
            />
          </div>

          <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
            <Mini label="Clientes atendidos" value={r.totals.clients} hint={`${r.totals.newClients} vieram pela primeira vez`} />
            {!queue && (
              <Mini
                label="Cancelamentos"
                value={r.totals.canceled}
                hint={r.totals.canceled ? `${r.totals.canceledByClient} pelo cliente` : "nenhum no período"}
              />
            )}
            {!queue && r.totals.upcoming > 0 && (
              <Mini label="Ainda agendado" value={formatMoney(r.totals.upcomingRevenueCents)} hint={`${r.totals.upcoming} horário(s) até o fim do período`} />
            )}
          </div>

          {r.totals.done === 0 ? (
            <EmptyState icon={<BarChart3 />} title="Nenhum atendimento no período" description="Os gráficos aparecem assim que houver atendimentos." />
          ) : (
            <div className="grid gap-5 lg:grid-cols-2">
              {r.byProfessional.length > 1 && (
                <Card>
                  <CardHeader>
                    <CardTitle>Faturamento por profissional</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <RankedBars
                      rows={r.byProfessional.map((p) => ({
                        key: p.id,
                        label: p.name,
                        value: p.revenueCents,
                        figure: formatMoney(p.revenueCents),
                        sub: `${p.done} atendimento(s)${p.rating ? ` · ★ ${p.rating.average.toLocaleString("pt-BR")}` : ""}`,
                        tip: `${pct(p.revenueCents / r.totals.revenueCents)} do faturamento · ticket ${formatMoney(Math.round(p.revenueCents / p.done))}`,
                      }))}
                    />
                  </CardContent>
                </Card>
              )}

              <Card>
                <CardHeader>
                  <CardTitle>Serviços que mais faturam</CardTitle>
                </CardHeader>
                <CardContent>
                  <RankedBars
                    rows={r.byService.slice(0, 8).map((s) => ({
                      key: s.id,
                      label: s.name,
                      value: s.revenueCents,
                      figure: formatMoney(s.revenueCents),
                      sub: `${s.done} vez(es)`,
                      tip: `${pct(s.revenueCents / r.totals.revenueCents)} do faturamento`,
                    }))}
                  />
                  {r.byService.length > 8 && <p className="mt-3 text-xs text-zinc-500">Mostrando os 8 primeiros de {r.byService.length}.</p>}
                </CardContent>
              </Card>

              <Card className={cn(r.byProfessional.length > 1 && "lg:col-span-2")}>
                <CardHeader>
                  <div>
                    <CardTitle>Atendimentos por dia da semana</CardTitle>
                    <p className="mt-0.5 text-sm text-zinc-500">Bom para decidir folga e horário de cada um.</p>
                  </div>
                </CardHeader>
                <CardContent>
                  <WeekdayColumns data={r.byWeekday} />
                </CardContent>
              </Card>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function Mini({ label, value, hint }: { label: string; value: React.ReactNode; hint: string }) {
  return (
    <div className="rounded-2xl bg-zinc-100/70 px-4 py-3">
      <p className="text-xs text-zinc-500">{label}</p>
      <p className="mt-0.5 text-lg font-semibold tabular-nums">{value}</p>
      <p className="text-xs text-zinc-500">{hint}</p>
    </div>
  );
}

/** Dica ao passar o mouse ou tocar (o número principal já está escrito; aqui vai o detalhe) */
function Tip({ children }: { children: React.ReactNode }) {
  return (
    <span
      role="tooltip"
      className="pointer-events-none absolute -top-2 right-0 z-10 hidden -translate-y-full rounded-lg bg-zinc-900 px-2.5 py-1.5 text-xs whitespace-nowrap text-white shadow-lg group-hover:block group-focus-visible:block"
    >
      {children}
    </span>
  );
}

interface BarRow {
  key: string;
  label: string;
  value: number;
  figure: string;
  sub: string;
  tip: string;
}

/** Barras horizontais em ordem (maior primeiro), uma cor; valor escrito na ponta */
function RankedBars({ rows }: { rows: BarRow[] }) {
  const max = Math.max(...rows.map((r) => r.value), 1);
  return (
    <ul className="space-y-3.5">
      {rows.map((r) => (
        <li key={r.key} tabIndex={0} className="group relative rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-zinc-900/20">
          <div className="flex items-baseline justify-between gap-3 text-sm">
            <span className="min-w-0 truncate font-medium text-zinc-900">{r.label}</span>
            <span className="shrink-0 font-semibold text-zinc-900 tabular-nums">{r.figure}</span>
          </div>
          <div className="mt-1.5 h-2.5">
            {/* ponta arredondada, base reta no eixo */}
            <div className="h-full rounded-r-[4px]" style={{ width: `${Math.max(2, (r.value / max) * 100)}%`, background: BAR }} />
          </div>
          <p className="mt-1 text-xs text-zinc-500">{r.sub}</p>
          <Tip>{r.tip}</Tip>
        </li>
      ))}
    </ul>
  );
}

/** Colunas de segunda a domingo (ordem natural, não por tamanho) */
function WeekdayColumns({ data }: { data: { weekday: number; done: number; revenueCents: number }[] }) {
  const order = [1, 2, 3, 4, 5, 6, 0];
  const max = Math.max(...data.map((d) => d.done), 1);
  return (
    <div>
      <div className="flex h-36 items-end justify-between gap-2 border-b border-zinc-200 px-1">
        {order.map((wd) => {
          const d = data.find((x) => x.weekday === wd)!;
          return (
            <div key={wd} tabIndex={0} className="group relative flex h-full flex-1 flex-col items-center justify-end outline-none">
              <span className="mb-1 text-xs font-medium text-zinc-600 tabular-nums">{d.done || ""}</span>
              {/* 112px = altura útil (a área tem 144px; o resto fica para o número em cima) */}
              <div className="w-6 max-w-full rounded-t-[4px]" style={{ height: d.done ? Math.max(2, (d.done / max) * 112) : 0, background: BAR }} />
              <Tip>
                {WEEKDAYS_SHORT[wd]}: {d.done} atendimento(s) · {formatMoney(d.revenueCents)}
              </Tip>
            </div>
          );
        })}
      </div>
      <div className="mt-1.5 flex justify-between gap-2 px-1">
        {order.map((wd) => (
          <span key={wd} className="flex-1 text-center text-xs text-zinc-500">
            {WEEKDAYS_SHORT[wd]}
          </span>
        ))}
      </div>
    </div>
  );
}
