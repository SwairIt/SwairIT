/**
 * Builds assets/monkeytype.svg from the public Monkeytype profile API.
 *
 * No dependencies, no API key — the profile endpoint is public.
 * Run: node scripts/monkeytype-card.mjs [username]
 */

import { writeFile, mkdir } from "node:fs/promises";

const USER = process.argv[2] ?? "HiL1ne";
const OUT = "assets/monkeytype.svg";

const BG = "#0d1117";
const CARD = "#11161d";
const STROKE = "#1f2733";
const CYAN = "#00e5ff";
const PURPLE = "#7b2ff7";
const GOLD = "#e2b714";
const MUTED = "#8b949e";
const TEXT = "#e6edf3";

const FLAGS = { russian: "RU", english: "EN" };

/** Highest-wpm personal best for a mode, ignoring punctuation/numbers runs. */
function bestOf(entries) {
  if (!Array.isArray(entries) || entries.length === 0) return null;
  const clean = entries.filter((e) => !e.punctuation && !e.numbers);
  const pool = clean.length > 0 ? clean : entries;
  return pool.reduce((a, b) => (b.wpm > a.wpm ? b : a));
}

function esc(s) {
  return String(s).replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" })[c]);
}

/** One WPM tile. */
function tile(x, y, w, h, label, pb) {
  if (!pb) return "";
  const wpm = pb.wpm.toFixed(pb.wpm % 1 === 0 ? 0 : 2);
  const lang = FLAGS[pb.language] ?? pb.language.slice(0, 2).toUpperCase();
  return `
  <g transform="translate(${x} ${y})">
    <rect width="${w}" height="${h}" rx="12" fill="${CARD}" stroke="${STROKE}"/>
    <text x="14" y="24" font-size="13" fill="${MUTED}" font-weight="600">${esc(label)}</text>
    <text x="${w - 14}" y="24" font-size="11" fill="${PURPLE}" font-weight="700" text-anchor="end">${esc(lang)}</text>
    <text x="14" y="62" font-size="34" fill="${CYAN}" font-weight="800" letter-spacing="-1">${wpm}</text>
    <text x="14" y="84" font-size="12" fill="${MUTED}">wpm · ${pb.acc.toFixed(2)}% acc</text>
  </g>`;
}

/** One footer stat. */
function stat(x, y, value, label, color) {
  return `
  <g transform="translate(${x} ${y})">
    <text x="0" y="0" font-size="19" fill="${color}" font-weight="800">${esc(value)}</text>
    <text x="0" y="18" font-size="11" fill="${MUTED}">${esc(label)}</text>
  </g>`;
}

const res = await fetch(`https://api.monkeytype.com/users/${encodeURIComponent(USER)}/profile`);
if (!res.ok) throw new Error(`Monkeytype API returned ${res.status} ${res.statusText}`);

const { data } = await res.json();
const pb = data.personalBests ?? {};
const time = pb.time ?? {};
const words = pb.words ?? {};

const modes = [
  ["15 seconds", bestOf(time["15"])],
  ["30 seconds", bestOf(time["30"])],
  ["60 seconds", bestOf(time["60"])],
  ["10 words", bestOf(words["10"])],
];

const hours = Math.round((data.typingStats?.timeTyping ?? 0) / 60);
const tests = data.typingStats?.completedTests ?? 0;
const xp = data.xp ?? 0;
const nf = new Intl.NumberFormat("en-US");

const W = 780;
const H = 268;
const GAP = 14;
const TW = Math.floor((W - 36 - GAP * 3) / 4);

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" font-family="'JetBrains Mono','Segoe UI',Ubuntu,sans-serif" role="img" aria-label="Monkeytype personal bests for ${esc(USER)}">
  <defs>
    <linearGradient id="edge" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="${CYAN}" stop-opacity="0.55"/>
      <stop offset="100%" stop-color="${PURPLE}" stop-opacity="0.55"/>
    </linearGradient>
    <linearGradient id="accent" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="${CYAN}"/>
      <stop offset="100%" stop-color="${PURPLE}"/>
    </linearGradient>
  </defs>

  <rect width="${W}" height="${H}" rx="16" fill="${BG}" stroke="url(#edge)" stroke-width="1.5"/>
  <rect x="18" y="24" width="4" height="22" rx="2" fill="url(#accent)"/>

  <text x="34" y="42" font-size="19" fill="${TEXT}" font-weight="800">monkeytype</text>
  <text x="${W - 18}" y="42" font-size="14" fill="${GOLD}" font-weight="700" text-anchor="end">@${esc(data.name ?? USER)}</text>
  <text x="34" y="62" font-size="12" fill="${MUTED}">personal bests</text>

  ${modes.map(([label, best], i) => tile(18 + i * (TW + GAP), 78, TW, 100, label, best)).join("")}

  <line x1="18" y1="200" x2="${W - 18}" y2="200" stroke="${STROKE}"/>

  ${stat(18, 226, nf.format(tests), "tests completed", CYAN)}
  ${stat(210, 226, `${nf.format(hours)} h`, "time typing", PURPLE)}
  ${stat(402, 226, nf.format(xp), "xp earned", GOLD)}
  ${stat(594, 226, String(data.maxStreak ?? 0), "max streak", TEXT)}
</svg>
`;

await mkdir("assets", { recursive: true });
await writeFile(OUT, svg, "utf8");
console.log(`Wrote ${OUT} — ${tests} tests, ${hours} h, ${nf.format(xp)} xp`);
