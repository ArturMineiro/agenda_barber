import { z } from "zod";
import { BOOKING_MODES, TEAM_TYPES } from "../enums";
import { phoneSchema, slugSchema } from "./common";

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().pipe(z.email("E-mail inválido")),
  password: z.string().min(1, "Informe a senha"),
});
export type LoginInput = z.input<typeof loginSchema>;

/**
 * Cadastro do dono: cria o usuário e já envia a solicitação da barbearia,
 * que fica PENDENTE até o super admin aprovar e atribuir um plano.
 */
export const registerOwnerSchema = z.object({
  name: z.string().trim().min(2, "Informe seu nome"),
  email: z.string().trim().toLowerCase().pipe(z.email("E-mail inválido")),
  phone: phoneSchema,
  password: z.string().min(8, "A senha precisa ter ao menos 8 caracteres"),
  barbershop: z.object({
    name: z.string().trim().min(2, "Informe o nome da barbearia"),
    slug: slugSchema,
    teamType: z.enum(TEAM_TYPES),
    bookingMode: z.enum(BOOKING_MODES),
    city: z.string().trim().min(2, "Informe a cidade"),
  }),
});
export type RegisterOwnerInput = z.input<typeof registerOwnerSchema>;
