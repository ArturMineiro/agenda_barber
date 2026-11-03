import { z } from "zod";
import { APPOINTMENT_STATUS } from "../enums";
import { dateStringSchema, idSchema, optionalTextSchema, phoneSchema } from "./common";

export const availabilityQuerySchema = z.object({
  serviceId: idSchema,
  /** Omitido = qualquer profissional disponível */
  professionalId: idSchema.optional(),
  date: dateStringSchema,
});
export type AvailabilityQuery = z.infer<typeof availabilityQuerySchema>;

export const createBookingSchema = z.object({
  serviceId: idSchema,
  professionalId: idSchema,
  startsAt: z.iso.datetime({ offset: true }),
  clientName: z.string().trim().min(2, "Informe seu nome"),
  clientPhone: phoneSchema,
  notes: optionalTextSchema(300),
});
export type CreateBookingInput = z.input<typeof createBookingSchema>;

/** Agendamento manual feito pelo dono no painel (ignora antecedência mínima) */
export const manualAppointmentSchema = createBookingSchema;

/** Cliente remarca pelo link: mesmo serviço, novo horário (profissional pode mudar) */
export const rescheduleSchema = z.object({
  startsAt: z.iso.datetime({ offset: true }),
  professionalId: idSchema,
});
export type RescheduleInput = z.input<typeof rescheduleSchema>;

export const rescheduleAvailabilityQuerySchema = z.object({
  date: dateStringSchema,
  professionalId: idSchema.optional(),
});

/** Cancelamento (cliente ou dono), com motivo opcional */
export const cancelAppointmentSchema = z.object({
  reason: optionalTextSchema(200),
});
export type CancelAppointmentInput = z.input<typeof cancelAppointmentSchema>;

export const updateAppointmentStatusSchema = z.object({
  status: z.enum(APPOINTMENT_STATUS),
});
