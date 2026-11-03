import type {
  AppointmentStatus,
  BookingMode,
  QueueStatus,
  BarbershopStatus,
  PaymentStatus,
  Role,
  SubscriptionStatus,
  TeamType,
} from "@navalha/shared";

/** Tipos das respostas da API (espelham o que o backend devolve) */

export interface User {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  role: Role;
}

export interface Plan {
  id: string;
  name: string;
  description: string | null;
  priceCents: number;
  maxProfessionals: number | null;
  active: boolean;
  _count?: { subscriptions: number };
}

export interface Payment {
  id: string;
  subscriptionId: string;
  referenceMonth: string;
  amountCents: number;
  dueDate: string;
  status: PaymentStatus;
  paidAt: string | null;
  method: string | null;
  notes: string | null;
}

export interface Subscription {
  id: string;
  planId: string;
  status: SubscriptionStatus;
  priceCents: number;
  billingDay: number;
  trialEndsAt: string | null;
  startedAt: string;
  plan: Plan;
  payments?: Payment[];
}

export interface Barbershop {
  id: string;
  slug: string;
  name: string;
  status: BarbershopStatus;
  statusReason: string | null;
  teamType: TeamType;
  bookingMode: BookingMode;
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
  timezone: string;
  slotIntervalMinutes: number;
  minAdvanceMinutes: number;
  maxAdvanceDays: number;
  cancelMinAdvanceMinutes: number;
  approvedAt: string | null;
  createdAt: string;
  subscription: Subscription | null;
  _count?: { professionals: number; services?: number; appointments?: number };
}

export interface AdminBarbershop extends Barbershop {
  owner: { id: string; name: string; email: string; phone: string | null };
  overduePayments?: number;
}

export interface Service {
  id: string;
  name: string;
  description: string | null;
  durationMinutes: number;
  priceCents: number;
  active: boolean;
}

export interface WorkingHour {
  id?: string;
  weekday: number;
  startMinute: number;
  endMinute: number;
}

export interface Professional {
  id: string;
  name: string;
  bio: string | null;
  avatarUrl: string | null;
  active: boolean;
  queueOpen: boolean;
  serviceIds: string[];
  workingHours: WorkingHour[];
}

export interface Appointment {
  id: string;
  professionalId: string;
  serviceId: string;
  clientName: string;
  clientPhone: string;
  startsAt: string;
  endsAt: string;
  status: AppointmentStatus;
  priceCents: number;
  notes: string | null;
  source: string;
  accessToken: string;
  canceledBy: "client" | "barbershop" | null;
  cancelReason: string | null;
  rescheduleCount: number;
  service: { name: string; durationMinutes?: number };
  professional: { name: string };
}

export interface Slot {
  startsAt: string;
  time: string;
  professionalIds: string[];
}

export interface TimeOff {
  id: string;
  professionalId: string;
  startsAt: string;
  endsAt: string;
  reason: string | null;
  professional: { name: string };
}

export interface ClientSummary {
  phone: string;
  name: string | null;
  visits: number;
  lastVisit: string;
  totalCents: number;
}

export interface QueueEntry {
  id: string;
  professionalId: string;
  serviceId: string | null;
  clientName: string;
  clientPhone: string | null;
  status: QueueStatus;
  priceCents: number;
  joinedAt: string;
  startedAt: string | null;
  service: { name: string; durationMinutes: number } | null;
  /** minutos estimados até ser chamado */
  etaMinutes?: number;
}

/** Fila de um barbeiro no painel */
export interface QueueColumn {
  id: string;
  name: string;
  avatarUrl: string | null;
  queueOpen: boolean;
  current: QueueEntry | null;
  waiting: QueueEntry[];
  estimatedWaitMinutes: number;
  doneToday: number;
}
