import { useMutation, useQueries, useQuery, useQueryClient } from "@tanstack/react-query";
import type { AppointmentStatus, BookingMode, PageTheme, CreateBookingInput, RescheduleInput, ReviewInput, TeamType } from "@navalha/shared";
import { api, qs } from "@/lib/api";
import type { Slot } from "@/types/api";

export interface PublicBarbershop {
  barbershop: {
    name: string;
    slug: string;
    description: string | null;
    phone: string | null;
    whatsapp: string | null;
    instagram: string | null;
    address: string | null;
    city: string | null;
    logoUrl: string | null;
    coverUrl: string | null;
    primaryColor: string;
    secondaryColor: string;
    pageTheme: PageTheme;
    teamType: TeamType;
    bookingMode: BookingMode;
    maxAdvanceDays: number;
    timezone: string;
  };
  services: {
    id: string;
    name: string;
    description: string | null;
    durationMinutes: number;
    priceCents: number;
    /** catálogo: a primeira é a capa */
    photos: { url: string; thumbUrl: string }[];
    /** média das avaliações deste serviço (null = ainda sem avaliação) */
    rating: { average: number; count: number } | null;
  }[];
  reviews: {
    average: number | null;
    count: number;
    latest: PublicReview[];
  };
  professionals: { id: string; name: string; bio: string | null; avatarUrl: string | null; serviceIds: string[] }[];
}

export interface PublicReview {
  id: string;
  rating: number;
  comment: string | null;
  /** primeiro nome + inicial */
  clientName: string;
  createdAt: string;
  service: string;
  professional: string;
}

export interface BookingResult {
  id: string;
  startsAt: string;
  endsAt: string;
  priceCents: number;
  service: string;
  professional: string;
  accessToken: string;
}

export const usePublicBarbershop = (slug: string) =>
  useQuery({
    queryKey: ["public", slug],
    queryFn: () => api.get<PublicBarbershop>(`/public/barbershops/${slug}`),
    retry: false,
  });

export const usePublicAvailability = (slug: string, p: { serviceId?: string; professionalId?: string; date: string }) =>
  useQuery({
    queryKey: ["public", slug, "availability", p],
    queryFn: () => api.get<{ slots: Slot[] }>(`/public/barbershops/${slug}/availability${qs(p)}`),
    enabled: !!p.serviceId,
    refetchInterval: 60_000,
  });

export const useCreateBooking = (slug: string) =>
  useMutation({
    mutationFn: (input: CreateBookingInput) => api.post<BookingResult>(`/public/barbershops/${slug}/bookings`, input),
    meta: { silent: true },
  });

/** Movimento da fila de cada barbeiro (modo ordem de chegada) */
export interface PublicQueueItem {
  id: string;
  name: string;
  avatarUrl: string | null;
  open: boolean;
  inService: boolean;
  waiting: number;
  estimatedWaitMinutes: number;
}

export const usePublicQueue = (slug: string, enabled: boolean) =>
  useQuery({
    queryKey: ["public", slug, "queue"],
    queryFn: () => api.get<PublicQueueItem[]>(`/public/barbershops/${slug}/queue`),
    enabled,
    refetchInterval: 30_000,
  });

// ---------- Link do cliente (/agendamento/:token) ----------

export interface MyAppointment {
  id: string;
  status: AppointmentStatus;
  startsAt: string;
  endsAt: string;
  priceCents: number;
  clientName: string;
  notes: string | null;
  canceledBy: "client" | "barbershop" | null;
  cancelReason: string | null;
  service: { id: string; name: string; durationMinutes: number };
  professional: { id: string; name: string; avatarUrl: string | null };
  professionals: { id: string; name: string; avatarUrl: string | null }[];
  /** ainda dá para cancelar/remarcar pelo link */
  canManage: boolean;
  /** já foi atendido e ainda está no prazo para avaliar */
  canReview: boolean;
  review: { rating: number; comment: string | null } | null;
  manageDeadline: string;
  cancelMinAdvanceMinutes: number;
  barbershop: Pick<
    PublicBarbershop["barbershop"],
    "name" | "slug" | "phone" | "whatsapp" | "address" | "city" | "logoUrl" | "coverUrl" | "primaryColor" | "secondaryColor" | "pageTheme" | "maxAdvanceDays" | "teamType" | "timezone"
  >;
}

const myKey = (token: string) => ["public", "appointment", token] as const;

export const useMyAppointment = (token: string) =>
  useQuery({ queryKey: myKey(token), queryFn: () => api.get<MyAppointment>(`/public/appointments/${token}`), retry: false });

/** Vários agendamentos salvos no aparelho (página da barbearia) */
export const useMyAppointments = (tokens: string[]) =>
  useQueries({
    queries: tokens.map((t) => ({ queryKey: myKey(t), queryFn: () => api.get<MyAppointment>(`/public/appointments/${t}`), retry: false })),
  });

export const useRescheduleAvailability = (token: string, p: { date: string; professionalId?: string }, enabled: boolean) =>
  useQuery({
    queryKey: [...myKey(token), "availability", p],
    queryFn: () => api.get<{ slots: Slot[] }>(`/public/appointments/${token}/availability${qs(p)}`),
    enabled,
  });

export function useCancelMine(token: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (reason?: string) => api.post(`/public/appointments/${token}/cancel`, { reason }),
    onSuccess: () => qc.invalidateQueries({ queryKey: myKey(token) }),
    meta: { silent: true },
  });
}

export function useRescheduleMine(token: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: RescheduleInput) => api.post(`/public/appointments/${token}/reschedule`, input),
    onSuccess: () => qc.invalidateQueries({ queryKey: myKey(token) }),
    meta: { silent: true },
  });
}

export function useReviewMine(token: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: ReviewInput) => api.post<{ rating: number; comment: string | null }>(`/public/appointments/${token}/review`, input),
    onSuccess: () => qc.invalidateQueries({ queryKey: myKey(token) }),
  });
}
