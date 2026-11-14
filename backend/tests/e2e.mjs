/**
 * Teste de ponta a ponta da API (roda contra uma API de verdade + Postgres).
 *
 *   E2E_BASE_URL=http://localhost:3333/api  (padrão)
 *   E2E_ADMIN_EMAIL / E2E_ADMIN_PASSWORD     (super admin criado pelo seed)
 *   DATABASE_URL                             (mesmo banco da API: alguns cenários ajustam datas direto no banco)
 *
 * Uso: npm run test:e2e -w backend   (no CI roda depois de subir a API num banco vazio)
 * Os cenários dependem uns dos outros e rodam em ordem; cada execução cria barbearias novas.
 */
import { PrismaClient } from "@prisma/client";

const BASE = process.env.E2E_BASE_URL ?? "http://localhost:3333/api";
const ADMIN = { email: process.env.E2E_ADMIN_EMAIL ?? "admin@navalha.app", password: process.env.E2E_ADMIN_PASSWORD ?? "admin12345" };
const prisma = new PrismaClient();

let failures = 0;
let section = "";
const group = (name) => {
  section = name;
  console.log(`\n▸ ${name}`);
};
const ok = (cond, label, extra) => {
  console.log(`  ${cond ? "✓" : "✗"} ${label}${!cond && extra !== undefined ? `  → ${JSON.stringify(extra).slice(0, 400)}` : ""}`);
  if (!cond) failures++;
};

/** Cliente HTTP com cookie próprio (cada um é um "aparelho") */
function client() {
  let cookie = "";
  return async (method, path, body, raw) => {
    const headers = {};
    if (body !== undefined) headers["content-type"] = "application/json";
    if (cookie) headers.cookie = cookie;
    const res = await fetch(BASE + path, { method, headers, body: body === undefined ? undefined : raw ? body : JSON.stringify(body) });
    const sc = res.headers.get("set-cookie");
    if (sc) cookie = sc.split(";")[0];
    const text = await res.text();
    let data;
    try {
      data = JSON.parse(text);
    } catch {
      data = text;
    }
    return { status: res.status, data };
  };
}

const spDate = (offsetDays, tz = "America/Sao_Paulo") => new Date(Date.now() + offsetDays * 86_400_000).toLocaleDateString("en-CA", { timeZone: tz });

async function waitForApi() {
  for (let i = 0; i < 60; i++) {
    try {
      if ((await fetch(BASE + "/health")).ok) return;
    } catch {}
    await new Promise((r) => setTimeout(r, 1000));
  }
  throw new Error(`API não respondeu em ${BASE}`);
}

async function registerShop(admin, plan, { prefix, teamType = "TEAM", bookingMode = "SCHEDULE" }) {
  const c = client();
  const stamp = `${prefix}-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`;
  const email = `${stamp}@teste.local`;
  const reg = await c("POST", "/auth/register", {
    name: `Dono ${prefix}`,
    email,
    phone: "11999990000",
    password: "senhadono123",
    barbershop: { name: `Barbearia ${prefix}`, slug: stamp, teamType, bookingMode, city: "São Paulo" },
  });
  if (reg.status !== 201) throw new Error(`cadastro falhou: ${JSON.stringify(reg.data)}`);
  const shop = (await c("GET", "/panel/barbershop")).data;
  await admin("POST", `/admin/barbershops/${shop.id}/approve`, { planId: plan.id, billingDay: 10, trialDays: 0 });
  return { c, shop, email };
}

/** Primeiro dia (a partir de amanhã) com horários livres para o serviço */
async function findDay(guest, slug, serviceId) {
  for (let d = 1; d < 10; d++) {
    const date = spDate(d);
    const r = await guest("GET", `/public/barbershops/${slug}/availability?serviceId=${serviceId}&date=${date}`);
    if (r.data.slots?.length) return { date, slots: r.data.slots };
  }
  throw new Error("nenhum dia com horário livre");
}

async function main() {
  await waitForApi();
  const admin = client();
  const login = await admin("POST", "/auth/login", ADMIN);
  if (login.status !== 200) throw new Error(`login do admin falhou (${login.status}). Confira E2E_ADMIN_EMAIL/PASSWORD.`);
  const equipe = (await admin("GET", "/admin/plans")).data.find((p) => p.name === "Equipe");

  // ---------------------------------------------------------------
  group("Agenda: horário duplo, faltas, serviços e profissionais");
  const { c: owner, shop, email: ownerEmail } = await registerShop(admin, equipe, { prefix: "agenda" });
  const services = (await owner("GET", "/panel/services")).data;
  const corte = services.find((s) => s.name === "Corte");
  const ze = (await owner("GET", "/panel/professionals")).data[0];
  const pedro = (await owner("POST", "/panel/professionals", { name: "Pedro Souza", active: true, serviceIds: services.map((s) => s.id) })).data;
  // expediente nos 7 dias: o teste não depende do dia da semana em que roda
  const fullWeek = [0, 1, 2, 3, 4, 5, 6].flatMap((weekday) => [
    { weekday, startMinute: 9 * 60, endMinute: 12 * 60 },
    { weekday, startMinute: 13 * 60, endMinute: 19 * 60 },
  ]);
  for (const id of [ze.id, pedro.id]) await owner("PUT", `/panel/professionals/${id}/hours`, { hours: fullWeek });

  const sobr = (await owner("POST", "/panel/services", { name: "Sobrancelha", durationMinutes: 15, priceCents: 1500, active: true })).data;
  const pros = (await owner("GET", "/panel/professionals")).data;
  ok(pros.every((p) => p.serviceIds.includes(sobr.id)), "serviço novo entra para todos os profissionais ativos");
  const guest = client();
  ok((await guest("GET", `/public/barbershops/${shop.slug}`)).data.services.some((s) => s.id === sobr.id), "serviço novo aparece na página pública");

  const { date, slots } = await findDay(guest, shop.slug, corte.id);
  const s10 = slots.find((s) => s.time === "10:00");
  ok(s10?.professionalIds.length === 2, "10:00 com dois barbeiros livres", s10);
  const first = s10.professionalIds[0];
  const bookA = await guest("POST", `/public/barbershops/${shop.slug}/bookings`, {
    serviceId: corte.id, professionalId: first, startsAt: s10.startsAt, clientName: "Cliente A", clientPhone: "(11) 98888-7777",
  });
  ok(bookA.status === 201, "cliente agenda pelo link", bookA.data);
  const after = (await guest("GET", `/public/barbershops/${shop.slug}/availability?serviceId=${corte.id}&date=${date}`)).data.slots;
  const s1030 = after.find((s) => s.time === "10:30");
  ok(s1030.professionalIds[0] !== first, "sem preferência: barbeiro menos ocupado do dia vem primeiro");

  const apptA = (await owner("GET", `/panel/appointments?date=${date}`)).data.find((a) => a.clientName === "Cliente A");
  await guest("POST", `/public/appointments/${bookA.data.accessToken}/cancel`, {});
  const bookB = await guest("POST", `/public/barbershops/${shop.slug}/bookings`, {
    serviceId: corte.id, professionalId: first, startsAt: s10.startsAt, clientName: "Cliente B", clientPhone: "11977776666",
  });
  ok(bookB.status === 201, "outro cliente pega o horário cancelado");
  const back = await owner("PATCH", `/panel/appointments/${apptA.id}/status`, { status: "CONFIRMED" });
  ok(back.status === 409, "voltar cancelado p/ confirmado com outro no lugar é barrado (sem horário duplo)", back);

  const apptB = (await owner("GET", `/panel/appointments?date=${date}`)).data.find((a) => a.clientName === "Cliente B");
  await owner("PATCH", `/panel/appointments/${apptB.id}/status`, { status: "NO_SHOW" });
  const walkIn = await owner("POST", "/panel/appointments", {
    serviceId: corte.id, professionalId: first, startsAt: s10.startsAt, clientName: "Encaixe", clientPhone: "11966665555",
  });
  ok(walkIn.status === 201, "\"não veio\" libera a cadeira para encaixe", walkIn.data);
  const backB = await owner("PATCH", `/panel/appointments/${apptB.id}/status`, { status: "COMPLETED" });
  ok(backB.status === 409, "marcar o faltoso como concluído com encaixe no lugar é barrado");

  const resched = await client()("POST", `/public/appointments/${bookB.data.accessToken}/reschedule`, { startsAt: s1030.startsAt, professionalId: first });
  ok(resched.status === 400 || resched.status === 403, "cliente marcado como falta não remarca pelo link", resched.status);

  // ---------------------------------------------------------------
  group("Folgas, modo de atendimento, clientes e validações");
  const [y, m, d] = date.split("-").map(Number);
  const off = await owner("POST", "/panel/time-offs", {
    professionalId: first,
    startsAt: new Date(Date.UTC(y, m - 1, d, 3)).toISOString(),
    endsAt: new Date(Date.UTC(y, m - 1, d + 1, 3)).toISOString(),
  });
  ok(off.status === 201 && off.data.conflicts === 1, "folga avisa quantos clientes já estavam marcados", off.data);

  const settings = { ...shop, bookingMode: "QUEUE" };
  for (const k of ["id", "status", "statusReason", "teamType", "approvedAt", "createdAt", "updatedAt", "ownerId", "subscription", "_count", "reminderDigestOn"]) delete settings[k];
  const toQueue = await owner("PUT", "/panel/barbershop", settings);
  ok(toQueue.status === 409 && toQueue.data.code === "HAS_FUTURE_APPOINTMENTS", "não muda para fila com cliente marcado", toQueue.data);

  const found = (await owner("GET", `/panel/clients?q=${encodeURIComponent("(11) 98888")}`)).data;
  ok(found.length === 0, "cliente que só cancelou não entra no histórico", found);
  const found2 = (await owner("GET", `/panel/clients?q=${encodeURIComponent("(11) 9666")}`)).data;
  ok(found2.length === 1, "busca por telefone com máscara", found2);

  const big = await guest("POST", `/public/barbershops/${shop.slug}/bookings`, {
    serviceId: corte.id, professionalId: first, startsAt: after.at(-1).startsAt, clientName: "x".repeat(300), clientPhone: "11999998888",
  });
  ok(big.status === 400, "nome com 300 caracteres é recusado", big.status);
  ok((await owner("POST", "/panel/services", "{nome: ", true)).status === 400, "JSON malformado → 400");
  ok((await owner("GET", "/panel/appointments?date=2026-13-45")).status === 400, "data impossível → 400");

  // ---------------------------------------------------------------
  group("Agenda da semana");
  const week = await owner("GET", `/panel/appointments?date=${spDate(0)}&days=7`);
  ok(week.status === 200 && week.data.some((a) => a.clientName === "Encaixe"), "days=7 traz os agendamentos da semana", week.data.length);
  ok((await owner("GET", `/panel/appointments?date=${spDate(0)}&days=8`)).status === 400, "mais de 7 dias é recusado");

  // ---------------------------------------------------------------
  group("Fuso horário configurável");
  const manaus = await owner("PUT", "/panel/barbershop", { ...settings, bookingMode: "SCHEDULE", timezone: "America/Manaus" });
  ok(manaus.status === 200 && manaus.data.timezone === "America/Manaus", "muda o fuso para Manaus", manaus.data);
  const mSlots = (await guest("GET", `/public/barbershops/${shop.slug}/availability?serviceId=${corte.id}&date=${spDate(2)}`)).data.slots;
  const m9 = mSlots.find((s) => s.time === "09:00");
  ok(!mSlots.length || (m9 && m9.startsAt.endsWith("-04:00")), "horário das 09:00 é 09:00 de Manaus (UTC-4)", m9);
  ok((await owner("PUT", "/panel/barbershop", { ...settings, bookingMode: "SCHEDULE", timezone: "Europe/Paris" })).status === 400, "fuso fora da lista é recusado");
  await owner("PUT", "/panel/barbershop", { ...settings, bookingMode: "SCHEDULE", timezone: "America/Sao_Paulo" });

  // ---------------------------------------------------------------
  group("Lembretes do dia seguinte");
  const tomorrowSlots = (await guest("GET", `/public/barbershops/${shop.slug}/availability?serviceId=${corte.id}&date=${spDate(1)}`)).data.slots;
  if (tomorrowSlots.length) {
    const t = tomorrowSlots.at(-1);
    await guest("POST", `/public/barbershops/${shop.slug}/bookings`, {
      serviceId: corte.id, professionalId: t.professionalIds[0], startsAt: t.startsAt, clientName: "Amanhã Silva", clientPhone: "11955554444",
    });
    const rem = (await owner("GET", "/panel/reminders")).data;
    const item = rem.appointments.find((a) => a.clientName === "Amanhã Silva");
    ok(rem.date === spDate(1) && item && !item.reminderSentAt, "lista de amanhã com cliente sem lembrete", rem);
    await owner("POST", `/panel/appointments/${item.id}/reminder`, {});
    const rem2 = (await owner("GET", "/panel/reminders")).data;
    ok(!!rem2.appointments.find((a) => a.id === item.id)?.reminderSentAt, "marcar como lembrado");
  } else {
    console.log("  (amanhã sem expediente: cenário de lembrete pulado)");
  }

  // ---------------------------------------------------------------
  group("Relatórios");
  // dois atendimentos no passado: um concluído, um falta (o painel encaixa em qualquer hora)
  const past = new Date(Date.now() - 3 * 86_400_000);
  past.setUTCHours(13, 0, 0, 0);
  const done1 = (await owner("POST", "/panel/appointments", { serviceId: corte.id, professionalId: ze.id, startsAt: past.toISOString(), clientName: "Passado Um", clientPhone: "11944443333" })).data;
  const past2 = new Date(past.getTime() + 60 * 60_000);
  const miss = (await owner("POST", "/panel/appointments", { serviceId: corte.id, professionalId: ze.id, startsAt: past2.toISOString(), clientName: "Passado Dois", clientPhone: "11933332222" })).data;
  await owner("PATCH", `/panel/appointments/${done1.id}/status`, { status: "COMPLETED" });
  await owner("PATCH", `/panel/appointments/${miss.id}/status`, { status: "NO_SHOW" });
  const rep = await owner("GET", `/panel/reports?from=${spDate(-5)}&to=${spDate(-1)}`);
  ok(rep.status === 200 && rep.data.totals.done === 1 && rep.data.totals.revenueCents === 4000, "faturamento e atendimentos do período", rep.data.totals);
  ok(rep.data.totals.noShowRate === 0.5 && rep.data.totals.newClients === 1, "taxa de faltas e cliente novo", rep.data.totals);
  ok(rep.data.byWeekday.reduce((s, w) => s + w.done, 0) === 1 && rep.data.byProfessional[0]?.id === ze.id, "divisão por dia e por profissional");
  ok((await owner("GET", `/panel/reports?from=${spDate(0)}&to=${spDate(-1)}`)).status === 400, "período invertido é recusado");

  // ---------------------------------------------------------------
  group("Senha: troca, sessões e senha temporária");
  const otherDevice = client();
  await otherDevice("POST", "/auth/login", { email: ownerEmail, password: "senhadono123" });
  ok((await owner("POST", "/auth/password", { currentPassword: "errada123", newPassword: "novasenha123" })).data.code === "WRONG_PASSWORD", "senha atual errada é recusada");
  ok((await owner("POST", "/auth/password", { currentPassword: "senhadono123", newPassword: "novasenha123" })).status === 204, "troca a senha");
  ok((await owner("GET", "/auth/me")).status === 200, "este aparelho continua logado");
  ok((await otherDevice("GET", "/auth/me")).status === 401, "o outro aparelho sai (sessão antiga deixa de valer)");
  ok((await client()("POST", "/auth/login", { email: ownerEmail, password: "senhadono123" })).status === 401, "senha antiga não entra");

  const reset = await admin("POST", `/admin/barbershops/${shop.id}/owner-password`, {});
  ok(reset.status === 200 && /^[a-z2-9]{4}-[a-z2-9]{4}$/.test(reset.data.tempPassword), "admin gera senha temporária", reset.data);
  ok((await owner("GET", "/panel/dashboard")).status === 401, "senha temporária derruba a sessão do dono");
  const tempLogin = await owner("POST", "/auth/login", { email: ownerEmail, password: reset.data.tempPassword });
  ok(tempLogin.data.user?.mustChangePassword === true, "entra com a temporária e precisa criar senha", tempLogin.data);
  await owner("POST", "/auth/password", { currentPassword: reset.data.tempPassword, newPassword: "senhafinal123" });
  ok((await owner("GET", "/auth/me")).data.user.mustChangePassword === false, "depois de criar a senha, segue normal");

  // ---------------------------------------------------------------
  group("Login do barbeiro da equipe (só o que é dele)");
  const access = await owner("POST", `/panel/professionals/${pedro.id}/access`, { email: `pedro-${Date.now()}@teste.local` });
  ok(access.status === 201 && access.data.tempPassword, "dono cria o acesso do Pedro", access.data);
  ok((await owner("POST", `/panel/professionals/${ze.id}/access`, { email: "x@teste.local" })).status === 400, "não cria acesso para o próprio dono");
  const barber = client();
  const bl = await barber("POST", "/auth/login", { email: access.data.email, password: access.data.tempPassword });
  ok(bl.status === 200 && bl.data.user.role === "BARBER" && bl.data.user.mustChangePassword, "Pedro entra com senha temporária", bl.data);
  await barber("POST", "/auth/password", { currentPassword: access.data.tempPassword, newPassword: "senhapedro123" });

  const bPros = (await barber("GET", "/panel/professionals")).data;
  ok(bPros.length === 1 && bPros[0].id === pedro.id, "vê só o próprio cadastro", bPros.map((p) => p.name));
  const bShop = (await barber("GET", "/panel/barbershop")).data;
  ok(bShop.id === shop.id && bShop.subscription === null, "vê a barbearia, mas não a mensalidade", bShop.subscription);
  const bWeek = (await barber("GET", `/panel/appointments?date=${spDate(-5)}&days=7`)).data;
  ok(bWeek.every((a) => a.professionalId === pedro.id), "agenda: só os próprios clientes");
  const bAll = (await barber("GET", `/panel/appointments?date=${date}&professionalId=${ze.id}`)).data;
  ok(bAll.every((a) => a.professionalId === pedro.id), "pedir a agenda do colega não adianta");
  const bRep = (await barber("GET", `/panel/reports?from=${spDate(-5)}&to=${spDate(-1)}`)).data;
  ok(bRep.totals.done === 0, "relatório só com os números dele", bRep.totals);

  for (const [method, path, body] of [
    ["PUT", "/panel/barbershop", settings],
    ["GET", "/panel/clients"],
    ["GET", "/panel/reviews"],
    ["POST", "/panel/services", { name: "Hack", durationMinutes: 30, priceCents: 0, active: true }],
    ["DELETE", `/panel/services/${corte.id}`],
    ["PUT", `/panel/professionals/${pedro.id}/hours`, { hours: [] }],
    ["POST", `/panel/professionals/${pedro.id}/access/reset`],
    ["POST", "/panel/uploads?kind=logo"],
    ["GET", "/admin/stats"],
  ]) {
    const r = await barber(method, path, body);
    ok(r.status === 403, `bloqueado: ${method} ${path}`, r.status);
  }

  const zeAppt = (await owner("GET", `/panel/appointments?date=${date}`)).data.find((a) => a.professionalId === ze.id && a.status === "CONFIRMED");
  if (zeAppt) {
    ok((await barber("PATCH", `/panel/appointments/${zeAppt.id}/status`, { status: "CANCELED" })).status === 404, "não mexe em cliente do colega");
    ok((await barber("POST", `/panel/appointments/${zeAppt.id}/cancel`, {})).status === 404, "não desmarca cliente do colega");
  }
  const bSlots = (await barber("GET", `/panel/availability?serviceId=${corte.id}&date=${spDate(4)}&professionalId=${ze.id}`)).data.slots;
  ok(bSlots.every((s) => s.professionalIds.every((id) => id === pedro.id)), "horários livres: só os dele");
  const forZe = await barber("POST", "/panel/appointments", { serviceId: corte.id, professionalId: ze.id, startsAt: past.toISOString(), clientName: "Teste", clientPhone: "11922221111" });
  ok(forZe.status === 403, "não agenda na cadeira do colega", forZe.status);
  const bOff = await barber("POST", "/panel/time-offs", { professionalId: ze.id, startsAt: new Date(Date.now() + 9 * 86_400_000).toISOString(), endsAt: new Date(Date.now() + 9.1 * 86_400_000).toISOString() });
  ok(bOff.status === 201 && bOff.data.professionalId === pedro.id, "folga marcada pelo barbeiro é sempre dele", bOff.data);

  await owner("PUT", `/panel/professionals/${pedro.id}`, { name: "Pedro Souza", active: false, serviceIds: [] });
  ok((await barber("GET", "/panel/dashboard")).status === 403, "profissional desativado perde o acesso");
  await owner("PUT", `/panel/professionals/${pedro.id}`, { name: "Pedro Souza", active: true, serviceIds: [corte.id] });
  ok((await barber("GET", "/panel/dashboard")).status === 200, "reativado, volta a entrar");
  ok((await owner("DELETE", `/panel/professionals/${pedro.id}/access`)).status === 204, "dono remove o acesso");
  ok((await client()("POST", "/auth/login", { email: access.data.email, password: "senhapedro123" })).status === 401, "sem acesso, não entra mais");

  // ---------------------------------------------------------------
  group("Fila por ordem de chegada");
  const { c: q, shop: qshop } = await registerShop(admin, equipe, { prefix: "fila", bookingMode: "QUEUE" });
  const ana = (await q("GET", "/panel/professionals")).data[0];
  const bia = (await q("POST", "/panel/professionals", { name: "Bia", active: true, serviceIds: [] })).data;
  const e1 = (await q("POST", "/panel/queue", { professionalId: ana.id, clientName: "Esquecido" })).data;
  await q("PATCH", `/panel/queue/${e1.id}/status`, { status: "IN_SERVICE" });
  await prisma.queueEntry.update({ where: { id: e1.id }, data: { joinedAt: new Date(Date.now() - 86_400_000), startedAt: new Date(Date.now() - 86_400_000) } });
  const e2 = (await q("POST", "/panel/queue", { professionalId: ana.id, clientName: "Hoje" })).data;
  ok((await q("PATCH", `/panel/queue/${e2.id}/status`, { status: "IN_SERVICE" })).status === 200, "atendimento esquecido de ontem não trava a cadeira");
  const e3 = (await q("POST", "/panel/queue", { professionalId: ana.id, clientName: "Outro" })).data;
  ok((await q("PATCH", `/panel/queue/${e3.id}/status`, { status: "IN_SERVICE" })).status === 409, "um por vez na cadeira hoje");
  await q("PATCH", `/panel/queue/${e2.id}/status`, { status: "DONE" });

  const biaAccess = (await q("POST", `/panel/professionals/${bia.id}/access`, { email: `bia-${Date.now()}@teste.local` })).data;
  const biaC = client();
  await biaC("POST", "/auth/login", { email: biaAccess.email, password: biaAccess.tempPassword });
  const board = (await biaC("GET", "/panel/queue")).data;
  ok(board.length === 1 && board[0].id === bia.id, "barbeira vê só a própria fila", board.map((b) => b.name));
  ok((await biaC("POST", "/panel/queue", { professionalId: ana.id, clientName: "Furão" })).status === 403, "não coloca cliente na fila da colega");
  ok((await biaC("PATCH", `/panel/queue/${e3.id}/status`, { status: "DONE" })).status === 404, "não mexe na fila da colega");
  ok((await biaC("PATCH", `/panel/queue/professionals/${ana.id}/open`, { open: false })).status === 403, "não fecha a fila da colega");
  ok((await biaC("POST", "/panel/queue", { professionalId: bia.id, clientName: "Cliente da Bia" })).status === 201, "usa a própria fila normalmente");

  await q("DELETE", `/panel/professionals/${ana.id}`);
  const anaAfter = (await q("GET", "/panel/professionals")).data.find((p) => p.id === ana.id);
  ok(anaAfter?.active === false, "profissional com histórico de fila é desativado, não apagado");
  ok((await prisma.queueEntry.count({ where: { professionalId: ana.id } })) === 3, "histórico da fila preservado");
  ok((await client()("GET", `/public/barbershops/${qshop.slug}/queue`)).status === 200, "fila pública responde");

  console.log(failures ? `\n✗ ${failures} falha(s)` : "\n✓ Tudo certo");
}

main()
  .catch((err) => {
    console.error(`\n✗ Erro em "${section}":`, err);
    failures++;
  })
  .finally(async () => {
    await prisma.$disconnect();
    process.exit(failures ? 1 : 0);
  });
