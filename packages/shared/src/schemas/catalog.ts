import { z } from "zod";
import { centsSchema, dateStringSchema, idSchema, minuteOfDaySchema, optionalImageSchema, optionalTextSchema } from "./common";

export const serviceSchema = z.object({
  name: z.string().trim().min(2, "Informe o nome do serviço"),
  description: optionalTextSchema(300),
  durationMinutes: z.number().int().min(5, "Mínimo 5 min").max(480, "Máximo 8h"),
  priceCents: centsSchema,
  active: z.boolean(),
});
export type ServiceInput = z.input<typeof serviceSchema>;

export const professionalSchema = z.object({
  name: z.string().trim().min(2, "Informe o nome"),
  bio: optionalTextSchema(300),
  avatarUrl: optionalImageSchema,
  active: z.boolean(),
  serviceIds: z.array(idSchema),
});
export type ProfessionalInput = z.input<typeof professionalSchema>;

export const workingHourSchema = z
  .object({
    weekday: z.number().int().min(0).max(6),
    startMinute: minuteOfDaySchema,
    endMinute: minuteOfDaySchema,
  })
  .refine((v) => v.endMinute > v.startMinute, {
    message: "O fim deve ser depois do início",
    path: ["endMinute"],
  });
export type WorkingHour = z.infer<typeof workingHourSchema>;

/** Grade semanal completa (substitui a anterior). Permite vários intervalos no dia (ex.: pausa do almoço). */
export const workingHoursSchema = z.object({
  hours: z.array(workingHourSchema).superRefine((list, ctx) => {
    for (let d = 0; d < 7; d++) {
      const day = list.filter((h) => h.weekday === d).sort((a, b) => a.startMinute - b.startMinute);
      for (let i = 1; i < day.length; i++) {
        if (day[i]!.startMinute < day[i - 1]!.endMinute) {
          ctx.addIssue({ code: "custom", message: "Há intervalos sobrepostos no mesmo dia" });
          return;
        }
      }
    }
  }),
});
export type WorkingHoursInput = z.input<typeof workingHoursSchema>;

/** Bloqueio de agenda (folga, férias, compromisso) */
export const timeOffSchema = z
  .object({
    professionalId: idSchema,
    startsAt: z.iso.datetime({ offset: true }),
    endsAt: z.iso.datetime({ offset: true }),
    reason: optionalTextSchema(120),
  })
  .refine((v) => new Date(v.endsAt) > new Date(v.startsAt), {
    message: "O fim deve ser depois do início",
    path: ["endsAt"],
  });
export type TimeOffInput = z.input<typeof timeOffSchema>;

export const agendaQuerySchema = z.object({
  date: dateStringSchema,
  professionalId: idSchema.optional(),
});
