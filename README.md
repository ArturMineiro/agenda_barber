# ✂️ Navalha

Agenda online para barbearias, no modelo **SaaS multi-tenant**: uma plataforma única onde cada barbearia tem seu próprio link de agendamento (`navalha.app/barbearia-do-ze`), sua página personalizada e seu painel de gestão.

> "Navalha" é um nome provisório. Para trocar, altere `APP_NAME` em `packages/shared/src/enums.ts`.

## Como funciona

| Perfil | O que faz |
| --- | --- |
| **Super admin** (dono da plataforma) | Aprova ou recusa novas barbearias, atribui o plano e o valor da mensalidade, dá baixa nos pagamentos, suspende/reativa. |
| **Dono da barbearia** | Se cadastra (solo ou com equipe), configura serviços, profissionais, horários e bloqueios, personaliza a página (cores, logo, capa, descrição) e gerencia a agenda. |
| **Cliente** | Abre o link, escolhe serviço → profissional → dia → horário e confirma com nome + WhatsApp. Não precisa criar conta. |

### Dois modos de atendimento

Cada barbearia escolhe (no cadastro ou em Ajustes) **um** dos modos:

- **Horário marcado** — agenda online: o cliente escolhe dia e horário pelo link.
- **Ordem de chegada** — fila presencial, **uma fila por barbeiro**. O barbeiro adiciona quem chegou e usa *Chamar próximo → Concluir / Não veio*; pode abrir e fechar a própria fila. O link público não deixa entrar na fila: mostra o movimento de cada barbeiro (quantos esperam e a espera estimada, sem nomes) e o botão *Como chegar*. A espera é calculada pelo tempo restante de quem está na cadeira mais a duração dos serviços de quem espera.

### Fluxo de aprovação e valor combinado

1. O dono se cadastra → barbearia fica **PENDENTE**. Ele já pode configurar tudo, mas o link público ainda não recebe agendamentos.
2. O super admin aprova, escolhendo **plano** (limite de profissionais), **valor** e **dia de pagamento** combinados com o dono → barbearia **ATIVA**.
3. O pagamento é negociado e recebido por fora: **não há cobrança automática**. Se precisar, o admin **suspende** e **reativa** a barbearia na mão.

> A cobrança automática (mensalidades geradas todo mês, atraso e suspensão sozinha) está guardada na branch `feature/assinatura-dinamica`.

O limite de profissionais ativos vem do plano (Solo = 1, Equipe = 5, Premium = ilimitado — editáveis no painel).

## Stack

| Camada | Tecnologias |
| --- | --- |
| Frontend | React 19, Vite, TypeScript, Tailwind CSS v4, TanStack React Query, React Hook Form, React Router, Sonner, Lucide |
| Backend | Node.js 22, Express 5, TypeScript, Prisma ORM, JWT em cookie httpOnly, bcrypt, Luxon (fuso horário) |
| Validação | **Zod** — os mesmos schemas validam o formulário no front e a requisição no back (`packages/shared`) |
| Banco | PostgreSQL 16 (via Docker) |

## Estrutura

```
.
├── packages/shared/        # Schemas Zod + enums usados pelo front E pelo back
│   └── src/schemas/        # auth, barbershop, catalog, booking, admin
├── backend/
│   ├── prisma/
│   │   ├── schema.prisma   # Modelo de dados
│   │   ├── migrations/
│   │   └── seed.ts         # Super admin + planos
│   └── src/
│       ├── config/         # Variáveis de ambiente (validadas com Zod)
│       ├── lib/            # prisma, auth (JWT/cookie), erros, datas
│       ├── middlewares/    # requireAuth, requireRole, loadOwnerBarbershop, error-handler
│       └── modules/
│           ├── auth/       # cadastro, login, logout, /me, checagem de link
│           ├── admin/      # aprovação, planos, mensalidades (SUPER_ADMIN)
│           ├── panel/      # painel do dono (OWNER)
│           ├── public/     # página pública + agendamento (sem login)
│           ├── scheduling/ # cálculo de horários livres + criação de agendamento
│           ├── queue/      # fila por ordem de chegada
│           └── billing/    # geração de cobranças, atraso, suspensão
├── frontend/
│   └── src/
│       ├── components/     # UI reutilizável (ui/), layout, DateStrip
│       ├── features/       # Organizado por domínio: auth, panel, admin, public
│       │   └── <feature>/  # api.ts (hooks React Query) + pages/ + components/
│       ├── lib/            # cliente HTTP, React Query, utilitários
│       ├── pages/          # Landing, 404
│       └── types/          # Tipos das respostas da API
└── docker-compose.yml      # PostgreSQL
```

## Rodando localmente

Pré-requisitos: **Node 22+** e **Docker**.

```bash
# 1. Dependências (instala os 3 workspaces)
npm install

# 2. Banco
npm run db:up

# 3. Variáveis de ambiente
cp backend/.env.example backend/.env

# 4. Tabelas + dados iniciais
npm run db:migrate -w backend
npm run db:seed -w backend

# 5. API (http://localhost:3333) + Web (http://localhost:5173)
npm run dev
```

Login do super admin criado pelo seed: `admin@navalha.app` / `admin12345` (mude em `backend/.env`).

### Scripts úteis

| Comando | O que faz |
| --- | --- |
| `npm run dev` | Sobe API e frontend juntos |
| `npm run typecheck` | Checa tipos do back e do front |
| `npm run build` | Build de produção dos dois |
| `npm run db:studio -w backend` | Abre o Prisma Studio para ver/editar o banco |
| `npm run db:migrate -w backend` | Cria/aplica migrations após mudar o `schema.prisma` |
| `npm run test:e2e -w backend` | Cenários de ponta a ponta contra uma API rodando (veja *Testes*) |

## Rotas principais

**Frontend**

| Rota | Tela |
| --- | --- |
| `/` | Landing page |
| `/cadastro`, `/entrar` | Cadastro do dono / login |
| `/painel/*` | Painel do dono (início, agenda, serviços, equipe, lembretes, clientes, relatórios, avaliações, ajustes) e do barbeiro da equipe (só o que é dele) |
| `/admin/*` | Super admin: visão geral, barbearias, mensalidades, planos |
| `/:slug` | Página pública de agendamento da barbearia |

**API** (`/api`)

| Prefixo | Acesso |
| --- | --- |
| `/auth` | Público (cadastro/login) |
| `/public/barbershops/:slug` | Público — vitrine, horários livres, agendar |
| `/panel` | Dono logado |
| `/admin` | Super admin |

### Cliente gerencia o próprio agendamento

Cada agendamento tem um **link secreto** (`/agendamento/<token>`), mostrado na confirmação e salvo no aparelho (aparece em "Seus agendamentos" na página da barbearia). Por ele o cliente **vê, remarca ou cancela** sem criar conta, até o prazo definido pelo dono em Ajustes (padrão: 2h antes).

O dono pode **desmarcar com motivo** e avisar o cliente, além de enviar **mensagens prontas** (confirmação, lembrete, atraso) — o WhatsApp abre com o texto e o link já preenchidos; envio 100% automático exigiria a API paga do WhatsApp Business.

### Catálogo de cortes com fotos

Cada serviço pode ter até **3 fotos** (a primeira é a capa), enviadas em **Serviços → editar**. A página da barbearia mostra o carrossel **"Nossos cortes"**; ao tocar, o cliente vê a galeria e agenda aquele corte. A lista de serviços também ganha miniaturas.

- O celular reduz a foto antes de enviar (lado maior 1500px) e o servidor gera **duas versões WebP**: 900×1125 (≈30–100 KB) para carrossel/galeria e 240×300 (≈1–15 KB) para listas. Uma foto de câmera de 6 MB vira ~30 KB.
- Lazy loading em tudo, menos nas 2 primeiras fotos do carrossel.
- Limites: 3 por serviço, 60 por barbearia. Arquivos são apagados junto com a foto ou o serviço.

### Notificações no celular (sem app de loja)

O painel é um **PWA**: o dono adiciona o Navalha à tela de início (ícone igual a um app) e ativa as notificações em **Mais → Notificações**, que também traz o passo a passo para Android, iPhone e computador. Ele recebe um aviso quando um cliente **agenda, remarca ou desmarca** pelo link; ao tocar, abre a agenda no dia do horário.

- Web Push padrão (`web-push` + service worker `frontend/public/sw.js`), sem custo por mensagem.
- Chaves VAPID no `.env` (`VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT`); gere com `npx web-push generate-vapid-keys`. Sem chaves, as notificações ficam desligadas.
- iPhone: só funciona com o site adicionado à tela de início e aberto pelo ícone (iOS 16.4+).
- Inscrições expiradas (404/410) são apagadas automaticamente.

### Lembrete do dia seguinte

No horário escolhido em Ajustes (padrão 19h, no fuso da barbearia) o dono recebe no celular **"Amanhã: N clientes"**. Ao tocar, abre **Lembretes**: um toque em cada cliente abre o WhatsApp com a mensagem pronta ("amanhã (sábado) às 14:00…") e marca como lembrado. O botão "Lembrar fulano · 14:00" vai de um em um. Sem API paga: o envio é pelo WhatsApp do próprio dono.

### Barbeiros da equipe com login

Em **Equipe → editar profissional → Acesso ao painel**, o dono cria o login com o e-mail do barbeiro. A senha temporária vai pelo WhatsApp e é trocada no primeiro acesso. O barbeiro vê só **a própria** agenda, fila, lembretes, folgas, números e notificações.

- As permissões são uma **lista do que é permitido** (`BARBER_ROUTES` em `panel.routes.ts`): rota nova do painel fica bloqueada para o barbeiro até entrar na lista.
- Agenda, horários livres, fila, folgas, lembretes e relatórios são filtrados pelo profissional **no servidor** (`req.scopeProfessionalId`).
- Profissional desativado perde o acesso; excluído, o login é apagado.

### Relatórios

**Mais → Relatórios** (este mês, mês passado, últimos 30 dias, ano): faturamento comparado ao período anterior, atendimentos, ticket médio, taxa de faltas, clientes novos, cancelamentos, faturamento por profissional (com nota), serviços que mais faturam e atendimentos por dia da semana. No modo fila, conta os atendimentos concluídos.

### Senhas

- Qualquer usuário troca a senha pelo ícone de chave no topo. Trocar a senha **derruba as sessões abertas nos outros aparelhos** (`tokenVersion` no token).
- **Esqueci minha senha** (sem e-mail): o link do login abre o WhatsApp do suporte; o admin gera uma **senha temporária** em Barbearias → Responsável. Quem entra com ela precisa criar a própria antes de usar o painel.

### Fuso horário

Ajustes → **Fuso horário** (Brasília, AM, MT, MS, RO, RR, AC, Noronha). A grade, os horários livres, o painel e as páginas públicas usam o fuso da barbearia, não o do aparelho.

## Testes

`backend/tests/e2e.mjs` percorre a API de verdade: horário duplo, faltas, folgas, semana, fuso, lembretes, relatórios, senhas, permissões do barbeiro e fila. No CI ele roda num Postgres vazio antes do deploy (job *Testes de ponta a ponta*); se falhar, não publica.

Para rodar local, com a API de pé num banco de teste:

```bash
E2E_BASE_URL=http://localhost:3333/api E2E_ADMIN_EMAIL=admin@navalha.app E2E_ADMIN_PASSWORD=admin12345 DATABASE_URL=<o mesmo banco da API> npm run test:e2e -w backend
```

Use um banco separado: o teste cria barbearias novas a cada execução.

## Decisões importantes

- **Agendamento sem conta para o cliente**: menos atrito; ele informa nome e WhatsApp. O histórico de clientes é agrupado pelo telefone.
- **Sem agendamento duplo**: a criação roda numa transação `SERIALIZABLE`; se dois clientes tentarem o mesmo horário ao mesmo tempo, só um consegue.
- **Fuso horário**: horários são guardados em UTC e calculados no fuso da barbearia (`America/Sao_Paulo` por padrão).
- **Dinheiro em centavos** (inteiro) para não ter erro de arredondamento.
- **Imagens leves**: o navegador reduz a foto antes de enviar e o servidor recorta no tamanho de uso e converte para WebP (logo 400px, capa 1600×600, foto 320px). Ficam em `backend/uploads/<barbearia>/` e são servidas em `/uploads` com cache longo.
- **Paletas de cores**: 10 combinações prontas (cor principal + cor de apoio) em `packages/shared/src/themes.ts`, mais a opção personalizada.
- **Sessão em cookie httpOnly**: o JavaScript da página não acessa o token.

## Próximos passos sugeridos

- [ ] Mover as imagens de `backend/uploads` para um storage (S3/Cloudflare R2) no deploy
- [x] Lembrete do dia seguinte (WhatsApp em 1 toque + aviso no celular)
- [ ] Lembrete 100% automático (exige a API paga do WhatsApp Business)
- [x] Link para o cliente cancelar/remarcar
- [ ] Pagamento da mensalidade por gateway (Pix automático/Asaas/Mercado Pago/Stripe) em vez de baixa manual
- [x] Login para profissionais da equipe verem só a própria agenda
- [x] Relatórios (faturamento por profissional, serviços mais vendidos)
- [x] Fuso horário por barbearia
- [x] Recuperar senha sem e-mail (senha temporária pelo admin)
- [x] PWA (instalar no celular como app) + notificações de agendamento
