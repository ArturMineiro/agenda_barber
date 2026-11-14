import { z } from "zod";
import { BOOKING_MODES, TEAM_TYPES } from "../enums";
import { nameSchema, passwordSchema, phoneSchema, slugSchema } from "./common";

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
  name: nameSchema("Informe seu nome"),
  email: z.string().trim().toLowerCase().pipe(z.email("E-mail inválido")),
  phone: phoneSchema,
  password: passwordSchema,
  barbershop: z.object({
    name: nameSchema("Informe o nome da barbearia"),
    slug: slugSchema,
    teamType: z.enum(TEAM_TYPES),
    bookingMode: z.enum(BOOKING_MODES),
    city: nameSchema("Informe a cidade"),
  }),
});
export type RegisterOwnerInput = z.input<typeof registerOwnerSchema>;

/** Troca de senha de quem está logado (dono ou admin) */
export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Informe a senha atual"),
    newPassword: passwordSchema,
  })
  .refine((v) => v.newPassword !== v.currentPassword, {
    message: "A nova senha precisa ser diferente da atual",
    path: ["newPassword"],
  });
export type ChangePasswordInput = z.input<typeof changePasswordSchema>;
