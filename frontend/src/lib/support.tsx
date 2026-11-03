import { useQuery } from "@tanstack/react-query";
import { MessageCircle } from "lucide-react";
import { api } from "./api";
import { cn, formatPhone, whatsappLink } from "./utils";

/** Contato do suporte/admin da plataforma (configurado no servidor: SUPPORT_WHATSAPP) */
export function useSupportWhatsapp() {
  const { data } = useQuery({
    queryKey: ["public-config"],
    queryFn: () => api.get<{ supportWhatsapp: string | null }>("/public/config"),
    staleTime: Infinity,
  });
  return data?.supportWhatsapp ?? null;
}

interface SupportLinkProps {
  /** mensagem que já vem escrita no WhatsApp */
  message: string;
  children?: React.ReactNode;
  className?: string;
  /** mostra o número ao lado do texto */
  showNumber?: boolean;
}

/** Link "Falar no WhatsApp" com o suporte; não renderiza nada se não houver número configurado */
export function SupportLink({ message, children = "Falar com o suporte", className, showNumber }: SupportLinkProps) {
  const phone = useSupportWhatsapp();
  if (!phone) return null;
  return (
    <a
      href={whatsappLink(phone, message)}
      target="_blank"
      rel="noreferrer"
      className={cn("inline-flex items-center gap-1 font-semibold underline underline-offset-2 hover:opacity-80", className)}
    >
      <MessageCircle className="size-4 shrink-0" />
      {children}
      {showNumber && <span className="font-normal tabular-nums no-underline">· {formatPhone(phone)}</span>}
    </a>
  );
}
