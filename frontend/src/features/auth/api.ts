import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { ChangePasswordInput, LoginInput, RegisterOwnerInput } from "@navalha/shared";
import { api, ApiError } from "@/lib/api";
import type { User } from "@/types/api";

export const meKey = ["auth", "me"] as const;

export function useMe() {
  return useQuery({
    queryKey: meKey,
    queryFn: async () => {
      try {
        return (await api.get<{ user: User }>("/auth/me")).user;
      } catch (err) {
        if (err instanceof ApiError && err.status === 401) return null;
        throw err;
      }
    },
    staleTime: 5 * 60_000,
  });
}

export function useLogin() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: LoginInput) => api.post<{ user: User }>("/auth/login", input),
    onSuccess: ({ user }) => qc.setQueryData(meKey, user),
    meta: { silent: true },
  });
}

export function useRegister() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: RegisterOwnerInput) => api.post<{ user: User }>("/auth/register", input),
    onSuccess: ({ user }) => qc.setQueryData(meKey, user),
    meta: { silent: true },
  });
}

export function useLogout() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api.post("/auth/logout"),
    onSuccess: () => {
      qc.clear();
      qc.setQueryData(meKey, null);
    },
  });
}

export function useChangePassword() {
  return useMutation({
    mutationFn: (input: ChangePasswordInput) => api.post("/auth/password", input),
    meta: { silent: true },
  });
}

export async function checkSlug(slug: string) {
  return api.get<{ available: boolean; reason?: string }>(`/auth/slug-available/${encodeURIComponent(slug)}`);
}

export const homeFor = (user: User) => (user.role === "SUPER_ADMIN" ? "/admin" : "/painel");
