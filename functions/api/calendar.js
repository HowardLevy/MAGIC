// Cloudflare Pages Function: GET /api/calendar
// Reads the Google Sheet server-side and returns only the columns the site displays.
// Needs two environment variables (Pages project → Settings → Variables and secrets):
//   SHEET_ID       the spreadsheet ID
//   CALENDAR_GID   the gid of the "Approved Calendar" tab

const norm = s => (s || "").toLowerCase().replace(/[^a-z0-9]/g, "");
const KEEP = ["topic", "presenter", "orchestrator", "speaker", "theme", "approveddescription",
  "approvedthumbnail", "thumbnail", "notes", "writeup", "blurb", "description", "recording",
  "video", "deck", "slides"].map(norm);
const DATE_RE = /^(\d{4}-\d{1,2}-\d{1,2}|\d{1,2}\/\d{1,2}\/\d{2,4}|Date\(\d+,\s*\d+,\s*\d+\)|[A-Za-z]{3,9}\.? \d{1,2},? \d{4})/;

function parse(text) {
  const rows = []; let row = [], f = "", q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) { if (c === '"') { if (text[i + 1] === '"') { f += '"'; i++; } else q = false; } else f += c; }
    else if (c === '"') q = true;
    else if (c === ",") { row.push(f); f = ""; }
    else if (c === "\n" || c === "\r") { if (c === "\r" && text[i + 1] === "\n") i++; row.push(f); rows.push(row); row = []; f = ""; }
    else f += c;
  }
  if (f !== "" || row.length) { row.push(f); rows.push(row); }
  return rows;
}
const esc = v => '"' + String(v == null ? "" : v).replace(/"/g, '""') + '"';

export async function onRequestGet({ env }) {
  if (!env.SHEET_ID || !env.CALENDAR_GID) return new Response("Not configured", { status: 500 });
  let text;
  try {
    const url = "https://docs.google.com/spreadsheets/d/" + encodeURIComponent(env.SHEET_ID) +
      "/gviz/tq?tqx=out:csv&headers=0&gid=" + encodeURIComponent(env.CALENDAR_GID);
    const r = await fetch(url, { cf: { cacheTtl: 60, cacheEverything: true } });
    if (!r.ok) return new Response("Upstream error", { status: 502 });
    text = await r.text();
  } catch (e) {
    return new Response("Upstream error", { status: 502 });
  }

  const rows = parse(text);
  const hi = rows.findIndex(r => r.some(c => norm(c).startsWith("topic")));
  if (hi < 0) return new Response("Unexpected sheet format", { status: 502 });
  const head = rows[hi], body = rows.slice(hi + 1);

  const keep = [];
  head.forEach((h, i) => { const n = norm(h); if (n && KEEP.some(k => n.startsWith(k))) keep.push(i); });

  let dateCol = -1, best = 0;
  for (let j = 0; j < head.length; j++) {
    const n = body.reduce((a, r) => a + (DATE_RE.test((r[j] || "").trim()) ? 1 : 0), 0);
    if (n > best) { best = n; dateCol = j; }
  }
  if (dateCol >= 0 && !keep.includes(dateCol)) keep.unshift(dateCol);

  const out = [head, ...body].map(r => keep.map(i => esc(r[i])).join(",")).join("\n");
  return new Response(out, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Cache-Control": "public, max-age=60",
    },
  });
}
