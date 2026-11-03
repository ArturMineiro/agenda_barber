import * as React from "react";
import { Package, Plus, Users } from "lucide-react";
import { planSchema } from "@navalha/shared";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Field, Input, Textarea } from "@/components/ui/input";
import { EmptyState, PageHeader, Skeleton } from "@/components/ui/misc";
import { Switch } from "@/components/ui/switch";
import { cn, formatMoney } from "@/lib/utils";
import type { Plan } from "@/types/api";
import { usePlans, useSavePlan } from "../api";

export function AdminPlansPage() {
  const { data: plans, isLoading } = usePlans();
  const [editing, setEditing] = React.useState<Plan | "new" | null>(null);

  return (
    <div>
      <PageHeader
        title="Planos"
        description="Planos oferecidos às barbearias. O valor pode ser negociado na aprovação."
        actions={
          <Button onClick={() => setEditing("new")}>
            <Plus /> Novo plano
          </Button>
        }
      />
      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-44" />
          ))}
        </div>
      ) : plans?.length ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {plans.map((p) => (
            <button
              key={p.id}
              onClick={() => setEditing(p)}
              className={cn("rounded-2xl border border-zinc-200/80 bg-white p-5 text-left shadow-xs transition hover:shadow-md", !p.active && "opacity-60")}
            >
              <div className="flex items-center justify-between">
                <p className="font-display text-xl font-semibold">{p.name}</p>
                {!p.active && <Badge>Inativo</Badge>}
              </div>
              <p className="mt-2 text-3xl font-semibold tracking-tight">
                {formatMoney(p.priceCents)}
                <span className="text-sm font-normal text-zinc-500">/mês</span>
              </p>
              <p className="mt-2 flex items-center gap-1.5 text-sm text-zinc-600">
                <Users className="size-4" /> {p.maxProfessionals ? `Até ${p.maxProfessionals} profissional(is)` : "Profissionais ilimitados"}
              </p>
              {p.description && <p className="mt-3 text-sm text-zinc-500">{p.description}</p>}
              <p className="mt-4 text-xs text-zinc-400">{p._count?.subscriptions ?? 0} assinatura(s)</p>
            </button>
          ))}
        </div>
      ) : (
        <EmptyState icon={<Package />} title="Nenhum plano" />
      )}

      <PlanDialog plan={editing} onClose={() => setEditing(null)} />
    </div>
  );
}

function PlanDialog({ plan, onClose }: { plan: Plan | "new" | null; onClose: () => void }) {
  const save = useSavePlan();
  const isEdit = plan && plan !== "new";
  const [f, setF] = React.useState({ name: "", description: "", price: "", max: "", unlimited: false, active: true });
  const [error, setError] = React.useState("");

  React.useEffect(() => {
    if (!plan) return;
    setError("");
    setF(
      plan === "new"
        ? { name: "", description: "", price: "", max: "1", unlimited: false, active: true }
        : {
            name: plan.name,
            description: plan.description ?? "",
            price: (plan.priceCents / 100).toFixed(2).replace(".", ","),
            max: String(plan.maxProfessionals ?? ""),
            unlimited: plan.maxProfessionals === null,
            active: plan.active,
          },
    );
  }, [plan]);

  const submit = () => {
    const parsed = planSchema.safeParse({
      name: f.name,
      description: f.description,
      priceCents: Math.round(Number(f.price.replace(",", ".")) * 100),
      maxProfessionals: f.unlimited ? null : Number(f.max),
      active: f.active,
    });
    if (!parsed.success) return setError(parsed.error.issues[0]?.message ?? "Dados inválidos");
    save.mutate({ ...parsed.data, id: isEdit ? plan.id : undefined }, { onSuccess: onClose });
  };

  return (
    <Dialog
      open={!!plan}
      onClose={onClose}
      title={isEdit ? "Editar plano" : "Novo plano"}
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
      <div className="space-y-4">
        {error && <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
        <Field label="Nome">
          <Input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Preço/mês (R$)">
            <Input inputMode="decimal" value={f.price} onChange={(e) => setF({ ...f, price: e.target.value })} />
          </Field>
          <Field label="Máx. profissionais">
            <Input type="number" min={1} disabled={f.unlimited} value={f.unlimited ? "" : f.max} onChange={(e) => setF({ ...f, max: e.target.value })} />
          </Field>
        </div>
        <Switch checked={f.unlimited} onChange={(unlimited) => setF({ ...f, unlimited })} label="Profissionais ilimitados" />
        <Field label="Descrição">
          <Textarea rows={2} className="min-h-0" value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} />
        </Field>
        <Switch checked={f.active} onChange={(active) => setF({ ...f, active })} label="Disponível para novas aprovações" />
      </div>
    </Dialog>
  );
}
