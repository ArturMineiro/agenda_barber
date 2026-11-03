import { z } from "zod";
import { QUEUE_STATUS } from "../enums";
import { idSchema, optionalPhoneSchema } from "./common";

/** Barbeiro adiciona quem chegou na barbearia */
export const queueEntrySchema = z.object({
  professionalId: idSchema,
  serviceId: idSchema.nullish(),
  clientName: z.string().trim().min(2, "Informe o nome do cliente"),
  clientPhone: optionalPhoneSchema,
});
export type QueueEntryInput = z.input<typeof queueEntrySchema>;

export const queueStatusSchema = z.object({
  status: z.enum(QUEUE_STATUS),
});

export const queueOpenSchema = z.object({
  open: z.boolean(),
});
