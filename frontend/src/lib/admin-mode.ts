import { setCurrentBarbershop } from "./api";
import { queryClient } from "./query-client";

/**
 * Modo admin: o administrador da plataforma abre o painel de uma barbearia como se fosse o dono.
 * Fica guardado só nesta aba (sessionStorage): fechar a aba ou "Voltar ao admin" encerra.
 * Toda ação feita assim vai para o log de atividades marcada como do admin.
 */

const KEY = "navalha-admin-mode";

export interface AdminMode {
  id: string;
  name: string;
}

function read(): AdminMode | null {
  try {
    const raw = sessionStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as AdminMode) : null;
  } catch {
    return null;
  }
}

let current = read();
setCurrentBarbershop(current?.id ?? null);

export const getAdminMode = () => current;

/** Painel guarda cache sem o id da barbearia na chave: ao trocar, limpa tudo do painel */
function switchTo(mode: AdminMode | null) {
  current = mode;
  try {
    if (mode) sessionStorage.setItem(KEY, JSON.stringify(mode));
    else sessionStorage.removeItem(KEY);
  } catch {
    /* aba anônima sem storage: vale só até recarregar */
  }
  setCurrentBarbershop(mode?.id ?? null);
  queryClient.removeQueries({ queryKey: ["panel"] });
}

export const enterAdminMode = (mode: AdminMode) => switchTo(mode);
export const exitAdminMode = () => switchTo(null);
