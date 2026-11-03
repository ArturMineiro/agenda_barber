import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import type {
  ApproveBarbershopInput,
  BarbershopStatus,
  ChangeSubscriptionInput,
  MarkPaymentPaidInput,
  PaymentStatus,
  PlanInput,
} from "@navalha/shared";
import { api, qs } from "@/lib/api";
import type { AdminBarbershop, Payment, Plan } from "@/types/api";

export const adminKeys = {
  all: ["admin"] as const,
  stats: () => [...adminKeys.all, "stats"] as const,
  barbershops: (f: object) => [...adminKeys.all, "barbershops", f] as const,
  barbershop: (id: string) => [...adminKeys.all, "barbershop", id] as const,
  payments: (status?: string) => [...adminKeys.all, "payments", status ?? "all"] as const,
  plans: () => [...adminKeys.all, "plans"] as const,
};

export interface AdminStats {
  barbershops: Record<BarbershopStatus, number>;
  mrrCents: number;
  overdueCount: number;
  overdueCents: number;
  receivedThisMonthCents: number;
}

export const useAdminStats = () =>
  useQuery({ queryKey: adminKeys.stats(), queryFn: () => api.get<AdminStats>("/admin/stats") });

export const useAdminBarbershops = (filters: { status?: BarbershopStatus; q?: string }) =>
  useQuery({
    queryKey: adminKeys.barbershops(filters),
    queryFn: () => api.get<AdminBarbershop[]>(`/admin/barbershops${qs(filters)}`),
  });

export const useAdminBarbershop = (id: string) =>
  useQuery({ queryKey: adminKeys.barbershop(id), queryFn: () => api.get<AdminBarbershop>(`/admin/barbershops/${id}`) });

export interface AdminPayment extends Payment {
  subscription: {
    plan: { name: string };
    barbershop: { id: string; name: string; slug: string; status: BarbershopStatus; owner: { name: string; email: string; phone: string | null } };
  };
}

export const useAdminPayments = (status?: PaymentStatus) =>
  useQuery({ queryKey: adminKeys.payments(status), queryFn: () => api.get<AdminPayment[]>(`/admin/payments${qs({ status })}`) });

export const usePlans = () => useQuery({ queryKey: adminKeys.plans(), queryFn: () => api.get<Plan[]>("/admin/plans") });

/** Toda ação do admin invalida o cache inteiro do admin: status, cobranças e contadores mudam juntos */
function useAdminAction<TVars>(fn: (v: TVars) => Promise<unknown>, success: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: adminKeys.all });
      toast.success(success);
    },
  });
}

export const useApprove = () =>
  useAdminAction(({ id, ...input }: ApproveBarbershopInput & { id: string }) => api.post(`/admin/barbershops/${id}/approve`, input), "Barbearia aprovada");

export const useReject = () =>
  useAdminAction(({ id, reason }: { id: string; reason?: string }) => api.post(`/admin/barbershops/${id}/reject`, { reason }), "Cadastro recusado");

export const useSuspend = () =>
  useAdminAction(({ id, reason }: { id: string; reason?: string }) => api.post(`/admin/barbershops/${id}/suspend`, { reason }), "Barbearia suspensa");

export const useReactivate = () => useAdminAction((id: string) => api.post(`/admin/barbershops/${id}/reactivate`), "Barbearia reativada");

export const useChangeSubscription = () =>
  useAdminAction(
    ({ id, ...input }: ChangeSubscriptionInput & { id: string }) => api.put(`/admin/barbershops/${id}/subscription`, input),
    "Assinatura atualizada",
  );

export const useMarkPaid = () =>
  useAdminAction(({ id, ...input }: MarkPaymentPaidInput & { id: string }) => api.post(`/admin/payments/${id}/pay`, input), "Pagamento registrado");

export const useCancelPayment = () => useAdminAction((id: string) => api.post(`/admin/payments/${id}/cancel`), "Cobrança abonada");

export const useSyncBilling = () => useAdminAction(() => api.post("/admin/billing/sync"), "Cobranças sincronizadas");

export const useSavePlan = () =>
  useAdminAction(
    ({ id, ...input }: PlanInput & { id?: string }) => (id ? api.put(`/admin/plans/${id}`, input) : api.post("/admin/plans", input)),
    "Plano salvo",
  );
