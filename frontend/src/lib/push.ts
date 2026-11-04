import * as React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "./api";

/**
 * Notificações no celular (Web Push) + app instalável (atalho na tela de início).
 *
 * - Android/Chrome e computador: funciona direto no navegador.
 * - iPhone/iPad: só funciona com o site ADICIONADO À TELA DE INÍCIO e aberto pelo ícone (iOS 16.4+).
 */

export type Platform = "ios" | "android" | "desktop";

export function getPlatform(): Platform {
  const ua = navigator.userAgent;
  // iPadOS se apresenta como Mac; o toque denuncia
  if (/iPhone|iPad|iPod/i.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1)) return "ios";
  if (/Android/i.test(ua)) return "android";
  return "desktop";
}

/** Aberto pelo ícone da tela de início (modo app) */
export function isStandalone() {
  return (
    window.matchMedia?.("(display-mode: standalone)").matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

export function pushSupported() {
  return "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
}

/** Registra o service worker uma vez, na abertura do site */
export function registerServiceWorker() {
  if (!("serviceWorker" in navigator)) return;
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch((err) => console.warn("[sw] falhou ao registrar", err));
  });
}

// ---------- instalar (Android/Chrome mostram um convite nativo) ----------

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

let deferredInstall: BeforeInstallPromptEvent | null = null;
const installListeners = new Set<() => void>();
if (typeof window !== "undefined") {
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    deferredInstall = e as BeforeInstallPromptEvent;
    installListeners.forEach((l) => l());
  });
  window.addEventListener("appinstalled", () => {
    deferredInstall = null;
    installListeners.forEach((l) => l());
  });
}

/** Botão "Instalar app": disponível quando o navegador oferece (Chrome/Edge no Android e no PC) */
export function useInstallPrompt() {
  const [, force] = React.useReducer((x: number) => x + 1, 0);
  React.useEffect(() => {
    installListeners.add(force);
    return () => void installListeners.delete(force);
  }, []);
  return {
    canInstall: Boolean(deferredInstall),
    install: async () => {
      if (!deferredInstall) return false;
      await deferredInstall.prompt();
      const { outcome } = await deferredInstall.userChoice;
      deferredInstall = null;
      force();
      return outcome === "accepted";
    },
  };
}

// ---------- inscrição ----------

interface ServerPush {
  enabled: boolean;
  publicKey: string | null;
  devices: number;
}

export type PushState =
  | "unsupported" // navegador sem suporte (ou iPhone fora da tela de início)
  | "needs-install" // iPhone: precisa adicionar à tela de início primeiro
  | "denied" // usuário bloqueou nas configurações
  | "off" // pode ativar
  | "on"; // este aparelho recebe avisos

function urlBase64ToUint8Array(base64: string) {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const raw = atob((base64 + padding).replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
}

async function currentSubscription() {
  if (!pushSupported()) return null;
  const reg = await navigator.serviceWorker.getRegistration();
  return (await reg?.pushManager.getSubscription()) ?? null;
}

const pushKey = ["panel", "push"] as const;

export function usePush() {
  const qc = useQueryClient();
  const platform = getPlatform();

  const server = useQuery({ queryKey: pushKey, queryFn: () => api.get<ServerPush>("/panel/push") });
  const local = useQuery({
    queryKey: [...pushKey, "local"],
    queryFn: async () => {
      const sub = await currentSubscription();
      return { endpoint: sub?.endpoint ?? null, permission: pushSupported() ? Notification.permission : "default" };
    },
  });

  let state: PushState;
  if (platform === "ios" && !isStandalone()) state = "needs-install";
  else if (!pushSupported()) state = "unsupported";
  else if (local.data?.permission === "denied") state = "denied";
  else if (local.data?.endpoint && local.data.permission === "granted") state = "on";
  else state = "off";

  const refresh = () => qc.invalidateQueries({ queryKey: pushKey });

  const enable = useMutation({
    mutationFn: async () => {
      const info = server.data ?? (await api.get<ServerPush>("/panel/push"));
      if (!info.enabled || !info.publicKey) throw new Error("Notificações ainda não estão disponíveis. Tente mais tarde.");
      // o pedido de permissão precisa vir direto do toque no botão
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        throw new Error(
          permission === "denied"
            ? "Notificações bloqueadas. Libere nas configurações do celular (veja o passo a passo abaixo)."
            : "Você não permitiu as notificações. Toque de novo e escolha “Permitir”.",
        );
      }
      const reg = (await navigator.serviceWorker.getRegistration()) ?? (await navigator.serviceWorker.register("/sw.js"));
      await navigator.serviceWorker.ready;
      let sub = await reg.pushManager.getSubscription();
      if (!sub) {
        sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(info.publicKey),
        });
      }
      await api.post("/panel/push/subscribe", sub.toJSON());
      // já manda um teste para a pessoa ver chegando
      await api.post("/panel/push/test", { endpoint: sub.endpoint }).catch(() => {});
    },
    onSettled: refresh,
  });

  const disable = useMutation({
    mutationFn: async () => {
      const sub = await currentSubscription();
      if (sub) {
        await api.post("/panel/push/unsubscribe", { endpoint: sub.endpoint }).catch(() => {});
        await sub.unsubscribe();
      }
    },
    onSettled: refresh,
  });

  const test = useMutation({
    mutationFn: async () => {
      const sub = await currentSubscription();
      return api.post<{ sent: number; total: number }>("/panel/push/test", { endpoint: sub?.endpoint });
    },
    onSettled: refresh,
  });

  return {
    platform,
    state,
    loading: local.isLoading,
    devices: server.data?.devices ?? 0,
    serverEnabled: server.data?.enabled ?? true,
    enable,
    disable,
    test,
  };
}
