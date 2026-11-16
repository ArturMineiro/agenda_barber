import * as React from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, ExternalLink, KeyRound, Mail, MessageCircle, Pause, Play, Receipt, Settings2, ShieldAlert, Star } from "lucide-react";
import { TempPasswordDialog } from "@/components/TempPasswordDialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog } from "@/components/ui/dialog";
import { Field, Input, Select } from "@/components/ui/input";
import { FullPageSpinner } from "@/components/ui/misc";
import { formatDateOnly, formatDateTime, formatMoney, formatPhone, publicUrl, whatsappLink } from "@/lib/utils";
import { enterAdminMode } from "@/lib/admin-mode";
import type { AdminBarbershop, Plan } from "@/types/api";
import {
  useAdminBarbershop,
  useApprove,
  useBarbershopInsights,
  useChangeSubscription,
  usePlans,
  useReactivate,
  useReject,
  useResetOwnerPassword,
  useSuspend,
} from "../api";
import { ActivityList } from "../components/ActivityList";
import { PaymentRow } from "../components/PaymentRow";
import { ShopStatusBadge, SubStatusBadge } from "../components/status";

const toCents = (v: string) => Math.round(Number(v.replace(",", ".")) * 100);
const fromCents = (c: number) => (c / 100).toFixed(2).replace(".", ",");

export function AdminBarbershopDetailPage() {
  const { id = "" } = useParams();
  const { data: shop, isLoading } = useAdminBarbershop(id);
  const suspend = useSuspend();
  const reactivate = useReactivate();
  const navigate = useNavigate();

  if (isLoading || !shop) return <FullPageSpinner />;
  const sub = shop.subscription;

  return (
    <div className="space-y-5">
      <Link to="/admin/barbearias" className="inline-flex items-center gap-1 text-sm text-zinc-500 hover:text-zinc-900">
        <ArrowLeft className="size-4" /> Barbearias
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-semibold tracking-tight">{shop.name}</h1>
            <ShopStatusBadge status={shop.status} />
          </div>
          <p className="mt-1 text-sm text-zinc-500">
            {shop.teamType === "SOLO" ? "Barbeiro solo" : "Barbearia com equipe"} · {shop.city ?? "—"} · cadastrada em{" "}
            {new Date(shop.createdAt).toLocaleDateString("pt-BR")}
          </p>
          {shop.statusReason && <p className="mt-1 text-sm text-red-600">Motivo: {shop.statusReason}</p>}
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            size="sm"
            onClick={() => {
              enterAdminMode({ id: shop.id, name: shop.name });
              navigate("/painel");
            }}
          >
            <Settings2 /> Gerenciar painel
          </Button>
          <a href={publicUrl(shop.slug)} target="_blank" rel="noreferrer">
            <Button variant="outline" size="sm">
              <ExternalLink /> Página
            </Button>
          </a>
          {shop.status === "ACTIVE" && (
            <Button
              variant="outline"
              size="sm"
              className="text-red-600"
              loading={suspend.isPending}
              onClick={() => {
                const reason = prompt("Motivo da suspensão (opcional):");
                if (reason !== null) suspend.mutate({ id: shop.id, reason: reason || undefined });
              }}
            >
              <Pause /> Suspender
            </Button>
          )}
          {shop.status === "SUSPENDED" && (
            <Button variant="success" size="sm" loading={reactivate.isPending} onClick={() => reactivate.mutate(shop.id)}>
              <Play /> Reativar
            </Button>
          )}
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-[1fr_320px]">
        <div className="space-y-5">
          {(shop.status === "PENDING" || shop.status === "REJECTED") && <ApprovalCard shop={shop} />}

          {sub && (
            <Card>
              <CardHeader>
                <CardTitle>Assinatura</CardTitle>
                <EditSubscription shop={shop} />
              </CardHeader>
              <CardContent className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                <Info label="Plano" value={sub.plan.name} />
                <Info label="Mensalidade" value={formatMoney(sub.priceCents)} />
                <Info label="Vencimento" value={`Todo dia ${sub.billingDay}`} />
                <Info label="Situação" value={<SubStatusBadge status={sub.status} />} />
                {sub.trialEndsAt && <Info label="Cortesia até" value={new Date(sub.trialEndsAt).toLocaleDateString("pt-BR")} />}
              </CardContent>
            </Card>
          )}

          {sub && (
            <Card>
              <CardHeader>
                <CardTitle>Mensalidades</CardTitle>
              </CardHeader>
              <CardContent className="px-0 sm:px-0">
                {sub.payments?.length ? (
                  <div className="divide-y divide-zinc-100">
                    {sub.payments.map((p) => (
                      <PaymentRow key={p.id} payment={p} />
                    ))}
                  </div>
                ) : (
                  <p className="flex items-center gap-2 px-4 text-sm text-zinc-500 sm:px-5">
                    <Receipt className="size-4" /> A primeira cobrança é gerada 7 dias antes do vencimento.
                  </p>
                )}
              </CardContent>
            </Card>
          )}
        </div>

        <div className="space-y-5">
          <Card>
            <CardHeader>
              <CardTitle>Responsável</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <p className="font-medium">{shop.owner.name}</p>
              <a href={`mailto:${shop.owner.email}`} className="flex items-center gap-2 text-zinc-600 hover:text-zinc-900">
                <Mail className="size-4" /> {shop.owner.email}
              </a>
              {shop.owner.phone && (
                <a href={whatsappLink(shop.owner.phone)} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-emerald-700 hover:underline">
                  <MessageCircle className="size-4" /> {formatPhone(shop.owner.phone)}
                </a>
              )}
              <ResetOwnerPassword shop={shop} />
            </CardContent>
          </Card>
          <InsightsCard shop={shop} />
        </div>
      </div>

      <Card>
        <CardHeader>
          <div>
            <CardTitle>Log de atividades</CardTitle>
            <p className="mt-0.5 text-sm text-zinc-500">Logins, alterações no painel, ações dos clientes e do admin. Toque numa linha para ver os detalhes.</p>
          </div>
        </CardHeader>
        <CardContent>
          <ActivityList barbershopId={shop.id} />
        </CardContent>
      </Card>
    </div>
  );
}

const ago = (iso: string | null) => (iso ? formatDateTime(iso) : "Nunca (desde que o log começou)");

/** Resumo para o suporte: acessos, movimento dos últimos 30 dias e equipe com login */
function InsightsCard({ shop }: { shop: AdminBarbershop }) {
  const { data: ins } = useBarbershopInsights(shop.id);
  return (
    <Card>
      <CardHeader>
        <CardTitle>Uso e acessos</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 text-sm">
        <div className="grid grid-cols-3 gap-3">
          <Info label="Profissionais" value={shop._count?.professionals ?? 0} />
          <Info label="Serviços" value={shop._count?.services ?? 0} />
          <Info label="Agendamentos" value={shop._count?.appointments ?? 0} />
        </div>
        {ins && (
          <>
            <div className="grid grid-cols-3 gap-3 border-t border-zinc-100 pt-4">
              <Info label="Clientes" value={ins.clients} />
              <Info label="Próximos" value={ins.upcoming} />
              <Info
                label="Avaliação"
                value={
                  ins.reviews.average !== null ? (
                    <span className="inline-flex items-center gap-1">
                      <Star className="size-3.5 fill-amber-400 text-amber-400" />
                      {ins.reviews.average.toLocaleString("pt-BR")} <span className="text-xs font-normal text-zinc-500">({ins.reviews.count})</span>
                    </span>
                  ) : (
                    "—"
                  )
                }
              />
            </div>
            <div className="border-t border-zinc-100 pt-4">
              <p className="text-xs text-zinc-500">Últimos 30 dias</p>
              <p className="mt-0.5 font-medium">
                {ins.last30Days.completed} atendimento(s) · {formatMoney(ins.last30Days.revenueCents)}
              </p>
              <p className="text-xs text-zinc-500">
                {ins.last30Days.noShow} falta(s) · {ins.last30Days.canceled} cancelado(s)
              </p>
            </div>
            <div className="space-y-2 border-t border-zinc-100 pt-4">
              <Info label="Último login do dono" value={<span className="font-normal">{ago(ins.ownerLastLoginAt)}</span>} />
              {ins.lastActivity && (
                <Info
                  label="Última atividade"
                  value={
                    <span className="font-normal">
                      {formatDateTime(ins.lastActivity.createdAt)} — {ins.lastActivity.summary}
                      {ins.lastActivity.actorName ? ` (${ins.lastActivity.actorName})` : ""}
                    </span>
                  }
                />
              )}
              {ins.failedLogins7d > 0 && (
                <p className="flex items-center gap-1.5 rounded-lg bg-red-50 px-2.5 py-1.5 text-xs text-red-700">
                  <ShieldAlert className="size-3.5" /> {ins.failedLogins7d} tentativa(s) de login com senha errada nos últimos 7 dias
                </p>
              )}
            </div>
            {ins.team.length > 0 && shop.teamType === "TEAM" && (
              <div className="border-t border-zinc-100 pt-4">
                <p className="mb-2 text-xs text-zinc-500">Equipe</p>
                <div className="space-y-2">
                  {ins.team.map((p) => (
                    <div key={p.id} className={p.active ? "" : "opacity-50"}>
                      <p className="font-medium">
                        {p.name}
                        {!p.active && <span className="text-xs font-normal text-zinc-500"> · desativado</span>}
                      </p>
                      <p className="text-xs text-zinc-500">
                        {p.email ? (
                          <>
                            {p.email} · {p.pendingPassword ? "ainda não trocou a senha temporária" : `último login: ${p.lastLoginAt ? formatDateTime(p.lastLoginAt) : "—"}`}
                          </>
                        ) : (
                          "sem login próprio"
                        )}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}

/** "Esqueci minha senha": gera uma senha temporária e o admin manda pelo WhatsApp */
function ResetOwnerPassword({ shop }: { shop: AdminBarbershop }) {
  const reset = useResetOwnerPassword();
  const [temp, setTemp] = React.useState<string | null>(null);

  return (
    <>
      <Button
        size="sm"
        variant="outline"
        className="mt-1 w-full"
        loading={reset.isPending}
        onClick={() =>
          confirm(`Gerar uma senha temporária para ${shop.owner.name}? A senha atual para de funcionar e os aparelhos logados saem.`) &&
          reset.mutate(shop.id, { onSuccess: (r) => setTemp(r.tempPassword) })
        }
      >
        <KeyRound /> Gerar senha temporária
      </Button>
      <TempPasswordDialog
        password={temp}
        onClose={() => setTemp(null)}
        title="Senha temporária criada"
        name={shop.owner.name}
        email={shop.owner.email}
        phone={shop.owner.phone}
        context={`ao painel da ${shop.name}`}
      />
    </>
  );
}

function Info({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs text-zinc-500">{label}</p>
      <div className="mt-0.5 font-medium">{value}</div>
    </div>
  );
}

function suggestedPlan(plans: Plan[], shop: AdminBarbershop) {
  const active = plans.filter((p) => p.active);
  const count = shop._count?.professionals ?? 1;
  return active.find((p) => p.maxProfessionals === null || p.maxProfessionals >= count) ?? active[0];
}

function ApprovalCard({ shop }: { shop: AdminBarbershop }) {
  const { data: plans } = usePlans();
  const approve = useApprove();
  const reject = useReject();
  const [planId, setPlanId] = React.useState("");
  const [price, setPrice] = React.useState("");
  const [billingDay, setBillingDay] = React.useState(String(Math.min(new Date().getDate(), 28)));
  const [trialDays, setTrialDays] = React.useState("0");

  React.useEffect(() => {
    if (plans && !planId) {
      const p = suggestedPlan(plans, shop);
      if (p) {
        setPlanId(p.id);
        setPrice(fromCents(p.priceCents));
      }
    }
  }, [plans, planId, shop]);

  const onPlan = (id: string) => {
    setPlanId(id);
    const p = plans?.find((x) => x.id === id);
    if (p) setPrice(fromCents(p.priceCents));
  };

  return (
    <Card className="border-amber-200 ring-4 ring-amber-50">
      <CardHeader>
        <div>
          <CardTitle>Aprovar cadastro</CardTitle>
          <p className="mt-0.5 text-sm text-zinc-500">Defina o plano e as condições de cobrança.</p>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <Field label="Plano">
          <Select value={planId} onChange={(e) => onPlan(e.target.value)}>
            {plans
              ?.filter((p) => p.active)
              .map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} — {formatMoney(p.priceCents)} · {p.maxProfessionals ? `até ${p.maxProfessionals} prof.` : "ilimitado"}
                </option>
              ))}
          </Select>
        </Field>
        <div className="grid grid-cols-3 gap-3">
          <Field label="Valor/mês (R$)" hint="Pode negociar">
            <Input inputMode="decimal" value={price} onChange={(e) => setPrice(e.target.value)} />
          </Field>
          <Field label="Dia do venc.">
            <Input type="number" min={1} max={28} value={billingDay} onChange={(e) => setBillingDay(e.target.value)} />
          </Field>
          <Field label="Cortesia (dias)">
            <Input type="number" min={0} max={90} value={trialDays} onChange={(e) => setTrialDays(e.target.value)} />
          </Field>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Button
            variant="success"
            className="flex-1"
            loading={approve.isPending}
            onClick={() =>
              approve.mutate({
                id: shop.id,
                planId,
                priceCents: toCents(price),
                billingDay: Number(billingDay),
                trialDays: Number(trialDays),
              })
            }
          >
            Aprovar e ativar
          </Button>
          {shop.status === "PENDING" && (
            <Button
              variant="outline"
              className="text-red-600"
              loading={reject.isPending}
              onClick={() => {
                const reason = prompt("Motivo da recusa (opcional, o dono verá):");
                if (reason !== null) reject.mutate({ id: shop.id, reason: reason || undefined });
              }}
            >
              Recusar
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function EditSubscription({ shop }: { shop: AdminBarbershop }) {
  const { data: plans } = usePlans();
  const change = useChangeSubscription();
  const sub = shop.subscription!;
  const [open, setOpen] = React.useState(false);
  const [planId, setPlanId] = React.useState(sub.planId);
  const [price, setPrice] = React.useState(fromCents(sub.priceCents));
  const [billingDay, setBillingDay] = React.useState(String(sub.billingDay));

  return (
    <>
      <Button size="sm" variant="outline" onClick={() => setOpen(true)}>
        Alterar
      </Button>
      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        title="Alterar assinatura"
        description="Vale a partir da próxima cobrança gerada."
        footer={
          <>
            <Button variant="outline" onClick={() => setOpen(false)} className="flex-1 sm:flex-none">
              Cancelar
            </Button>
            <Button
              loading={change.isPending}
              className="flex-1 sm:flex-none"
              onClick={() =>
                change.mutate(
                  { id: shop.id, planId, priceCents: toCents(price), billingDay: Number(billingDay) },
                  { onSuccess: () => setOpen(false) },
                )
              }
            >
              Salvar
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Field label="Plano">
            <Select
              value={planId}
              onChange={(e) => {
                setPlanId(e.target.value);
                const p = plans?.find((x) => x.id === e.target.value);
                if (p) setPrice(fromCents(p.priceCents));
              }}
            >
              {plans?.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} — {formatMoney(p.priceCents)}
                </option>
              ))}
            </Select>
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Valor/mês (R$)">
              <Input inputMode="decimal" value={price} onChange={(e) => setPrice(e.target.value)} />
            </Field>
            <Field label="Dia do vencimento">
              <Input type="number" min={1} max={28} value={billingDay} onChange={(e) => setBillingDay(e.target.value)} />
            </Field>
          </div>
          {sub.payments?.some((p) => p.status === "PENDING") && (
            <p className="text-xs text-zinc-500">
              Cobranças já geradas mantêm o valor original (ex.: vencimento {formatDateOnly(sub.payments.find((p) => p.status === "PENDING")!.dueDate)}).
            </p>
          )}
        </div>
      </Dialog>
    </>
  );
}
