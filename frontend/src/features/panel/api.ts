import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import type {
  AppointmentStatus,
  BarbershopSettingsInput,
  CreateBookingInput,
  ProfessionalInput,
  ServiceInput,
  TimeOffInput,
  QueueEntryInput,
  QueueStatus,
  WorkingHour,
} from "@navalha/shared";
import { api, qs } from "@/lib/api";
import type { Appointment, Barbershop, ClientSummary, Professional, QueueColumn, Service, Slot, TimeOff } from "@/types/api";

/** Chaves de cache centralizadas: facilita invalidar o que mudou */
export const panelKeys = {
  all: ["panel"] as const,
  barbershop: () => [...panelKeys.all, "barbershop"] as const,
  dashboard: () => [...panelKeys.all, "dashboard"] as const,
  services: () => [...panelKeys.all, "services"] as const,
  professionals: () => [...panelKeys.all, "professionals"] as const,
  appointments: (date: string, professionalId?: string, days = 1) => [...panelKeys.all, "appointments", date, professionalId ?? "all", days] as const,
  availability: (p: object) => [...panelKeys.all, "availability", p] as const,
  timeOffs: () => [...panelKeys.all, "time-offs"] as const,
  clients: (q: string) => [...panelKeys.all, "clients", q] as const,
  queue: () => [...panelKeys.all, "queue"] as const,
};

// ---------- Barbearia ----------

export const useBarbershop = () =>
  useQuery({ queryKey: panelKeys.barbershop(), queryFn: () => api.get<Barbershop>("/panel/barbershop") });

export function useUpdateBarbershop() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: BarbershopSettingsInput) => api.put<Barbershop>("/panel/barbershop", input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: panelKeys.barbershop() });
      toast.success("Alterações salvas");
    },
  });
}

export interface Dashboard {
  today: { count: number; revenueCents: number };
  month: { count: number; revenueCents: number };
  upcoming: Appointment[];
}
export const useDashboard = () =>
  useQuery({ queryKey: panelKeys.dashboard(), queryFn: () => api.get<Dashboard>("/panel/dashboard") });

// ---------- Serviços ----------

export const useServices = () =>
  useQuery({ queryKey: panelKeys.services(), queryFn: () => api.get<Service[]>("/panel/services") });

export function useSaveService() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...input }: ServiceInput & { id?: string }) =>
      id ? api.put<Service>(`/panel/services/${id}`, input) : api.post<Service>("/panel/services", input),
    onSuccess: (_d, v) => {
      qc.invalidateQueries({ queryKey: panelKeys.services() });
      qc.invalidateQueries({ queryKey: panelKeys.professionals() });
      toast.success(v.id ? "Serviço atualizado" : "Serviço criado");
    },
  });
}

// ---------- Fotos do catálogo ----------

export function useServicePhotoActions(serviceId: string) {
  const qc = useQueryClient();
  const refresh = () => qc.invalidateQueries({ queryKey: panelKeys.services() });
  return {
    refresh,
    makeCover: useMutation({
      mutationFn: (photoId: string) => api.post(`/panel/services/${serviceId}/photos/${photoId}/cover`),
      onSuccess: () => {
        refresh();
        toast.success("Capa atualizada");
      },
    }),
    remove: useMutation({
      mutationFn: (photoId: string) => api.delete(`/panel/services/${serviceId}/photos/${photoId}`),
      onSuccess: refresh,
    }),
  };
}

export function useDeleteService() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/panel/services/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: panelKeys.services() });
      toast.success("Serviço removido");
    },
  });
}

// ---------- Profissionais ----------

export const useProfessionals = () =>
  useQuery({ queryKey: panelKeys.professionals(), queryFn: () => api.get<Professional[]>("/panel/professionals") });

export function useSaveProfessional() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...input }: ProfessionalInput & { id?: string }) =>
      id ? api.put(`/panel/professionals/${id}`, input) : api.post("/panel/professionals", input),
    onSuccess: (_d, v) => {
      qc.invalidateQueries({ queryKey: panelKeys.professionals() });
      qc.invalidateQueries({ queryKey: panelKeys.barbershop() });
      toast.success(v.id ? "Profissional atualizado" : "Profissional adicionado");
    },
  });
}

export function useDeleteProfessional() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/panel/professionals/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: panelKeys.professionals() });
      toast.success("Profissional removido");
    },
  });
}

export function useSaveHours() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, hours }: { id: string; hours: WorkingHour[] }) => api.put(`/panel/professionals/${id}/hours`, { hours }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: panelKeys.professionals() });
      toast.success("Horários salvos");
    },
  });
}

// ---------- Bloqueios ----------

export const useTimeOffs = () =>
  useQuery({ queryKey: panelKeys.timeOffs(), queryFn: () => api.get<TimeOff[]>("/panel/time-offs") });

export function useCreateTimeOff() {
  const qc = useQueryClient();
  return useMutation({
    /** conflicts = clientes já marcados no período (a folga não desmarca ninguém sozinha) */
    mutationFn: (input: TimeOffInput) => api.post<TimeOff & { conflicts: number }>("/panel/time-offs", input),
    onSuccess: (r) => {
      qc.invalidateQueries({ queryKey: panelKeys.timeOffs() });
      if (!r.conflicts) toast.success("Folga salva");
    },
  });
}

export function useDeleteTimeOff() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/panel/time-offs/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: panelKeys.timeOffs() }),
  });
}

// ---------- Agenda ----------

/** days: 1 = o dia; 7 = a semana a partir de `date` */
export const useAppointments = (date: string, professionalId?: string, days = 1) =>
  useQuery({
    queryKey: panelKeys.appointments(date, professionalId, days),
    queryFn: () => api.get<Appointment[]>(`/panel/appointments${qs({ date, professionalId, days })}`),
    refetchInterval: 60_000, // novos agendamentos pelo link aparecem sozinhos
  });

export const usePanelAvailability = (p: { serviceId?: string; professionalId?: string; date: string }) =>
  useQuery({
    queryKey: panelKeys.availability(p),
    queryFn: () => api.get<{ slots: Slot[] }>(`/panel/availability${qs(p)}`),
    enabled: !!p.serviceId,
  });

export function useCreateAppointment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateBookingInput) => api.post<Appointment>("/panel/appointments", input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: panelKeys.all });
      toast.success("Agendamento criado");
    },
  });
}

export function useCancelAppointment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason?: string }) => api.post(`/panel/appointments/${id}/cancel`, { reason }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: panelKeys.all });
      toast.success("Horário desmarcado");
    },
  });
}

export function useUpdateAppointmentStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: AppointmentStatus }) =>
      api.patch(`/panel/appointments/${id}/status`, { status }),
    onSuccess: () => qc.invalidateQueries({ queryKey: panelKeys.all }),
  });
}

export const useClients = (q: string) =>
  useQuery({ queryKey: panelKeys.clients(q), queryFn: () => api.get<ClientSummary[]>(`/panel/clients${qs({ q })}`) });

// ---------- Fila (ordem de chegada) ----------

export const useQueue = () =>
  useQuery({
    queryKey: panelKeys.queue(),
    queryFn: () => api.get<QueueColumn[]>("/panel/queue"),
    refetchInterval: 15_000, // atualiza a espera estimada e outros aparelhos da barbearia
  });

function useQueueAction<T>(fn: (v: T) => Promise<unknown>, success?: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: panelKeys.queue() });
      qc.invalidateQueries({ queryKey: panelKeys.dashboard() });
      if (success) toast.success(success);
    },
  });
}

export const useAddToQueue = () => useQueueAction((input: QueueEntryInput) => api.post("/panel/queue", input), "Cliente adicionado à fila");

export const useCallNext = () =>
  useQueueAction((professionalId: string) => api.post<{ next: { clientName: string } | null }>("/panel/queue/next", { professionalId }));

export const useSetQueueStatus = () =>
  useQueueAction(({ id, status }: { id: string; status: QueueStatus }) => api.patch(`/panel/queue/${id}/status`, { status }));

export const useToggleQueueOpen = () =>
  useQueueAction(({ id, open }: { id: string; open: boolean }) => api.patch(`/panel/queue/professionals/${id}/open`, { open }));

// ---------- Lembretes (dia seguinte) ----------

export interface ReminderItem {
  id: string;
  clientName: string;
  clientPhone: string;
  startsAt: string;
  accessToken: string;
  reminderSentAt: string | null;
  service: { name: string };
  professional: { name: string };
}

const remindersKey = (date?: string) => [...panelKeys.all, "reminders", date ?? "amanha"] as const;

export const useReminders = (date?: string) =>
  useQuery({
    queryKey: remindersKey(date),
    queryFn: () => api.get<{ date: string; appointments: ReminderItem[] }>(`/panel/reminders${qs({ date })}`),
  });

/** Marca como lembrado na hora (otimista): o WhatsApp já abriu */
export function useMarkReminder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.post(`/panel/appointments/${id}/reminder`),
    onMutate: (id) => {
      const now = new Date().toISOString();
      qc.setQueriesData<{ date: string; appointments: ReminderItem[] }>({ queryKey: [...panelKeys.all, "reminders"] }, (d) =>
        d ? { ...d, appointments: d.appointments.map((a) => (a.id === id ? { ...a, reminderSentAt: now } : a)) } : d,
      );
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: [...panelKeys.all, "reminders"] });
      qc.invalidateQueries({ queryKey: [...panelKeys.all, "appointments"] });
    },
  });
}

// ---------- Avaliações ----------

export interface PanelReview {
  id: string;
  rating: number;
  comment: string | null;
  clientName: string;
  hidden: boolean;
  createdAt: string;
  service: { name: string };
  professional: { name: string };
  appointment: { startsAt: string; clientPhone: string };
}

export interface PanelReviews {
  average: number | null;
  count: number;
  distribution: Record<1 | 2 | 3 | 4 | 5, number>;
  reviews: PanelReview[];
}

const reviewsKey = [...panelKeys.all, "reviews"] as const;

export const useReviews = () => useQuery({ queryKey: reviewsKey, queryFn: () => api.get<PanelReviews>("/panel/reviews") });

export function useSetReviewHidden() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, hidden }: { id: string; hidden: boolean }) => api.patch(`/panel/reviews/${id}`, { hidden }),
    onSuccess: (_d, v) => {
      qc.invalidateQueries({ queryKey: reviewsKey });
      toast.success(v.hidden ? "Avaliação ocultada da página" : "Avaliação visível na página");
    },
  });
}
