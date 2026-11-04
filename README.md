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

### Fluxo de aprovação e cobrança

1. O dono se cadastra → barbearia fica **PENDENTE**. Ele já pode configurar tudo, mas o link público ainda não recebe agendamentos.
2. O super admin aprova, escolhendo **plano**, **valor** (negociável), **dia de vencimento** e **dias de cortesia** → barbearia **ATIVA**.
3. A rotina de cobrança (roda ao subir a API e de hora em hora) gera a mensalidade 7 dias antes do vencimento.
4. Venceu e não pagou → cobrança **ATRASADA**. Passou da tolerância (`BILLING_GRACE_DAYS`, padrão 5 dias) → barbearia **SUSPENSA** automaticamente.
5. O admin dá baixa no pagamento → se não houver outras pendências, a barbearia é **reativada sozinha**.

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

## Rotas principais

**Frontend**

| Rota | Tela |
| --- | --- |
| `/` | Landing page |
| `/cadastro`, `/entrar` | Cadastro do dono / login |
| `/painel/*` | Painel do dono: início, agenda, serviços, equipe/horários, clientes, ajustes |
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

### Notificações no celular (sem app de loja)

O painel é um **PWA**: o dono adiciona o Navalha à tela de início (ícone igual a um app) e ativa as notificações em **Mais → Notificações**, que também traz o passo a passo para Android, iPhone e computador. Ele recebe um aviso quando um cliente **agenda, remarca ou desmarca** pelo link; ao tocar, abre a agenda no dia do horário.

- Web Push padrão (`web-push` + service worker `frontend/public/sw.js`), sem custo por mensagem.
- Chaves VAPID no `.env` (`VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT`); gere com `npx web-push generate-vapid-keys`. Sem chaves, as notificações ficam desligadas.
- iPhone: só funciona com o site adicionado à tela de início e aberto pelo ícone (iOS 16.4+).
- Inscrições expiradas (404/410) são apagadas automaticamente.

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
- [ ] Lembretes automáticos por WhatsApp/e-mail
- [x] Link para o cliente cancelar/remarcar
- [ ] Pagamento da mensalidade por gateway (Pix automático/Asaas/Mercado Pago/Stripe) em vez de baixa manual
- [ ] Login para profissionais da equipe verem só a própria agenda
- [ ] Relatórios (faturamento por profissional, serviços mais vendidos)
- [x] PWA (instalar no celular como app) + notificações de agendamento
