// POST /api/message — member-to-member email. Secrets (Cloudflare → Settings → Variables and Secrets):
// SUPABASE_URL, SUPABASE_SERVICE_KEY, RESEND_API_KEY
const DAILY_LIMIT = 10;
const FROM = "MAGIC Community <connect@magiccommunity.org>";
const json = (o, s = 200) => new Response(JSON.stringify(o), { status: s, headers: { "Content-Type": "application/json" } });
const esc = s => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

export async function onRequestPost({ request, env }) {
  const { SUPABASE_URL: U, SUPABASE_SERVICE_KEY: K, RESEND_API_KEY: R } = env;
  if (!U || !K || !R) return json({ error: "Messaging is not configured yet." }, 500);
  const auth = K.startsWith("sb_") ? {} : { Authorization: "Bearer " + K }; // new-style sb_secret keys go in apikey only
  const sb = (path, init = {}) => fetch(U + path, { ...init, headers: { apikey: K, ...auth, "Content-Type": "application/json", ...(init.headers || {}) } });

  const token = (request.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "");
  if (!token) return json({ error: "Please sign in." }, 401);
  const ur = await fetch(U + "/auth/v1/user", { headers: { apikey: K, Authorization: "Bearer " + token } });
  if (!ur.ok) return json({ error: "Please sign in again." }, 401);
  const user = await ur.json();

  let b; try { b = await request.json(); } catch { return json({ error: "Bad request." }, 400); }
  const subject = String(b.subject || "").trim().slice(0, 140), message = String(b.message || "").trim().slice(0, 3000), toId = String(b.to_id || "");
  if (!subject || !message || !/^[0-9a-f-]{36}$/i.test(toId)) return json({ error: "Please fill in the subject and message." }, 400);
  if (toId === user.id) return json({ error: "You can't message yourself." }, 400);

  const [me, to] = await Promise.all([
    sb("/rest/v1/profiles?select=full_name,email&id=eq." + user.id).then(r => r.json()),
    sb("/rest/v1/profiles?select=full_name,email,allow_messages,is_public&id=eq." + toId).then(r => r.json())
  ]);
  if (!Array.isArray(me) || !Array.isArray(to)) { const e = (!Array.isArray(me) ? me : to) || {}; return json({ error: "Server configuration error (" + (e.code || e.hint || "?") + "): " + (e.message || "check SUPABASE_SERVICE_KEY") + " [key starts with " + K.slice(0, 10) + ", length " + K.length + "]" }, 500); }
  const sender = me[0], rcpt = to[0];
  if (!rcpt || !rcpt.allow_messages || !rcpt.is_public) return json({ error: "This member isn't accepting messages." }, 403);
  if (!rcpt.email) return json({ error: "This member has no email on file." }, 500);
  const fromEmail = user.email || (sender && sender.email);
  const fromName = (sender && sender.full_name) || fromEmail;

  const since = new Date(Date.now() - 864e5).toISOString();
  const cnt = await sb("/rest/v1/message_log?select=id&sender_id=eq." + user.id + "&created_at=gte." + since, { headers: { Prefer: "count=exact", Range: "0-0" } });
  const total = +((cnt.headers.get("content-range") || "").split("/")[1] || 0);
  if (total >= DAILY_LIMIT) return json({ error: "Daily message limit reached. Try again tomorrow." }, 429);

  const html = '<p style="white-space:pre-wrap;font-family:sans-serif;font-size:15px;line-height:1.55">' + esc(message) + '</p><hr style="border:0;border-top:1px solid #ddd"><p style="font-family:sans-serif;font-size:12px;color:#777">Sent by ' + esc(fromName) + ' via the MAGIC member directory. Reply to this email to respond to them directly.</p>';
  const send = await fetch("https://api.resend.com/emails", { method: "POST", headers: { Authorization: "Bearer " + R, "Content-Type": "application/json" },
    body: JSON.stringify({ from: FROM, to: [rcpt.email], reply_to: fromName.replace(/[<>"]/g, "") + " <" + fromEmail + ">", subject: "[MAGIC] " + subject, html, text: message + "\n\n—\nSent by " + fromName + " via the MAGIC member directory. Reply to respond to them directly." }) });
  if (!send.ok) return json({ error: "Email could not be sent. Try again later." }, 502);

  await sb("/rest/v1/message_log", { method: "POST", body: JSON.stringify({ sender_id: user.id, recipient_id: toId }) });
  return json({ ok: true });
}
