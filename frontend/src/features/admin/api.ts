import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import type {
  ApproveBarbershopInput,
  BarbershopStatus,
  ChangeSubscriptionInput,
  PlanInput,
} from "@navalha/shared";
import { api, qs } from "@/lib/api";
import type { AdminBarbershop, Plan } from "@/types/api";

export const adminKeys = {
  all: ["admin"] as const,
  stats: () => [...adminKeys.all, "stats"] as const,
  barbershops: (f: object) => [...adminKeys.all, "barbershops", f] as const,
  barbershop: (id: string) => [...adminKeys.all, "barbershop", id] as const,
  plans: () => [...adminKeys.all, "plans"] as const,
};

export interface AdminStats {
  barbershops: Record<BarbershopStatus, number>;
  mrrCents: number;
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



/** Senha temporária para o dono que esqueceu a dele (mostrada uma vez para o admin enviar) */
export function useResetOwnerPassword() {
  return useMutation({
    mutationFn: (id: string) =>
      api.post<{ tempPassword: string; owner: { name: string; email: string; phone: string | null } }>(`/admin/barbershops/${id}/owner-password`),
  });
}


export const useSavePlan = () =>
  useAdminAction(
    ({ id, ...input }: PlanInput & { id?: string }) => (id ? api.put(`/admin/plans/${id}`, input) : api.post("/admin/plans", input)),
    "Plano salvo",
  );

// ---------- Log de atividades ----------

export type ActivityKind = "all" | "auth" | "admin" | "changes" | "clients";

export interface ActivityItem {
  id: string;
  barbershopId: string | null;
  actorId: string | null;
  actorName: string | null;
  actorRole: "OWNER" | "BARBER" | "SUPER_ADMIN" | "CLIENT" | "SYSTEM";
  action: string;
  summary: string;
  details: Record<string, unknown> | null;
  ip: string | null;
  createdAt: string;
  barbershop: { id: string; name: string } | null;
}

export function useActivity(f: { barbershopId?: string; kind: ActivityKind; q: string }) {
  return useInfiniteQuery({
    queryKey: [...adminKeys.all, "activity", f],
    initialPageParam: undefined as string | undefined,
    queryFn: ({ pageParam }) =>
      api.get<{ items: ActivityItem[]; nextBefore: string | null }>(
        `/admin${f.barbershopId ? `/barbershops/${f.barbershopId}/activity` : "/activity"}${qs({ kind: f.kind, q: f.q, before: pageParam })}`,
      ),
    getNextPageParam: (last) => last.nextBefore ?? undefined,
  });
}

export interface BarbershopInsights {
  ownerLastLoginAt: string | null;
  failedLogins7d: number;
  lastActivity: { createdAt: string; summary: string; actorName: string | null } | null;
  clients: number;
  upcoming: number;
  last30Days: { completed: number; noShow: number; canceled: number; revenueCents: number };
  reviews: { average: number | null; count: number };
  team: { id: string; name: string; active: boolean; email: string | null; pendingPassword: boolean; lastLoginAt: string | null }[];
}

export const useBarbershopInsights = (id: string) =>
  useQuery({
    queryKey: [...adminKeys.barbershop(id), "insights"],
    queryFn: () => api.get<BarbershopInsights>(`/admin/barbershops/${id}/insights`),
  });
