export class AppError extends Error {
  constructor(
    public status: number,
    message: string,
    public code?: string,
  ) {
    super(message);
  }
}

export const badRequest = (msg: string, code?: string) => new AppError(400, msg, code);
export const unauthorized = (msg = "Não autenticado") => new AppError(401, msg, "UNAUTHORIZED");
export const forbidden = (msg = "Sem permissão") => new AppError(403, msg, "FORBIDDEN");
export const notFound = (msg = "Não encontrado") => new AppError(404, msg, "NOT_FOUND");
export const conflict = (msg: string, code?: string) => new AppError(409, msg, code ?? "CONFLICT");
