import { Copy, MessageCircle } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { whatsappLink } from "@/lib/utils";

interface Props {
  /** senha gerada (null = fechado) */
  password: string | null;
  onClose: () => void;
  title: string;
  /** quem recebe: entra com este e-mail */
  name: string;
  email: string;
  /** com telefone, o WhatsApp já abre na conversa; sem, a pessoa escolhe o contato */
  phone?: string | null;
  /** ex.: "do painel da Barbearia do Zé" */
  context?: string;
}

/**
 * Mostra uma senha temporária UMA vez, com a mensagem pronta para mandar pelo WhatsApp.
 * No primeiro acesso a pessoa é obrigada a criar a própria senha.
 */
export function TempPasswordDialog({ password, onClose, title, name, email, phone, context }: Props) {
  const loginUrl = `${window.location.origin}/entrar`;
  const message = password
    ? `Olá ${name.split(" ")[0]}! Seu acesso${context ? ` ${context}` : ""} no Navalha:\n\nE-mail: ${email}\nSenha temporária: *${password}*\n\nEntre em ${loginUrl} e crie sua senha no primeiro acesso.`
    : "";
  const waUrl = phone ? whatsappLink(phone, message) : `https://wa.me/?text=${encodeURIComponent(message)}`;

  return (
    <Dialog
      open={!!password}
      onClose={onClose}
      title={title}
      description="Mostrada só agora. No primeiro acesso a pessoa cria uma senha nova."
      footer={
        <>
          <Button variant="outline" onClick={onClose} className="flex-1 sm:flex-none">
            Fechar
          </Button>
          <a href={waUrl} target="_blank" rel="noreferrer" className="flex-1 sm:flex-none">
            <Button variant="success" className="w-full">
              <MessageCircle /> Enviar no WhatsApp
            </Button>
          </a>
        </>
      }
    >
      <div className="space-y-3">
        <div className="flex items-center justify-between gap-3 rounded-xl bg-zinc-100 px-4 py-3">
          <span className="font-mono text-2xl font-semibold tracking-wider">{password}</span>
          <Button
            size="sm"
            variant="ghost"
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(message);
                toast.success("Mensagem copiada");
              } catch {
                toast.error("Não deu para copiar. Selecione a senha e copie.");
              }
            }}
          >
            <Copy /> Copiar
          </Button>
        </div>
        <p className="text-sm text-zinc-500">
          Entra com o e-mail <strong className="text-zinc-800">{email}</strong>.
        </p>
      </div>
    </Dialog>
  );
}
