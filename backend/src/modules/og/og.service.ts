import { readFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { APP_NAME } from "@navalha/shared";
import type { Barbershop } from "@prisma/client";
import { UPLOAD_DIR } from "../uploads/uploads.service";

/**
 * Imagens de prévia de link (Open Graph) — o que aparece ao mandar o link no WhatsApp/Instagram/Facebook.
 * 1200×630, JPEG (formato aceito por todos os apps).
 */
const W = 1200;
const H = 630;

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/** Quebra o nome em até 2 linhas que caibam na largura */
function wrap(text: string, maxChars: number) {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let cur = "";
  for (const w of words) {
    if ((cur + " " + w).trim().length > maxChars && cur) {
      lines.push(cur);
      cur = w;
    } else cur = (cur + " " + w).trim();
  }
  if (cur) lines.push(cur);
  if (lines.length > 2) return [lines[0]!, lines.slice(1).join(" ").slice(0, maxChars - 1) + "…"];
  return lines;
}

const FONT = "Inter, 'DejaVu Sans', Arial, sans-serif";

/** Fundo: listras diagonais sutis sobre o degradê das cores da barbearia */
function backgroundSvg(primary: string, secondary: string) {
  return `
  <defs>
    <radialGradient id="glow" cx="1" cy="0" r="1.1">
      <stop offset="0" stop-color="${primary}" stop-opacity=".85"/>
      <stop offset=".6" stop-color="${primary}" stop-opacity="0"/>
    </radialGradient>
    <pattern id="stripes" width="42" height="42" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
      <rect width="16" height="42" fill="#fff" fill-opacity=".045"/>
    </pattern>
  </defs>
  <rect width="${W}" height="${H}" fill="${secondary}"/>
  <rect width="${W}" height="${H}" fill="url(#glow)"/>
  <rect width="${W}" height="${H}" fill="url(#stripes)"/>`;
}

async function loadLocalImage(url: string | null) {
  if (!url?.startsWith("/uploads/")) return null;
  const file = path.join(UPLOAD_DIR, url.replace(/^\/uploads\//, ""));
  if (!file.startsWith(UPLOAD_DIR)) return null; // segurança: nada fora da pasta de uploads
  return readFile(file).catch(() => null);
}

function luminance(hex: string) {
  const n = parseInt(hex.slice(1), 16);
  return ((n >> 16) & 255) * 0.299 + ((n >> 8) & 255) * 0.587 + (n & 255) * 0.114;
}

/** Card da barbearia: capa (ou degradê), logo, nome e chamada */
export async function renderBarbershopCard(shop: Barbershop, host: string) {
  const [cover, logo] = await Promise.all([loadLocalImage(shop.coverUrl), loadLocalImage(shop.logoUrl)]);

  // base: capa recortada + escurecida, ou o degradê da paleta
  let base: sharp.Sharp;
  if (cover) {
    base = sharp(cover).resize(W, H, { fit: "cover", position: "attention" });
  } else {
    base = sharp(Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">${backgroundSvg(shop.primaryColor, shop.secondaryColor)}</svg>`));
  }

  const lines = wrap(shop.name, 22);
  const subtitle = shop.bookingMode === "QUEUE" ? "Atendimento por ordem de chegada · veja a fila ao vivo" : "Agende seu horário online em segundos";
  const city = shop.city ? ` · ${shop.city}` : "";
  const nameY = lines.length > 1 ? 330 : 380;
  const btnText = shop.bookingMode === "QUEUE" ? "Ver a fila agora" : "Agendar horário";
  const btnFg = luminance(shop.primaryColor) > 150 ? "#18181b" : "#ffffff";
  const initial = esc(shop.name.trim()[0]?.toUpperCase() ?? "?");

  const overlay = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">
    <defs>
      <linearGradient id="shade" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#000" stop-opacity="${cover ? 0.15 : 0}"/>
        <stop offset="1" stop-color="#000" stop-opacity="${cover ? 0.78 : 0.35}"/>
      </linearGradient>
    </defs>
    <rect width="${W}" height="${H}" fill="url(#shade)"/>
    ${logo ? "" : `<rect x="72" y="72" width="150" height="150" rx="36" fill="${shop.primaryColor}"/><text x="147" y="172" font-family="${FONT}" font-size="84" font-weight="800" fill="${btnFg}" text-anchor="middle">${initial}</text>`}
    ${lines.map((l, i) => `<text x="72" y="${nameY + i * 78}" font-family="${FONT}" font-size="70" font-weight="800" fill="#fff" letter-spacing="-1.5">${esc(l)}</text>`).join("")}
    <text x="72" y="${nameY + lines.length * 78 - 18}" font-family="${FONT}" font-size="30" fill="#fff" fill-opacity=".82">${esc(subtitle + city)}</text>
    <rect x="72" y="510" width="${btnText.length * 17 + 64}" height="64" rx="32" fill="${shop.primaryColor}"/>
    <text x="${72 + (btnText.length * 17 + 64) / 2}" y="552" font-family="${FONT}" font-size="28" font-weight="700" fill="${btnFg}" text-anchor="middle">${esc(btnText)} →</text>
    <text x="${W - 72}" y="552" font-family="${FONT}" font-size="24" fill="#fff" fill-opacity=".7" text-anchor="end">${esc(host)}/${esc(shop.slug)}</text>
  </svg>`;

  const layers: sharp.OverlayOptions[] = [{ input: Buffer.from(overlay) }];
  if (logo) {
    const size = 150;
    const mask = Buffer.from(`<svg width="${size}" height="${size}"><rect width="${size}" height="${size}" rx="36" fill="#fff"/></svg>`);
    const rounded = await sharp(logo).resize(size, size, { fit: "cover" }).composite([{ input: mask, blend: "dest-in" }]).png().toBuffer();
    const border = Buffer.from(`<svg width="${size + 12}" height="${size + 12}"><rect width="${size + 12}" height="${size + 12}" rx="42" fill="#fff"/></svg>`);
    layers.push({ input: border, left: 66, top: 66 }, { input: rounded, left: 72, top: 72 });
  }

  return base.composite(layers).jpeg({ quality: 84, mozjpeg: true }).toBuffer();
}

/** Card do produto (link da página inicial, login, cadastro) */
export async function renderDefaultCard(host: string) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">
    ${backgroundSvg("#d97706", "#0c0a09")}
    <g transform="translate(72 96)">
      <rect width="120" height="120" rx="30" fill="#18181b" stroke="#ffffff" stroke-opacity=".12" stroke-width="2"/>
      <g transform="translate(60 60) rotate(-45)" stroke="#f59e0b" stroke-width="7" stroke-linecap="round" fill="none">
        <circle cx="-22" cy="-14" r="11"/><circle cx="-22" cy="14" r="11"/>
        <path d="M-12 -8 L30 14 M-12 8 L30 -14"/>
      </g>
    </g>
    <text x="216" y="182" font-family="${FONT}" font-size="64" font-weight="800" fill="#fff" letter-spacing="-1">${esc(APP_NAME)}</text>
    <text x="72" y="330" font-family="${FONT}" font-size="66" font-weight="800" fill="#fff" letter-spacing="-1.5">Sua agenda cheia,</text>
    <text x="72" y="408" font-family="${FONT}" font-size="66" font-weight="800" fill="#f59e0b" letter-spacing="-1.5">sem mensagem no WhatsApp.</text>
    <text x="72" y="470" font-family="${FONT}" font-size="30" fill="#fff" fill-opacity=".75">Agenda online e fila por ordem de chegada para barbearias</text>
    <text x="72" y="560" font-family="${FONT}" font-size="26" fill="#fff" fill-opacity=".6">${esc(host)}</text>
  </svg>`;
  return sharp(Buffer.from(svg)).jpeg({ quality: 86, mozjpeg: true }).toBuffer();
}
