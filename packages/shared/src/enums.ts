export const ROLES = ["SUPER_ADMIN", "OWNER", "BARBER", "CLIENT"] as const;
export type Role = (typeof ROLES)[number];

export const BARBERSHOP_STATUS = ["PENDING", "ACTIVE", "SUSPENDED", "REJECTED"] as const;
export type BarbershopStatus = (typeof BARBERSHOP_STATUS)[number];

/** SOLO = barbeiro que trabalha sozinho; TEAM = barbearia com equipe */
export const TEAM_TYPES = ["SOLO", "TEAM"] as const;
export type TeamType = (typeof TEAM_TYPES)[number];

export const SUBSCRIPTION_STATUS = ["TRIAL", "ACTIVE", "PAST_DUE", "CANCELED"] as const;
export type SubscriptionStatus = (typeof SUBSCRIPTION_STATUS)[number];

export const PAYMENT_STATUS = ["PENDING", "PAID", "OVERDUE", "CANCELED"] as const;
export type PaymentStatus = (typeof PAYMENT_STATUS)[number];

export const APPOINTMENT_STATUS = ["CONFIRMED", "CANCELED", "COMPLETED", "NO_SHOW"] as const;
export type AppointmentStatus = (typeof APPOINTMENT_STATUS)[number];

export const WEEKDAYS = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"] as const;
export const WEEKDAYS_SHORT = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"] as const;
/** Nome do produto — altere aqui para renomear em todo o sistema */
export const APP_NAME = "Navalha";


/** SCHEDULE = agenda com horário marcado; QUEUE = ordem de chegada */
export const BOOKING_MODES = ["SCHEDULE", "QUEUE"] as const;
export type BookingMode = (typeof BOOKING_MODES)[number];

/** Fundo da página pública da barbearia */
export const PAGE_THEMES = ["LIGHT", "DARK"] as const;
export type PageTheme = (typeof PAGE_THEMES)[number];

export const QUEUE_STATUS = ["WAITING", "IN_SERVICE", "DONE", "NO_SHOW", "CANCELED"] as const;
export type QueueStatus = (typeof QUEUE_STATUS)[number];
