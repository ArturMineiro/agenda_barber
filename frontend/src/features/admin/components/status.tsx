import type { BarbershopStatus, PaymentStatus, SubscriptionStatus } from "@navalha/shared";
import { Badge } from "@/components/ui/badge";

const SHOP: Record<BarbershopStatus, { label: string; tone: "warning" | "success" | "danger" | "neutral" }> = {
  PENDING: { label: "Aguardando aprovação", tone: "warning" },
  ACTIVE: { label: "Ativa", tone: "success" },
  SUSPENDED: { label: "Suspensa", tone: "danger" },
  REJECTED: { label: "Recusada", tone: "neutral" },
};

const PAYMENT: Record<PaymentStatus, { label: string; tone: "info" | "success" | "danger" | "neutral" }> = {
  PENDING: { label: "Em aberto", tone: "info" },
  PAID: { label: "Pago", tone: "success" },
  OVERDUE: { label: "Atrasado", tone: "danger" },
  CANCELED: { label: "Abonado", tone: "neutral" },
};

const SUB: Record<SubscriptionStatus, { label: string; tone: "info" | "success" | "danger" | "neutral" }> = {
  TRIAL: { label: "Cortesia", tone: "info" },
  ACTIVE: { label: "Em dia", tone: "success" },
  PAST_DUE: { label: "Inadimplente", tone: "danger" },
  CANCELED: { label: "Cancelada", tone: "neutral" },
};

export const ShopStatusBadge = ({ status }: { status: BarbershopStatus }) => <Badge tone={SHOP[status].tone}>{SHOP[status].label}</Badge>;
export const PaymentStatusBadge = ({ status }: { status: PaymentStatus }) => <Badge tone={PAYMENT[status].tone}>{PAYMENT[status].label}</Badge>;
export const SubStatusBadge = ({ status }: { status: SubscriptionStatus }) => <Badge tone={SUB[status].tone}>{SUB[status].label}</Badge>;

export const SHOP_STATUS_LABEL = Object.fromEntries(Object.entries(SHOP).map(([k, v]) => [k, v.label])) as Record<BarbershopStatus, string>;
export const PAYMENT_STATUS_LABEL = Object.fromEntries(Object.entries(PAYMENT).map(([k, v]) => [k, v.label])) as Record<PaymentStatus, string>;
