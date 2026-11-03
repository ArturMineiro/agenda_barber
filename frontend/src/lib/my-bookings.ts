/**
 * Agendamentos feitos neste aparelho (sem login).
 * Guardamos só o token do link — os dados vêm sempre da API.
 * Se o cliente limpar o navegador, ainda tem o link recebido na confirmação.
 */
const KEY = "navalha:bookings";

export interface SavedBooking {
  token: string;
  slug: string;
  startsAt: string;
}

function read(): SavedBooking[] {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? "[]") as SavedBooking[];
  } catch {
    return [];
  }
}

function write(list: SavedBooking[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify(list));
  } catch {
    /* modo privado: tudo bem */
  }
}

export function saveBooking(b: SavedBooking) {
  write([...read().filter((x) => x.token !== b.token), b]);
}

export function updateSavedBooking(token: string, startsAt: string) {
  write(read().map((x) => (x.token === token ? { ...x, startsAt } : x)));
}

/** Próximos agendamentos desta barbearia salvos no aparelho (descarta os antigos) */
export function upcomingBookings(slug: string) {
  const cutoff = Date.now() - 2 * 60 * 60 * 1000;
  const all = read().filter((x) => new Date(x.startsAt).getTime() > cutoff);
  write(all);
  return all.filter((x) => x.slug === slug).sort((a, b) => a.startsAt.localeCompare(b.startsAt));
}
