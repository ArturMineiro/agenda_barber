import * as React from "react";
import { Clock, KeyRound, Pencil, Plus, Trash2, Users } from "lucide-react";
import { TempPasswordDialog } from "@/components/TempPasswordDialog";
import { professionalSchema, workingHoursSchema } from "@navalha/shared";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog } from "@/components/ui/dialog";
import { Field, Input, Textarea } from "@/components/ui/input";
import { Avatar, EmptyState, PageHeader, Skeleton } from "@/components/ui/misc";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import type { Professional, WorkingHour } from "@/types/api";
import {
  useBarbershop,
  useDeleteProfessional,
  useProfessionalAccess,
  useProfessionals,
  useSaveHours,
  useSaveProfessional,
  useServices,
} from "../api";
import { HoursEditor, hoursSummary } from "../components/HoursEditor";
import { TimeOffSection } from "../components/TimeOffSection";
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
                      {p.user?.role === "BARBER" && (
                        <Badge tone="neutral">
                          <KeyRound className="size-3" /> Com acesso
                        </Badge>
                      )}
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
        <PageHeader
          title="Horários e folgas"
          description="Defina a hora que abre e fecha em cada dia. Desligue o dia para folga fixa (ex.: domingo). Para uma folga só numa data, use “Marcar folga” abaixo."
        />
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
        {isEdit && <AccessSection pro={pro} />}
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

/**
 * Login próprio para o barbeiro da equipe: ele vê só a própria agenda, fila, lembretes e números.
 * O dono cria com o e-mail dele; a senha temporária vai pelo WhatsApp e é trocada no primeiro acesso.
 */
function AccessSection({ pro }: { pro: Professional }) {
  const { data: shop } = useBarbershop();
  const access = useProfessionalAccess(pro.id);
  const [email, setEmail] = React.useState("");
  const [result, setResult] = React.useState<{ email: string; tempPassword: string } | null>(null);
  const first = pro.name.split(" ")[0];

  if (pro.user?.role === "OWNER") return null;

  return (
    <div className="rounded-xl bg-zinc-50 p-4 ring-1 ring-zinc-200">
      <p className="flex items-center gap-1.5 text-sm font-medium">
        <KeyRound className="size-4 text-zinc-500" /> Acesso ao painel
      </p>
      {pro.user ? (
        <>
          <p className="mt-1 text-sm text-zinc-600">
            Entra com <strong className="text-zinc-900">{pro.user.email}</strong> e vê só a própria agenda, fila e números.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button
              size="sm"
              variant="outline"
              loading={access.reset.isPending}
              onClick={() =>
                confirm(`Gerar uma senha nova para ${first}? A atual para de funcionar.`) && access.reset.mutate(undefined, { onSuccess: setResult })
              }
            >
              Gerar nova senha
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="text-red-600"
              loading={access.remove.isPending}
              onClick={() => confirm(`Remover o acesso de ${first} ao painel?`) && access.remove.mutate()}
            >
              Remover acesso
            </Button>
          </div>
        </>
      ) : (
        <>
          <p className="mt-1 text-sm text-zinc-600">Dê um login para {first} ver a própria agenda, a fila e os números no celular.</p>
          <div className="mt-3 flex gap-2">
            <Input type="email" inputMode="email" placeholder={`E-mail de ${first}`} value={email} onChange={(e) => setEmail(e.target.value)} />
            <Button
              type="button"
              className="shrink-0"
              disabled={!email.includes("@")}
              loading={access.create.isPending}
              onClick={() => access.create.mutate(email, { onSuccess: (r) => (setEmail(""), setResult(r)) })}
            >
              Criar acesso
            </Button>
          </div>
        </>
      )}
      <TempPasswordDialog
        password={result?.tempPassword ?? null}
        onClose={() => setResult(null)}
        title={`Acesso de ${first}`}
        name={pro.name}
        email={result?.email ?? ""}
        context={shop ? `ao painel da ${shop.name}` : undefined}
      />
    </div>
  );
}
