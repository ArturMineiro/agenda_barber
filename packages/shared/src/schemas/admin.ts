import { z } from "zod";
import { centsSchema, idSchema, optionalTextSchema } from "./common";

export const planSchema = z.object({
  name: z.string().trim().min(2, "Informe o nome"),
  description: optionalTextSchema(300),
  priceCents: centsSchema,
  /** null = ilimitado */
  maxProfessionals: z.number().int().min(1).nullable(),
  active: z.boolean(),
});
export type PlanInput = z.input<typeof planSchema>;

/** Aprovação de uma barbearia: define plano, valor e dia de vencimento */
export const approveBarbershopSchema = z.object({
  planId: idSchema,
  /** Valor negociado; se omitido usa o preço do plano */
  priceCents: centsSchema.optional(),
  billingDay: z.number().int().min(1).max(28),
  /** Dias de cortesia antes da primeira cobrança */
  trialDays: z.number().int().min(0).max(90),
});
export type ApproveBarbershopInput = z.input<typeof approveBarbershopSchema>;

export const changeSubscriptionSchema = z.object({
  planId: idSchema,
  priceCents: centsSchema.optional(),
  billingDay: z.number().int().min(1).max(28),
});
export type ChangeSubscriptionInput = z.input<typeof changeSubscriptionSchema>;

export const rejectBarbershopSchema = z.object({
  reason: optionalTextSchema(300),
});

export const markPaymentPaidSchema = z.object({
  method: z.string().trim().max(40).default("PIX"),
  notes: optionalTextSchema(300),
});
export type MarkPaymentPaidInput = z.input<typeof markPaymentPaidSchema>;
