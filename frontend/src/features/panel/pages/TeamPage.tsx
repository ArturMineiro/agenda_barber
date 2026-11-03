import * as React from "react";
import { Ban, CalendarOff, Clock, Pencil, Plus, Trash2, Users } from "lucide-react";
import { professionalSchema, workingHoursSchema } from "@navalha/shared";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog } from "@/components/ui/dialog";
import { Field, Input, Select, Textarea } from "@/components/ui/input";
import { Avatar, EmptyState, PageHeader, Skeleton } from "@/components/ui/misc";
import { Switch } from "@/components/ui/switch";
import { cn, formatDateTime, toDateKey } from "@/lib/utils";
import type { Professional, WorkingHour } from "@/types/api";
import {
  useBarbershop,
  useCreateTimeOff,
  useDeleteProfessional,
  useDeleteTimeOff,
  useProfessionals,
  useSaveHours,
  useSaveProfessional,
  useServices,
  useTimeOffs,
} from "../api";
import { HoursEditor, hoursSummary } from "../components/HoursEditor";
import { AvatarUpload } from "@/components/ImageUpload";

export function TeamPage() {
  const { data: shop } = useBarbershop();
  const { data: pros, isLoading } = useProfessionals();
  const [editing, setEditing] = React.useState<Professional | "new" | null>(null);
  const [hoursFor, setHoursFor] = React.useState<Professional | null>(null);
  const solo = shop?.teamType === "SOLO";
  const max = shop?.subscription?.plan.maxProfessionals;

  if (solo && pros?.[0]) return <SoloHours pro={pros[0]} />;

  return (
    <div className="space-y-8">
      <div>
        <PageHeader
          title="Equipe"
          description={
            max ? `${pros?.filter((p) => p.active).length ?? 0} de ${max} profissionais ativos no seu plano` : "Profissionais e horários de atendimento"
          }
          actions={
            <Button onClick={() => setEditing("new")}>
              <Plus /> Adicionar
            </Button>
          }
        />

        {isLoading ? (
          <div className="grid gap-3 sm:grid-cols-2">
            <Skeleton className="h-32" />
            <Skeleton className="h-32" />
          </div>
        ) : pros?.length ? (
          <div className="grid gap-3 sm:grid-cols-2">
            {pros.map((p) => (
              <Card key={p.id} className={cn(!p.active && "opacity-60")}>
                <CardContent className="flex items-start gap-3">
                  <Avatar name={p.name} src={p.avatarUrl} className="size-12" />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="truncate font-medium">{p.name}</p>
                      {!p.active && <Badge>Inativo</Badge>}
                    </div>
                    <p className="mt-0.5 text-sm text-zinc-500">{p.serviceIds.length} serviço(s)</p>
                    <p className="mt-0.5 flex items-center gap-1 text-xs text-zinc-500">
                      <Clock className="size-3" /> {hoursSummary(p.workingHours)}
                    </p>
                    <div className="mt-3 flex gap-2">
                      <Button size="sm" variant="outline" onClick={() => setHoursFor(p)}>
                        <Clock /> Horários
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => setEditing(p)}>
                        <Pencil /> Editar
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <EmptyState icon={<Users />} title="Nenhum profissional" action={<Button onClick={() => setEditing("new")}>Adicionar profissional</Button>} />
        )}
      </div>

      <TimeOffSection pros={pros ?? []} />

      <ProfessionalDialog pro={editing} onClose={() => setEditing(null)} />
      <HoursDialog pro={hoursFor} onClose={() => setHoursFor(null)} />
    </div>
  );
}

/** Barbeiro solo: a tela vira direto o editor de horários */
function SoloHours({ pro }: { pro: Professional }) {
  const [hours, setHours] = React.useState<WorkingHour[]>(pro.workingHours);
  const save = useSaveHours();
  const { data: pros } = useProfessionals();

  React.useEffect(() => setHours(pro.workingHours), [pro.workingHours]);

  const submit = () => {
    const parsed = workingHoursSchema.safeParse({ hours });
    if (!parsed.success) return alert(parsed.error.issues[0]?.message);
    save.mutate({ id: pro.id, hours: parsed.data.hours });
  };

  return (
    <div className="space-y-8">
      <div>
        <PageHeader title="Horários" description="Quando você atende. Os clientes só veem horários dentro desses intervalos." />
        <Card>
          <CardContent>
            <HoursEditor value={hours} onChange={setHours} />
            <Button className="mt-5 w-full sm:w-auto" onClick={submit} loading={save.isPending}>
              Salvar horários
            </Button>
          </CardContent>
        </Card>
      </div>
      <TimeOffSection pros={pros ?? []} />
    </div>
  );
}

function ProfessionalDialog({ pro, onClose }: { pro: Professional | "new" | null; onClose: () => void }) {
  const { data: services } = useServices();
  const save = useSaveProfessional();
  const remove = useDeleteProfessional();
  const isEdit = pro && pro !== "new";

  const [form, setForm] = React.useState({ name: "", bio: "", avatarUrl: "", active: true, serviceIds: [] as string[] });
  const [errors, setErrors] = React.useState<Record<string, string>>({});

  React.useEffect(() => {
    if (!pro) return;
    setErrors({});
    setForm(
      pro === "new"
        ? { name: "", bio: "", avatarUrl: "", active: true, serviceIds: services?.filter((s) => s.active).map((s) => s.id) ?? [] }
        : { name: pro.name, bio: pro.bio ?? "", avatarUrl: pro.avatarUrl ?? "", active: pro.active, serviceIds: pro.serviceIds },
    );
  }, [pro, services]);

  const submit = () => {
    const parsed = professionalSchema.safeParse(form);
    if (!parsed.success) {
      const errs: Record<string, string> = {};
      for (const i of parsed.error.issues) errs[String(i.path[0])] ??= i.message;
      return setErrors(errs);
    }
    save.mutate({ ...parsed.data, id: isEdit ? pro.id : undefined }, { onSuccess: onClose });
  };

  const toggleService = (id: string) =>
    setForm((f) => ({ ...f, serviceIds: f.serviceIds.includes(id) ? f.serviceIds.filter((x) => x !== id) : [...f.serviceIds, id] }));

  return (
    <Dialog
      open={!!pro}
      onClose={onClose}
      title={isEdit ? "Editar profissional" : "Novo profissional"}
      footer={
        <>
          {isEdit && (
            <Button
              variant="ghost"
              className="text-red-600 sm:mr-auto"
              loading={remove.isPending}
              onClick={() => confirm(`Remover ${pro.name}?`) && remove.mutate(pro.id, { onSuccess: onClose })}
            >
              <Trash2 />
            </Button>
          )}
          <Button variant="outline" onClick={onClose} className="flex-1 sm:flex-none">
            Cancelar
          </Button>
          <Button onClick={submit} loading={save.isPending} className="flex-1 sm:flex-none">
            Salvar
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <Field label="Nome" error={errors.name}>
          <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} aria-invalid={!!errors.name} />
        </Field>
        <AvatarUpload name={form.name} value={form.avatarUrl} onChange={(url) => setForm((f) => ({ ...f, avatarUrl: url ?? "" }))} />
        <Field label="Sobre (opcional)" error={errors.bio}>
          <Textarea rows={2} className="min-h-0" value={form.bio} onChange={(e) => setForm({ ...form, bio: e.target.value })} />
        </Field>
        <Field label="Serviços que realiza">
          <div className="flex flex-wrap gap-2">
            {services?.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => toggleService(s.id)}
                className={cn(
                  "rounded-full px-3 py-1.5 text-sm ring-1 transition",
                  form.serviceIds.includes(s.id) ? "bg-zinc-900 text-white ring-zinc-900" : "ring-zinc-200 hover:ring-zinc-400",
                )}
              >
                {s.name}
              </button>
            ))}
          </div>
        </Field>
        <Switch checked={form.active} onChange={(active) => setForm({ ...form, active })} label="Ativo" description="Inativos não aparecem para os clientes" />
      </div>
    </Dialog>
  );
}

function HoursDialog({ pro, onClose }: { pro: Professional | null; onClose: () => void }) {
  const [hours, setHours] = React.useState<WorkingHour[]>([]);
  const save = useSaveHours();

  React.useEffect(() => {
    if (pro) setHours(pro.workingHours);
  }, [pro]);

  const submit = () => {
    const parsed = workingHoursSchema.safeParse({ hours });
    if (!parsed.success) return alert(parsed.error.issues[0]?.message);
    save.mutate({ id: pro!.id, hours: parsed.data.hours }, { onSuccess: onClose });
  };

  return (
    <Dialog
      open={!!pro}
      onClose={onClose}
      title={`Horários de ${pro?.name.split(" ")[0] ?? ""}`}
      footer={
        <>
          <Button variant="outline" onClick={onClose} className="flex-1 sm:flex-none">
            Cancelar
          </Button>
          <Button onClick={submit} loading={save.isPending} className="flex-1 sm:flex-none">
            Salvar
          </Button>
        </>
      }
    >
      <HoursEditor value={hours} onChange={setHours} />
    </Dialog>
  );
}

/** Folgas, férias, compromissos: bloqueiam a agenda do profissional */
function TimeOffSection({ pros }: { pros: Professional[] }) {
  const { data: offs } = useTimeOffs();
  const create = useCreateTimeOff();
  const remove = useDeleteTimeOff();
  const [open, setOpen] = React.useState(false);
  const today = toDateKey(new Date());
  const [f, setF] = React.useState({ professionalId: "", date: today, allDay: true, start: "12:00", end: "13:00", reason: "" });

  React.useEffect(() => {
    if (pros[0] && !f.professionalId) setF((x) => ({ ...x, professionalId: pros[0]!.id }));
  }, [pros, f.professionalId]);

  const submit = () => {
    const startsAt = new Date(`${f.date}T${f.allDay ? "00:00" : f.start}:00`);
    const endsAt = new Date(`${f.date}T${f.allDay ? "23:59" : f.end}:00`);
    create.mutate(
      { professionalId: f.professionalId, startsAt: startsAt.toISOString(), endsAt: endsAt.toISOString(), reason: f.reason },
      { onSuccess: () => setOpen(false) },
    );
  };

  return (
    <Card>
      <CardHeader>
        <div>
          <CardTitle>Bloqueios de agenda</CardTitle>
          <p className="mt-0.5 text-sm text-zinc-500">Folgas, feriados ou compromissos.</p>
        </div>
        <Button size="sm" variant="outline" onClick={() => setOpen(true)}>
          <Ban /> Bloquear
        </Button>
      </CardHeader>
      <CardContent>
        {offs?.length ? (
          <ul className="divide-y divide-zinc-100">
            {offs.map((o) => (
              <li key={o.id} className="flex items-center gap-3 py-2.5">
                <CalendarOff className="size-4 text-zinc-400" />
                <div className="min-w-0 flex-1 text-sm">
                  <p className="font-medium">
                    {formatDateTime(o.startsAt)} → {formatDateTime(o.endsAt)}
                  </p>
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
        title="Bloquear horário"
        footer={
          <>
            <Button variant="outline" onClick={() => setOpen(false)} className="flex-1 sm:flex-none">
              Cancelar
            </Button>
            <Button onClick={submit} loading={create.isPending} className="flex-1 sm:flex-none">
              Bloquear
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          {pros.length > 1 && (
            <Field label="Profissional">
              <Select value={f.professionalId} onChange={(e) => setF({ ...f, professionalId: e.target.value })}>
                {pros.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </Select>
            </Field>
          )}
          <Field label="Data">
            <Input type="date" min={today} value={f.date} onChange={(e) => setF({ ...f, date: e.target.value })} />
          </Field>
          <Switch checked={f.allDay} onChange={(allDay) => setF({ ...f, allDay })} label="Dia inteiro" />
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
