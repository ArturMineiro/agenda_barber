import * as React from "react";
import { Check, Clock, MessageCircle, MoreHorizontal, Plus, Scissors, Trash2, UserCheck, UserPlus, UserX, Users } from "lucide-react";
import { queueEntrySchema } from "@navalha/shared";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Field, Input } from "@/components/ui/input";
import { Avatar, EmptyState, PageHeader, Skeleton, Tabs } from "@/components/ui/misc";
import { Switch } from "@/components/ui/switch";
import { cn, formatDuration, formatMoney, formatPhone, formatTime, maskPhone, whatsappLink } from "@/lib/utils";
import type { QueueColumn, QueueEntry } from "@/types/api";
import { useAddToQueue, useCallNext, useQueue, useServices, useSetQueueStatus, useToggleQueueOpen } from "../api";

/** Re-renderiza a cada 30s para atualizar "há X min" */
function useTick(ms = 30_000) {
  const [, set] = React.useState(0);
  React.useEffect(() => {
    const t = setInterval(() => set((n) => n + 1), ms);
    return () => clearInterval(t);
  }, [ms]);
}

const minutesSince = (iso: string) => Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60_000));

export function QueuePage() {
  const { data: columns, isLoading } = useQueue();
  const [tab, setTab] = React.useState<string>();
  const [adding, setAdding] = React.useState(false);
  useTick();

  const selected = columns?.find((c) => c.id === tab) ?? columns?.[0];
  const multi = (columns?.length ?? 0) > 1;
  const totalWaiting = columns?.reduce((s, c) => s + c.waiting.length, 0) ?? 0;

  return (
    <div className="space-y-5">
      <PageHeader
        title="Fila"
        description={totalWaiting ? `${totalWaiting} cliente(s) esperando agora` : "Ordem de chegada — adicione quem chegar na barbearia"}
        actions={
          <Button onClick={() => setAdding(true)} className="hidden sm:inline-flex">
            <UserPlus /> Adicionar cliente
          </Button>
        }
      />

      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2">
          <Skeleton className="h-80" />
          <Skeleton className="hidden h-80 md:block" />
        </div>
      ) : !columns?.length ? (
        <EmptyState icon={<Users />} title="Nenhum barbeiro ativo" description="Cadastre ou ative um profissional em Equipe." />
      ) : (
        <>
          {/* celular: um barbeiro por vez */}
          {multi && (
            <div className="md:hidden">
              <Tabs
                value={selected!.id}
                onChange={setTab}
                items={columns.map((c) => ({ value: c.id, label: c.name.split(" ")[0]!, count: c.waiting.length }))}
              />
            </div>
          )}
          <div className="md:hidden">{selected && <QueueColumnCard col={selected} />}</div>

          {/* desktop: todas as filas lado a lado */}
          <div className={cn("hidden gap-4 md:grid", columns.length > 1 ? "md:grid-cols-2 xl:grid-cols-3" : "max-w-xl")}>
            {columns.map((c) => (
              <QueueColumnCard key={c.id} col={c} />
            ))}
          </div>
        </>
      )}

      <button
        onClick={() => setAdding(true)}
        className="fixed right-4 bottom-24 z-20 flex size-14 items-center justify-center rounded-full bg-zinc-900 text-white shadow-xl active:scale-95 sm:hidden"
        aria-label="Adicionar cliente"
      >
        <Plus className="size-6" />
      </button>

      <AddToQueueDialog open={adding} onClose={() => setAdding(false)} columns={columns ?? []} defaultProId={selected?.id} />
    </div>
  );
}

function QueueColumnCard({ col }: { col: QueueColumn }) {
  const callNext = useCallNext();
  const setStatus = useSetQueueStatus();
  const toggle = useToggleQueueOpen();

  return (
    <div className="overflow-hidden rounded-2xl border border-zinc-200/80 bg-white shadow-xs">
      {/* cabeçalho do barbeiro */}
      <div className="flex items-center gap-3 border-b border-zinc-100 p-4">
        <Avatar name={col.name} src={col.avatarUrl} className="size-11" />
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold">{col.name}</p>
          <p className="text-xs text-zinc-500">
            {col.waiting.length} na fila · {col.estimatedWaitMinutes ? `espera ~${formatDuration(col.estimatedWaitMinutes)}` : "sem espera"} ·{" "}
            {col.doneToday} atendido(s) hoje
          </p>
        </div>
        <div className="flex flex-col items-end gap-0.5">
          <Switch checked={col.queueOpen} onChange={(open) => toggle.mutate({ id: col.id, open })} />
          <span className={cn("text-[10px] font-medium uppercase", col.queueOpen ? "text-emerald-600" : "text-zinc-400")}>
            {col.queueOpen ? "Aberta" : "Fechada"}
          </span>
        </div>
      </div>

      {/* na cadeira */}
      <div className="p-4">
        <p className="mb-2 text-xs font-semibold tracking-wide text-zinc-500 uppercase">Na cadeira</p>
        {col.current ? (
          <div className="rounded-xl bg-emerald-50 p-3.5 ring-1 ring-emerald-200">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="truncate font-semibold text-emerald-950">{col.current.clientName}</p>
                <p className="text-sm text-emerald-800/80">
                  {col.current.service?.name ?? "Serviço não informado"}
                  {col.current.startedAt && ` · há ${minutesSince(col.current.startedAt)} min`}
                </p>
              </div>
              {col.current.priceCents > 0 && <span className="text-sm font-semibold text-emerald-900">{formatMoney(col.current.priceCents)}</span>}
            </div>
            <div className="mt-3 flex gap-2">
              <Button size="sm" variant="success" className="flex-1" loading={setStatus.isPending} onClick={() => setStatus.mutate({ id: col.current!.id, status: "DONE" })}>
                <Check /> Concluir
              </Button>
              <Button size="sm" variant="outline" onClick={() => setStatus.mutate({ id: col.current!.id, status: "NO_SHOW" })}>
                <UserX /> Não veio
              </Button>
            </div>
          </div>
        ) : (
          <p className="rounded-xl bg-zinc-50 px-3.5 py-3 text-sm text-zinc-500 ring-1 ring-zinc-100">Cadeira livre</p>
        )}

        {col.waiting.length > 0 && (
          <Button
            variant="default"
            size="lg"
            className="mt-3 w-full"
            loading={callNext.isPending}
            onClick={() => callNext.mutate(col.id)}
          >
            <UserCheck />
            {col.current ? "Concluir e chamar próximo" : "Chamar próximo"}
            <span className="font-normal opacity-70">· {col.waiting[0]!.clientName.split(" ")[0]}</span>
          </Button>
        )}
      </div>

      {/* esperando */}
      <div className="border-t border-zinc-100 px-4 pt-3 pb-4">
        <p className="mb-2 text-xs font-semibold tracking-wide text-zinc-500 uppercase">Esperando ({col.waiting.length})</p>
        {col.waiting.length ? (
          <ol className="space-y-2">
            {col.waiting.map((e, i) => (
              <WaitingRow key={e.id} entry={e} position={i + 1} canStart={!col.current} />
            ))}
          </ol>
        ) : (
          <p className="text-sm text-zinc-400">Ninguém esperando.</p>
        )}
      </div>
    </div>
  );
}

function WaitingRow({ entry, position, canStart }: { entry: QueueEntry; position: number; canStart: boolean }) {
  const [menu, setMenu] = React.useState(false);
  const setStatus = useSetQueueStatus();

  return (
    <li className="flex items-center gap-3 rounded-xl px-1 py-1.5">
      <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-zinc-900 text-sm font-semibold text-white tabular-nums">{position}</span>
      <div className="min-w-0 flex-1">
        <p className="truncate font-medium">{entry.clientName}</p>
        <p className="flex flex-wrap items-center gap-x-2 text-xs text-zinc-500">
          {entry.service && (
            <span className="inline-flex items-center gap-1">
              <Scissors className="size-3" /> {entry.service.name}
            </span>
          )}
          <span className="inline-flex items-center gap-1">
            <Clock className="size-3" /> chegou {formatTime(entry.joinedAt)}
          </span>
          {entry.etaMinutes !== undefined && <span>· ~{entry.etaMinutes} min</span>}
        </p>
      </div>
      {entry.clientPhone && (
        <a
          href={whatsappLink(entry.clientPhone, `Olá ${entry.clientName.split(" ")[0]}! Sua vez está chegando 💈`)}
          target="_blank"
          rel="noreferrer"
          className="rounded-lg p-2 text-emerald-600 hover:bg-emerald-50"
          aria-label={`WhatsApp ${formatPhone(entry.clientPhone)}`}
          title="Avisar pelo WhatsApp"
        >
          <MessageCircle className="size-4" />
        </a>
      )}
      <div className="relative">
        <button onClick={() => setMenu((m) => !m)} className="rounded-lg p-2 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700" aria-label="Ações">
          <MoreHorizontal className="size-4" />
        </button>
        {menu && (
          <>
            <div className="fixed inset-0 z-10" onClick={() => setMenu(false)} />
            <div className="absolute right-0 z-20 mt-1 w-44 overflow-hidden rounded-xl border border-zinc-200 bg-white py-1 shadow-lg animate-in">
              {canStart && (
                <button
                  onClick={() => {
                    setMenu(false);
                    setStatus.mutate({ id: entry.id, status: "IN_SERVICE" });
                  }}
                  className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm text-zinc-700 hover:bg-zinc-50"
                >
                  <UserCheck className="size-4" /> Atender agora
                </button>
              )}
              <button
                onClick={() => {
                  setMenu(false);
                  setStatus.mutate({ id: entry.id, status: "NO_SHOW" });
                }}
                className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm text-zinc-700 hover:bg-zinc-50"
              >
                <UserX className="size-4" /> Foi embora
              </button>
              <button
                onClick={() => {
                  setMenu(false);
                  setStatus.mutate({ id: entry.id, status: "CANCELED" });
                }}
                className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm text-red-600 hover:bg-zinc-50"
              >
                <Trash2 className="size-4" /> Remover da fila
              </button>
            </div>
          </>
        )}
      </div>
    </li>
  );
}

function AddToQueueDialog({
  open,
  onClose,
  columns,
  defaultProId,
}: {
  open: boolean;
  onClose: () => void;
  columns: QueueColumn[];
  defaultProId?: string;
}) {
  const { data: services } = useServices();
  const add = useAddToQueue();
  const [name, setName] = React.useState("");
  const [phone, setPhone] = React.useState("");
  const [proId, setProId] = React.useState("");
  const [serviceId, setServiceId] = React.useState<string | null>(null);
  const [errors, setErrors] = React.useState<Record<string, string>>({});

  React.useEffect(() => {
    if (open) {
      setProId(defaultProId ?? columns[0]?.id ?? "");
      setErrors({});
    }
  }, [open, defaultProId, columns]);

  const submit = (e?: React.FormEvent) => {
    e?.preventDefault();
    const parsed = queueEntrySchema.safeParse({ professionalId: proId, serviceId, clientName: name, clientPhone: phone });
    if (!parsed.success) {
      const errs: Record<string, string> = {};
      for (const i of parsed.error.issues) errs[String(i.path[0])] ??= i.message;
      return setErrors(errs);
    }
    add.mutate(parsed.data, {
      onSuccess: () => {
        setName("");
        setPhone("");
        setServiceId(null);
        onClose();
      },
    });
  };

  const chip = (active: boolean) =>
    cn("rounded-full px-3 py-1.5 text-sm ring-1 transition", active ? "bg-zinc-900 text-white ring-zinc-900" : "ring-zinc-200 hover:ring-zinc-400");

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Adicionar à fila"
      description="Cliente que chegou na barbearia."
      footer={
        <>
          <Button variant="outline" onClick={onClose} className="flex-1 sm:flex-none">
            Cancelar
          </Button>
          <Button onClick={() => submit()} loading={add.isPending} className="flex-1 sm:flex-none">
            Adicionar
          </Button>
        </>
      }
    >
      <form onSubmit={submit} className="space-y-4">
        <Field label="Nome" error={errors.clientName}>
          <Input autoFocus value={name} onChange={(e) => setName(e.target.value)} aria-invalid={!!errors.clientName} />
        </Field>

        {columns.length > 1 && (
          <Field label="Fila de qual barbeiro?" error={errors.professionalId}>
            <div className="flex flex-wrap gap-2">
              {columns.map((c) => (
                <button key={c.id} type="button" onClick={() => setProId(c.id)} className={chip(proId === c.id)}>
                  {c.name.split(" ")[0]}
                  <span className="ml-1 opacity-60">({c.waiting.length})</span>
                </button>
              ))}
            </div>
          </Field>
        )}

        <Field label="Serviço (opcional)" hint="Ajuda a calcular o tempo de espera.">
          <div className="flex flex-wrap gap-2">
            {services
              ?.filter((s) => s.active)
              .map((s) => (
                <button key={s.id} type="button" onClick={() => setServiceId(serviceId === s.id ? null : s.id)} className={chip(serviceId === s.id)}>
                  {s.name}
                </button>
              ))}
          </div>
        </Field>

        <Field label="WhatsApp (opcional)" error={errors.clientPhone} hint="Para avisar quando a vez estiver chegando.">
          <Input inputMode="tel" placeholder="(11) 99999-0000" value={phone} onChange={(e) => setPhone(maskPhone(e.target.value))} />
        </Field>
      </form>
    </Dialog>
  );
}
