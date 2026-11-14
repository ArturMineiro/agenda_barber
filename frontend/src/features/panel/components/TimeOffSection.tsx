import * as React from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { Ban, CalendarOff, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog } from "@/components/ui/dialog";
import { Field, Input, Select } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { addDaysToKey, formatDateTime, formatDayShort, formatTime, todayKey, zonedDateTimeToISO } from "@/lib/utils";
import type { Professional } from "@/types/api";
import { useBarbershop, useCreateTimeOff, useDeleteTimeOff, useTimeOffs } from "../api";

const day = (d: Date) => formatDayShort(d);

/** "sáb, 15/11 · dia inteiro", "15/11 até 20/11", "sáb, 15/11 · 12:00 às 13:00" */
function describeTimeOff(startsAt: string, endsAt: string) {
  const s = new Date(startsAt);
  const e = new Date(endsAt);
  // dia inteiro termina à meia-noite seguinte (ou 23:59, nos bloqueios antigos)
  if (formatTime(s) === "00:00" && ["00:00", "23:59"].includes(formatTime(e))) {
    const last = new Date(e.getTime() - 60_000);
    return day(s) === day(last) ? `${day(s)} · dia inteiro` : `${day(s)} até ${day(last)}`;
  }
  if (day(s) === day(e)) return `${day(s)} · ${formatTime(s)} às ${formatTime(e)}`;
  return `${formatDateTime(startsAt)} → ${formatDateTime(endsAt)}`;
}

/** Folgas, férias, compromissos: bloqueiam a agenda do profissional */
export function TimeOffSection({ pros }: { pros: Professional[] }) {
  const { data: offs } = useTimeOffs();
  const { data: shop } = useBarbershop();
  const create = useCreateTimeOff();
  const remove = useDeleteTimeOff();
  const navigate = useNavigate();
  // atalho "Marcar folga" do início do painel: /painel/equipe?folga=1 já abre o formulário
  const [params] = useSearchParams();
  const [open, setOpen] = React.useState(() => params.get("folga") === "1");
  const today = todayKey();
  const [f, setF] = React.useState({ professionalId: "", date: today, endDate: today, allDay: true, start: "12:00", end: "13:00", reason: "" });
  const activePros = pros.filter((p) => p.active);
  const firstProId = activePros[0]?.id ?? pros[0]?.id;

  React.useEffect(() => {
    if (firstProId && !f.professionalId) setF((x) => ({ ...x, professionalId: firstProId }));
  }, [firstProId, f.professionalId]);

  const submit = () => {
    if (f.allDay && f.endDate < f.date) return toast.error("O último dia precisa ser igual ou depois do primeiro");
    // horário da barbearia (não o do aparelho); dia inteiro vai até a meia-noite seguinte ao último dia
    const tz = shop?.timezone ?? "America/Sao_Paulo";
    const startsAt = zonedDateTimeToISO(f.date, f.allDay ? "00:00" : f.start, tz);
    const endsAt = f.allDay
      ? zonedDateTimeToISO(addDaysToKey(f.endDate, 1), "00:00", tz)
      : zonedDateTimeToISO(f.date, f.end, tz);
    create.mutate(
      { professionalId: f.professionalId, startsAt, endsAt, reason: f.reason },
      {
        onSuccess: (r) => {
          setOpen(false);
          if (r.conflicts) {
            toast.warning(
              `Folga salva, mas ${r.conflicts} cliente(s) já estavam marcados nesse período e continuam na agenda. Desmarque e avise cada um.`,
              { duration: 12_000, action: { label: "Ver agenda", onClick: () => navigate(`/painel/agenda?data=${f.date}`) } },
            );
          }
        },
      },
    );
  };

  return (
    <Card>
      <CardHeader>
        <div>
          <CardTitle>Folgas e bloqueios</CardTitle>
          <p className="mt-0.5 text-sm text-zinc-500">Folga numa data, feriado, férias ou compromisso. Ninguém agenda nesses horários.</p>
        </div>
        <Button size="sm" variant="outline" onClick={() => setOpen(true)}>
          <Ban /> Marcar folga
        </Button>
      </CardHeader>
      <CardContent>
        {offs?.length ? (
          <ul className="divide-y divide-zinc-100">
            {offs.map((o) => (
              <li key={o.id} className="flex items-center gap-3 py-2.5">
                <CalendarOff className="size-4 text-zinc-400" />
                <div className="min-w-0 flex-1 text-sm">
                  <p className="font-medium first-letter:uppercase">{describeTimeOff(o.startsAt, o.endsAt)}</p>
                  <p className="text-zinc-500">
                    {pros.length > 1 && `${o.professional.name} · `}
                    {o.reason ?? "Sem motivo"}
                  </p>
                </div>
                <button onClick={() => remove.mutate(o.id)} className="rounded-lg p-2 text-zinc-400 hover:bg-zinc-100 hover:text-red-600" aria-label="Remover">
                  <Trash2 className="size-4" />
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-zinc-500">Nenhum bloqueio futuro.</p>
        )}
      </CardContent>

      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        title="Marcar folga ou bloqueio"
        footer={
          <>
            <Button variant="outline" onClick={() => setOpen(false)} className="flex-1 sm:flex-none">
              Cancelar
            </Button>
            <Button onClick={submit} loading={create.isPending} className="flex-1 sm:flex-none">
              Salvar folga
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          {activePros.length > 1 && (
            <Field label="Profissional">
              <Select value={f.professionalId} onChange={(e) => setF({ ...f, professionalId: e.target.value })}>
                {activePros.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </Select>
            </Field>
          )}
          <Switch checked={f.allDay} onChange={(allDay) => setF({ ...f, allDay })} label="Dia inteiro" description="Desligue para bloquear só algumas horas" />
          {f.allDay ? (
            <div className="grid grid-cols-2 gap-3">
              <Field label="De">
                <Input
                  type="date"
                  min={today}
                  value={f.date}
                  onChange={(e) => e.target.value && setF({ ...f, date: e.target.value, endDate: f.endDate < e.target.value ? e.target.value : f.endDate })}
                />
              </Field>
              <Field label="Até" hint="Férias: escolha o último dia">
                <Input type="date" min={f.date} value={f.endDate} onChange={(e) => e.target.value && setF({ ...f, endDate: e.target.value })} />
              </Field>
            </div>
          ) : (
            <Field label="Data">
              <Input
                type="date"
                min={today}
                value={f.date}
                onChange={(e) => e.target.value && setF({ ...f, date: e.target.value, endDate: f.endDate < e.target.value ? e.target.value : f.endDate })}
              />
            </Field>
          )}
          {!f.allDay && (
            <div className="grid grid-cols-2 gap-3">
              <Field label="Das">
                <Input type="time" value={f.start} onChange={(e) => setF({ ...f, start: e.target.value })} />
              </Field>
              <Field label="Até">
                <Input type="time" value={f.end} onChange={(e) => setF({ ...f, end: e.target.value })} />
              </Field>
            </div>
          )}
          <Field label="Motivo (opcional)">
            <Input placeholder="Ex.: Feriado, médico…" value={f.reason} onChange={(e) => setF({ ...f, reason: e.target.value })} />
          </Field>
        </div>
      </Dialog>
    </Card>
  );
}
