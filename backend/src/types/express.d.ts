import type { Barbershop, User } from "@prisma/client";

declare global {
  namespace Express {
    interface Request {
      user?: Omit<User, "passwordHash" | "tokenVersion">;
      barbershop?: Barbershop;
      /** login de barbeiro da equipe: tudo filtrado por este profissional */
      scopeProfessionalId?: string;
      /** admin da plataforma mexendo no painel de uma barbearia */
      adminActing?: boolean;
    }
  }
}

export {};
