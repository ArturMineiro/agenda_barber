import * as React from "react";
import { toast } from "sonner";
import {
  Bell,
  BellOff,
  BellRing,
  CheckCircle2,
  Download,
  EllipsisVertical,
  HelpCircle,
  Monitor,
  PlusSquare,
  Send,
  Share,
  Smartphone,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PageHeader, Tabs } from "@/components/ui/misc";
import { errorMessage } from "@/lib/api";
import { isStandalone, useInstallPrompt, usePush, type Platform } from "@/lib/push";
import { cn } from "@/lib/utils";

/**
 * Notificações e app: ativa os avisos neste aparelho e ensina, passo a passo,
 * a criar o atalho na tela de início (Android e iPhone).
 */
export function NotificationsPage() {
  const push = usePush();
  const [tab, setTab] = React.useState<Platform>(push.platform);

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <PageHeader
        title="Notificações e app"
        description="Receba um aviso no celular quando um cliente agendar, remarcar ou desmarcar, igual a um aplicativo."
      />

      <StatusCard push={push} />

      <Card>
        <CardHeader>
          <CardTitle>Passo a passo</CardTitle>
          <p className="text-sm text-zinc-500">Escolha o seu aparelho. Leva menos de 1 minuto.</p>
        </CardHeader>
        <CardContent className="space-y-6">
          <Tabs
            value={tab}
            onChange={setTab}
            items={[
              { value: "android", label: "Android" },
              { value: "ios", label: "iPhone" },
              { value: "desktop", label: "Computador" },
            ]}
          />
          {tab === "android" && <AndroidGuide />}
          {tab === "ios" && <IosGuide />}
          {tab === "desktop" && <DesktopGuide />}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <HelpCircle className="size-5 text-zinc-400" /> Não está chegando?
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-3 text-sm text-zinc-600">
            <Tip title="Faça o teste">Toque em “Enviar teste” lá em cima. Se o teste chega, os avisos de agendamento também vão chegar.</Tip>
            <Tip title="Ative em cada celular">
              A ativação vale para o aparelho em que você tocou no botão. Se usa dois celulares, ative nos dois.
            </Tip>
            <Tip title="Modo silencioso / Não perturbe">Com o celular no “Não perturbe” ou no modo foco, o aviso chega mas não toca.</Tip>
            <Tip title="Economia de bateria (Android)">
              Alguns celulares (Xiaomi, Samsung, Motorola) seguram notificações para economizar bateria. Em Configurações → Apps → Chrome,
              deixe a bateria como “Sem restrições”.
            </Tip>
            <Tip title="iPhone">
              Precisa do iOS 16.4 ou mais novo, e o Navalha tem que ser aberto pelo ícone da tela de início (não pelo Safari).
            </Tip>
            <Tip title="Bloqueou sem querer?">
              Android: segure o ícone do Navalha → “Informações do app” → Notificações → ativar. iPhone: Ajustes → Notificações → Navalha →
              Permitir Notificações.
            </Tip>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}

// ---------- status deste aparelho ----------

function StatusCard({ push }: { push: ReturnType<typeof usePush> }) {
  const { state } = push;
  const { canInstall, install } = useInstallPrompt();

  const onEnable = () =>
    push.enable.mutate(undefined, {
      onSuccess: () => toast.success("Pronto! Mandamos uma notificação de teste para este aparelho."),
      onError: (err) => toast.error(errorMessage(err)),
    });
  const onTest = () =>
    push.test.mutate(undefined, {
      onSuccess: (r) => toast.success(r.sent ? "Teste enviado. Deve chegar em alguns segundos." : "Não foi possível enviar. Ative de novo."),
      onError: (err) => toast.error(errorMessage(err)),
    });
  const onDisable = () =>
    push.disable.mutate(undefined, { onSuccess: () => toast.success("Notificações desligadas neste aparelho.") });

  const view = {
    on: {
      icon: <BellRing />,
      tone: "bg-emerald-50 text-emerald-700",
      title: "Notificações ativas neste aparelho",
      text: "Você vai receber um aviso sempre que um cliente agendar, remarcar ou desmarcar pelo link.",
    },
    off: {
      icon: <Bell />,
      tone: "bg-amber-50 text-amber-700",
      title: "Notificações desligadas neste aparelho",
      text: "Toque no botão e escolha “Permitir” quando o celular perguntar.",
    },
    denied: {
      icon: <BellOff />,
      tone: "bg-red-50 text-red-700",
      title: "Notificações bloqueadas",
      text: "Você bloqueou os avisos neste aparelho. Veja em “Não está chegando?” como liberar.",
    },
    "needs-install": {
      icon: <PlusSquare />,
      tone: "bg-sky-50 text-sky-700",
      title: "Primeiro, adicione à tela de início",
      text: "No iPhone, as notificações só funcionam com o Navalha adicionado à tela de início. Siga o passo a passo abaixo e depois abra pelo ícone.",
    },
    unsupported: {
      icon: <BellOff />,
      tone: "bg-zinc-100 text-zinc-600",
      title: "Este navegador não recebe notificações",
      text: "Abra o painel no Chrome (Android ou computador) ou, no iPhone, pelo ícone da tela de início.",
    },
  }[state];

  return (
    <Card className="overflow-hidden">
      <CardContent className="space-y-4 pt-6">
        <div className="flex items-start gap-3">
          <span className={cn("rounded-2xl p-3 [&_svg]:size-6", view.tone)}>{view.icon}</span>
          <div className="min-w-0 flex-1">
            <p className="font-semibold">{view.title}</p>
            <p className="mt-0.5 text-sm text-zinc-500">{view.text}</p>
          </div>
        </div>

        {!push.serverEnabled && (
          <p className="rounded-xl bg-zinc-50 px-3 py-2 text-sm text-zinc-500">As notificações estão sendo configuradas. Volte daqui a pouco.</p>
        )}

        <div className="flex flex-col gap-2 sm:flex-row">
          {state === "off" && (
            <Button size="lg" className="flex-1" onClick={onEnable} loading={push.enable.isPending} disabled={!push.serverEnabled}>
              <Bell /> Ativar notificações
            </Button>
          )}
          {state === "on" && (
            <>
              <Button size="lg" className="flex-1" onClick={onTest} loading={push.test.isPending}>
                <Send /> Enviar teste
              </Button>
              <Button size="lg" variant="outline" onClick={onDisable} loading={push.disable.isPending}>
                Desligar aqui
              </Button>
            </>
          )}
          {state === "denied" && (
            <Button size="lg" variant="outline" className="flex-1" onClick={onEnable} loading={push.enable.isPending}>
              Já liberei, tentar de novo
            </Button>
          )}
          {canInstall && !isStandalone() && (
            <Button size="lg" variant="outline" className="flex-1" onClick={() => install()}>
              <Download /> Instalar na tela de início
            </Button>
          )}
        </div>

        {push.devices > 0 && (
          <p className="text-xs text-zinc-500">
            <Badge tone="success" className="mr-1.5">
              {push.devices}
            </Badge>
            {push.devices === 1 ? "aparelho recebe" : "aparelhos recebem"} os avisos desta barbearia.
          </p>
        )}
      </CardContent>
    </Card>
  );
}

// ---------- guias ----------

function AndroidGuide() {
  return (
    <div className="space-y-6">
      <GuideSection icon={<Smartphone />} title="1. Criar o atalho na tela de início" subtitle="Fica com ícone, igual a um app.">
        <Step n={1}>
          Abra <strong>navalha.forgedevapps.com/painel</strong> no <strong>Chrome</strong> e entre na sua conta.
        </Step>
        <Step n={2}>
          Toque nos <strong>três pontinhos</strong> <Kbd><EllipsisVertical /></Kbd> no canto de cima.
        </Step>
        <Step n={3}>
          Toque em <strong>“Adicionar à tela inicial”</strong> (ou “Instalar app”) e confirme em <strong>Adicionar</strong>.
        </Step>
        <Step n={4}>Pronto: o ícone do Navalha aparece junto dos seus apps. Use sempre ele para abrir o painel.</Step>
      </GuideSection>

      <GuideSection icon={<Bell />} title="2. Ativar as notificações">
        <Step n={1}>
          Abra o Navalha pelo ícone e vá em <strong>Mais → Notificações</strong>.
        </Step>
        <Step n={2}>
          Toque em <strong>Ativar notificações</strong> e escolha <strong>Permitir</strong>.
        </Step>
        <Step n={3}>Vai chegar uma notificação de teste. Chegou? Está tudo certo ✅</Step>
      </GuideSection>
    </div>
  );
}

function IosGuide() {
  return (
    <div className="space-y-6">
      <p className="rounded-xl bg-sky-50 px-3 py-2.5 text-sm text-sky-900">
        No iPhone a ordem importa: <strong>primeiro</strong> adicione à tela de início, <strong>depois</strong> ative as notificações abrindo
        pelo ícone.
      </p>

      <GuideSection icon={<Smartphone />} title="1. Adicionar à tela de início" subtitle="Precisa ser pelo Safari.">
        <Step n={1}>
          Abra <strong>navalha.forgedevapps.com/painel</strong> no <strong>Safari</strong> e entre na sua conta.
        </Step>
        <Step n={2}>
          Toque no botão <strong>Compartilhar</strong> <Kbd><Share /></Kbd> (o quadrado com a seta para cima, embaixo da tela).
        </Step>
        <Step n={3}>
          Role a lista e toque em <strong>“Adicionar à Tela de Início”</strong> <Kbd><PlusSquare /></Kbd>. Se não aparecer, toque em
          “Editar ações” no fim da lista e ative essa opção.
        </Step>
        <Step n={4}>
          Toque em <strong>Adicionar</strong>, no canto de cima.
        </Step>
      </GuideSection>

      <GuideSection icon={<Bell />} title="2. Ativar as notificações">
        <Step n={1}>
          Feche o Safari e abra o Navalha <strong>pelo novo ícone</strong> na tela de início.
        </Step>
        <Step n={2}>
          Entre em <strong>Mais → Notificações</strong> e toque em <strong>Ativar notificações</strong>.
        </Step>
        <Step n={3}>
          Toque em <strong>Permitir</strong>. Vai chegar uma notificação de teste ✅
        </Step>
      </GuideSection>

      <p className="text-xs text-zinc-500">Funciona no iOS 16.4 ou mais novo (Ajustes → Geral → Sobre → Versão do iOS).</p>
    </div>
  );
}

function DesktopGuide() {
  return (
    <GuideSection icon={<Monitor />} title="No computador (Chrome ou Edge)" subtitle="Útil para quem deixa o painel aberto no balcão.">
      <Step n={1}>
        Abra o painel e vá em <strong>Notificações</strong>, no menu lateral.
      </Step>
      <Step n={2}>
        Toque em <strong>Ativar notificações</strong> e clique em <strong>Permitir</strong>.
      </Step>
      <Step n={3}>
        Opcional: clique em <strong>Instalar na tela de início</strong> (ou no ícone <Kbd><Download /></Kbd> na barra de endereço) para ter
        o Navalha como um programa.
      </Step>
      <Step n={4}>Os avisos chegam mesmo com a aba fechada, desde que o navegador esteja aberto.</Step>
    </GuideSection>
  );
}

function GuideSection({ icon, title, subtitle, children }: { icon: React.ReactNode; title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <section>
      <div className="mb-3 flex items-center gap-2.5">
        <span className="rounded-xl bg-zinc-100 p-2 text-zinc-700 [&_svg]:size-4">{icon}</span>
        <div>
          <h3 className="font-semibold">{title}</h3>
          {subtitle && <p className="text-xs text-zinc-500">{subtitle}</p>}
        </div>
      </div>
      <ol className="space-y-2.5">{children}</ol>
    </section>
  );
}

function Step({ n, children }: { n: number; children: React.ReactNode }) {
  return (
    <li className="flex gap-3 text-sm text-zinc-700">
      <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-zinc-900 text-xs font-semibold text-white">{n}</span>
      <span className="pt-0.5">{children}</span>
    </li>
  );
}

function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <span className="mx-0.5 inline-flex translate-y-0.5 items-center rounded-md bg-zinc-100 p-0.5 text-zinc-700 ring-1 ring-zinc-200 [&_svg]:size-3.5">
      {children}
    </span>
  );
}

function Tip({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <li className="flex gap-2.5">
      <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-600" />
      <span>
        <strong className="text-zinc-900">{title}.</strong> {children}
      </span>
    </li>
  );
}
