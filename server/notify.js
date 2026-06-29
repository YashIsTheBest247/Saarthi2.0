/**
 * Email notifications via SMTP (Nodemailer).
 *
 * Set on the server / Vercel:
 *   SMTP_HOST       = smtp.gmail.com
 *   SMTP_PORT       = 587            (or 465 for SSL)
 *   SMTP_USERNAME   = your.address@gmail.com
 *   SMTP_PASSWORD   = a 16-char Google "App Password" (needs 2-Step Verification)
 *   SMTP_FROM_EMAIL = your.address@gmail.com
 * (legacy GMAIL_USER / GMAIL_APP_PASSWORD are still honoured as a fallback.)
 *
 * With credentials set we send a real email to any recipient the user enters.
 * Without them, the API returns a demo-safe `_mock: true` so the product still
 * works on stage.
 */

const HOST = process.env.SMTP_HOST || "";
const PORT = parseInt(process.env.SMTP_PORT || "587", 10);
const USER = process.env.SMTP_USERNAME || process.env.GMAIL_USER || "";
const PASS = (process.env.SMTP_PASSWORD || process.env.GMAIL_APP_PASSWORD || "").replace(/\s+/g, "");
const FROM = process.env.SMTP_FROM_EMAIL || USER;
export const mailEnabled = !!(USER && PASS);

let _transport = null;
async function transport() {
  if (!_transport) {
    // lazy import keeps serverless cold-starts light
    const nodemailer = (await import("nodemailer")).default;
    _transport = HOST
      ? nodemailer.createTransport({ host: HOST, port: PORT, secure: PORT === 465, auth: { user: USER, pass: PASS } })
      : nodemailer.createTransport({ service: "gmail", auth: { user: USER, pass: PASS } });
  }
  return _transport;
}

export async function sendMail({ to, subject, text, html, attachments }) {
  if (!mailEnabled) throw new Error("mail-not-configured");
  const tx = await transport();
  return tx.sendMail({ from: `Saarthi <${FROM}>`, to, subject, text, html, attachments });
}

/** A simple branded HTML wrapper for a completion email. */
export function completionHtml({ title, body }) {
  const safe = String(body || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/\n/g, "<br/>");
  return `<div style="font-family:Segoe UI,Arial,sans-serif;max-width:560px;margin:0 auto;color:#16140f">
  <div style="background:#16140f;color:#fff;padding:18px 22px;border-radius:14px 14px 0 0">
    <div style="font-size:18px;font-weight:700">Saarthi · सारथी</div>
    <div style="font-size:13px;opacity:.7">Your everyday AI saathis</div>
  </div>
  <div style="border:1px solid #eee;border-top:none;border-radius:0 0 14px 14px;padding:22px">
    <div style="font-size:13px;font-weight:700;color:#2D6BFF;text-transform:uppercase;letter-spacing:.4px">✅ Task complete</div>
    <h2 style="margin:6px 0 12px;font-size:20px">${String(title || "Your task is done").replace(/</g, "&lt;")}</h2>
    <div style="font-size:15px;line-height:1.55;color:#33302a">${safe}</div>
    <p style="margin-top:22px;font-size:12px;color:#8a857c">Sent by Saarthi because you asked to be emailed when this was done.</p>
  </div>
</div>`;
}
