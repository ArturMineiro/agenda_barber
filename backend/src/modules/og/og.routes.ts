import { Router } from "express";
import { APP_NAME } from "@navalha/shared";
import { env } from "../../config/env";
import { prisma } from "../../lib/prisma";
import { renderBarbershopCard, renderDefaultCard } from "./og.service";

/**
 * Prévias de link (Open Graph).
 * O nginx manda para cá os robôs do WhatsApp/Instagram/Facebook/Telegram etc.;
 * pessoas continuam recebendo o site normal.
 */
export const ogRoutes = Router();

const base = () => env.WEB_URL.replace(/\/$/, "");
const host = () => base().replace(/^https?:\/\//, "");

/** cache em memória das imagens: chave muda quando a barbearia é editada */
const cache = new Map<string, Buffer>();
function remember(key: string, buf: Buffer) {
  if (cache.size > 300) cache.delete(cache.keys().next().value!);
  cache.set(key, buf);
  return buf;
}

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

function page(meta: { title: string; description: string; image: string; url: string }) {
  const t = esc(meta.title);
  const d = esc(meta.description);
  return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8">
<title>${t}</title>
<meta name="description" content="${d}">
<meta property="og:type" content="website">
<meta property="og:site_name" content="${esc(APP_NAME)}">
<meta property="og:locale" content="pt_BR">
<meta property="og:title" content="${t}">
<meta property="og:description" content="${d}">
<meta property="og:url" content="${esc(meta.url)}">
<meta property="og:image" content="${esc(meta.image)}">
<meta property="og:image:secure_url" content="${esc(meta.image)}">
<meta property="og:image:type" content="image/jpeg">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${t}">
<meta name="twitter:description" content="${d}">
<meta name="twitter:image" content="${esc(meta.image)}">
</head><body><a href="${esc(meta.url)}">${t}</a></body></html>`;
}

const DEFAULT = {
  title: `${APP_NAME} — agenda online para barbearias`,
  description: "Seu cliente agenda sozinho pelo link, sem troca de mensagem. Agenda online e fila por ordem de chegada.",
};

async function findShopBySlug(slug: string) {
  if (!/^[a-z0-9-]{3,40}$/.test(slug)) return null;
  const shop = await prisma.barbershop.findUnique({ where: { slug } });
  return shop && shop.status === "ACTIVE" ? shop : null;
}

/** GET /api/og/meta?path=/barbearia-do-ze */
ogRoutes.get("/meta", async (req, res) => {
  const p = String(req.query.path ?? "/");
  const segments = p.split("/").filter(Boolean);
  const url = base() + (p.startsWith("/") ? p : `/${p}`);
  let meta = { ...DEFAULT, image: `${base()}/api/og/image/default.jpg`, url };

  // link do cliente: /agendamento/:token → prévia da barbearia (sem dados do cliente)
  if (segments[0] === "agendamento" && segments[1]) {
    const appt = await prisma.appointment.findUnique({ where: { accessToken: segments[1] }, include: { barbershop: true } });
    if (appt) {
      const v = appt.barbershop.updatedAt.getTime().toString(36);
      meta = {
        title: `Seu horário na ${appt.barbershop.name}`,
        description: "Veja os detalhes, remarque ou cancele seu agendamento.",
        image: `${base()}/api/og/image/${appt.barbershop.slug}.jpg?v=${v}`,
        url,
      };
    }
  } else if (segments.length === 1) {
    const shop = await findShopBySlug(segments[0]!);
    if (shop) {
      const v = shop.updatedAt.getTime().toString(36);
      const action = shop.bookingMode === "QUEUE" ? "Veja a fila ao vivo e quanto tempo vai esperar." : "Agende seu horário online em segundos.";
      meta = {
        title: shop.name,
        description: [action, shop.description].filter(Boolean).join(" ").slice(0, 200),
        image: `${base()}/api/og/image/${shop.slug}.jpg?v=${v}`,
        url,
      };
    }
  }

  res.setHeader("Cache-Control", "public, max-age=300");
  res.type("html").send(page(meta));
});

/** GET /api/og/image/:key.jpg — "default" ou o link da barbearia */
ogRoutes.get("/image/:file", async (req, res) => {
  const key = String(req.params.file).replace(/\.jpe?g$/, "");
  let buf: Buffer;

  if (key === "default") {
    buf = cache.get("default") ?? remember("default", await renderDefaultCard(host()));
  } else {
    const shop = await findShopBySlug(key);
    if (!shop) {
      buf = cache.get("default") ?? remember("default", await renderDefaultCard(host()));
    } else {
      const ck = `${shop.id}:${shop.updatedAt.getTime()}`;
      buf = cache.get(ck) ?? remember(ck, await renderBarbershopCard(shop, host()));
    }
  }

  res.setHeader("Cache-Control", "public, max-age=86400");
  res.type("jpeg").send(buf);
});
