// POST /api/exchange — MAGIC Exchange request → Howard. Uses RESEND_API_KEY (already set).
const TO = "howard@redroostergroup.com";
const json = (o, s = 200) => new Response(JSON.stringify(o), { status: s, headers: { "Content-Type": "application/json" } });
const esc = s => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

export async function onRequestPost({ request, env }) {
  if (!env.RESEND_API_KEY) return json({ error: "Not configured yet." }, 500);
  let b; try { b = await request.json(); } catch { return json({ error: "Bad request." }, 400); }
  if (b.website) return json({ ok: true }); // honeypot
  const name = String(b.name || "").trim().slice(0, 100).replace(/[<>"\r\n]/g, "");
  const email = String(b.email || "").trim().slice(0, 200);
  const q = String(b.question || "").trim().slice(0, 1500), ctx = String(b.context || "").trim().slice(0, 1500);
  if (!name || !q || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return json({ error: "Please fill in your name, a valid email, and your question." }, 400);
  const text = "Please send this to the group:\n\nQuestion:\n" + q + "\n\nContext:\n" + (ctx || "—") + "\n\nFrom: " + name + " <" + email + ">";
  const html = '<div style="font-family:sans-serif;font-size:15px;line-height:1.55;white-space:pre-wrap">' + esc(text) + "</div>";
  const r = await fetch("https://api.resend.com/emails", { method: "POST", headers: { Authorization: "Bearer " + env.RESEND_API_KEY, "Content-Type": "application/json" },
    body: JSON.stringify({ from: "MAGIC Exchange <connect@magiccommunity.org>", to: [TO], reply_to: name + " <" + email + ">", subject: "MAGIC Exchange request from " + name, html, text }) });
  if (!r.ok) return json({ error: "Could not send. Please try again later." }, 502);
  return json({ ok: true });
}
