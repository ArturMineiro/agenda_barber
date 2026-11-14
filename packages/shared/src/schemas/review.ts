import { z } from "zod";
import { optionalTextSchema } from "./common";

/** Cliente avalia o atendimento pelo link do agendamento */
export const reviewSchema = z.object({
  rating: z.number().int().min(1, "Escolha de 1 a 5 estrelas").max(5),
  comment: optionalTextSchema(500),
});
export type ReviewInput = z.input<typeof reviewSchema>;

/** Dono oculta/mostra a avaliação na página pública */
export const reviewVisibilitySchema = z.object({ hidden: z.boolean() });

/** Quantos dias depois do atendimento o cliente ainda pode avaliar */
export const REVIEW_WINDOW_DAYS = 60;
