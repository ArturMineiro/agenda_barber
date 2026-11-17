/**
 * Depois de um deploy, quem estava com o site aberto ainda tem o index antigo:
 * ao abrir outra área (ex.: cadastro → painel) o navegador pede um arquivo que não existe mais.
 * Nesse caso basta recarregar a página uma vez para pegar a versão nova.
 */
const KEY = "navalha-stale-reload";

export function isStaleBuildError(err: unknown) {
  const msg = err instanceof Error ? `${err.name} ${err.message}` : String(err ?? "");
  return /dynamically imported module|Importing a module script failed|error loading dynamically imported|Unable to preload CSS|ChunkLoadError|Loading chunk/i.test(
    msg,
  );
}

/** Recarrega uma vez (evita loop se o problema for outro). Retorna false se já tentou há pouco. */
export function reloadForNewVersion() {
  try {
    const last = Number(sessionStorage.getItem(KEY) ?? 0);
    if (Date.now() - last < 30_000) return false;
    sessionStorage.setItem(KEY, String(Date.now()));
  } catch {
    // sem sessionStorage: recarrega mesmo assim
  }
  window.location.reload();
  return true;
}
