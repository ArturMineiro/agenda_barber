import * as React from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Clock, Pencil, Plus, Scissors, Trash2 } from "lucide-react";
import { serviceSchema } from "@navalha/shared";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog } from "@/components/ui/dialog";
import { Field, Input, Textarea } from "@/components/ui/input";
import { EmptyState, PageHeader, Skeleton } from "@/components/ui/misc";
import { Switch } from "@/components/ui/switch";
import { cn, formatDuration, formatMoney } from "@/lib/utils";
import type { Service } from "@/types/api";
import { useDeleteService, useSaveService, useServices } from "../api";

/** No formulário o preço é digitado em reais ("45,90"); a API recebe centavos */
const formSchema = serviceSchema.omit({ priceCents: true }).extend({
  price: z
    .string()
    .trim()
    .min(1, "Informe o preço")
    .refine((v) => /^\d+([.,]\d{1,2})?$/.test(v), "Preço inválido"),
});
type FormValues = z.input<typeof formSchema>;

const toCents = (v: string) => Math.round(Number(v.replace(",", ".")) * 100);
const fromCents = (c: number) => (c / 100).toFixed(2).replace(".", ",");

const DURATIONS = [15, 20, 30, 40, 45, 60, 90, 120];

export function ServicesPage() {
  const { data: services, isLoading } = useServices();
  const [editing, setEditing] = React.useState<Service | "new" | null>(null);

  return (
    <div>
      <PageHeader
        title="Serviços"
        description="O que você oferece, quanto tempo leva e quanto custa."
        actions={
          <Button onClick={() => setEditing("new")}>
            <Plus /> <span className="hidden sm:inline">Novo serviço</span>
            <span className="sm:hidden">Novo</span>
          </Button>
        }
      />

      {isLoading ? (
        <div className="grid gap-3 sm:grid-cols-2">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
      ) : services?.length ? (
        <div className="grid gap-3 sm:grid-cols-2">
          {services.map((s) => (
            <button
              key={s.id}
              onClick={() => setEditing(s)}
              className={cn(
                "group flex items-center gap-4 rounded-2xl border border-zinc-200/80 bg-white p-4 text-left shadow-xs transition hover:border-zinc-300 hover:shadow-sm",
                !s.active && "opacity-60",
              )}
            >
              <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-700">
                <Scissors className="size-5" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="truncate font-medium">{s.name}</p>
                  {!s.active && <Badge>Inativo</Badge>}
                </div>
                <p className="mt-0.5 flex items-center gap-1 text-sm text-zinc-500">
                  <Clock className="size-3.5" /> {formatDuration(s.durationMinutes)}
                </p>
              </div>
              <span className="font-semibold">{formatMoney(s.priceCents)}</span>
              <Pencil className="size-4 text-zinc-300 group-hover:text-zinc-500" />
            </button>
          ))}
        </div>
      ) : (
        <EmptyState
          icon={<Scissors />}
          title="Nenhum serviço ainda"
          description="Cadastre o primeiro para começar a receber agendamentos."
          action={<Button onClick={() => setEditing("new")}>Cadastrar serviço</Button>}
        />
      )}

      <ServiceDialog service={editing} onClose={() => setEditing(null)} />
    </div>
  );
}

function ServiceDialog({ service, onClose }: { service: Service | "new" | null; onClose: () => void }) {
  const save = useSaveService();
  const remove = useDeleteService();
  const isEdit = service && service !== "new";

  const form = useForm<FormValues>({ resolver: zodResolver(formSchema) });
  const { errors } = form.formState;

  React.useEffect(() => {
    if (!service) return;
    form.reset(
      service === "new"
        ? { name: "", description: "", durationMinutes: 30, price: "", active: true }
        : {
            name: service.name,
            description: service.description ?? "",
            durationMinutes: service.durationMinutes,
            price: fromCents(service.priceCents),
            active: service.active,
          },
    );
  }, [service, form]);

  const onSubmit = form.handleSubmit(({ price, ...v }) =>
    save.mutate({ ...v, priceCents: toCents(price), id: isEdit ? service.id : undefined }, { onSuccess: onClose }),
  );

  const onDelete = () => {
    if (isEdit && confirm(`Remover "${service.name}"? Se já tiver agendamentos, ele só será desativado.`)) {
      remove.mutate(service.id, { onSuccess: onClose });
    }
  };

  return (
    <Dialog
      open={!!service}
      onClose={onClose}
      title={isEdit ? "Editar serviço" : "Novo serviço"}
      footer={
        <>
          {isEdit && (
            <Button variant="ghost" className="text-red-600 sm:mr-auto" onClick={onDelete} loading={remove.isPending}>
              <Trash2 />
            </Button>
          )}
          <Button variant="outline" onClick={onClose} className="flex-1 sm:flex-none">
            Cancelar
          </Button>
          <Button onClick={onSubmit} loading={save.isPending} className="flex-1 sm:flex-none">
            Salvar
          </Button>
        </>
      }
    >
      <form onSubmit={onSubmit} className="space-y-4">
        <Field label="Nome" error={errors.name?.message}>
          <Input placeholder="Ex.: Corte degradê" aria-invalid={!!errors.name} {...form.register("name")} />
        </Field>

        <Field label="Duração" error={errors.durationMinutes?.message}>
          <Controller
            control={form.control}
            name="durationMinutes"
            render={({ field }) => (
              <div className="flex flex-wrap gap-2">
                {DURATIONS.map((d) => (
                  <button
                    type="button"
                    key={d}
                    onClick={() => field.onChange(d)}
                    className={cn(
                      "rounded-xl px-3 py-2 text-sm font-medium ring-1 transition",
                      field.value === d ? "bg-zinc-900 text-white ring-zinc-900" : "ring-zinc-200 hover:ring-zinc-400",
                    )}
                  >
                    {formatDuration(d)}
                  </button>
                ))}
              </div>
            )}
          />
        </Field>

        <Field label="Preço" error={errors.price?.message}>
          <div className="relative">
            <span className="absolute top-1/2 left-3.5 -translate-y-1/2 text-sm text-zinc-500">R$</span>
            <Input inputMode="decimal" placeholder="0,00" className="pl-10" aria-invalid={!!errors.price} {...form.register("price")} />
          </div>
        </Field>

        <Field label="Descrição (opcional)" error={errors.description?.message}>
          <Textarea rows={2} className="min-h-0" placeholder="Aparece na sua página de agendamento" {...form.register("description")} />
        </Field>

        <Controller
          control={form.control}
          name="active"
          render={({ field }) => (
            <Switch checked={!!field.value} onChange={field.onChange} label="Disponível para agendamento" />
          )}
        />
      </form>
    </Dialog>
  );
}
