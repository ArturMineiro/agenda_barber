import type { Barbershop, User } from "@prisma/client";

declare global {
  namespace Express {
    interface Request {
      user?: Omit<User, "passwordHash">;
      barbershop?: Barbershop;
    }
  }
}

export {};
