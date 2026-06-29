/**
 * Free-ish SMS for emergency alerts.
 *  - Fast2SMS (India, reliable): set FAST2SMS_KEY (free credits on signup at fast2sms.com)
 *  - TextBelt (fallback, works with no setup): free shared key "textbelt" = ~1 SMS/day,
 *    or set TEXTBELT_KEY for a paid quota. International number format (+91…).
 */
export const smsEnabled = true; // TextBelt free fallback always exists

export async function sendSMS({ to, message }) {
  const digits = String(to || "").replace(/[^\d]/g, "");
  if (digits.length < 10) return { ok: false, error: "invalid-number" };

  // Fast2SMS — best for Indian numbers
  const f2s = (process.env.FAST2SMS_KEY || "").trim();
  if (f2s) {
    try {
      const india = digits.replace(/^91/, "").slice(-10);
      const res = await fetch("https://www.fast2sms.com/dev/bulkV2", {
        method: "POST",
        headers: { authorization: f2s, "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({ route: "q", message, language: "english", numbers: india }).toString(),
      });
      const j = await res.json().catch(() => ({}));
      if (j.return === true) return { ok: true, provider: "Fast2SMS" };
      return { ok: false, provider: "Fast2SMS", error: j.message || JSON.stringify(j) };
    } catch (e) { return { ok: false, provider: "Fast2SMS", error: String(e?.message || e) }; }
  }

  // TextBelt fallback
  try {
    const key = (process.env.TEXTBELT_KEY || "textbelt").trim();
    const res = await fetch("https://textbelt.com/text", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ phone: "+" + digits, message, key }).toString(),
    });
    const j = await res.json().catch(() => ({}));
    if (j.success) return { ok: true, provider: "TextBelt", quota: j.quotaRemaining };
    return { ok: false, provider: "TextBelt", error: j.error || "send failed (free quota may be used up — add FAST2SMS_KEY)" };
  } catch (e) { return { ok: false, provider: "TextBelt", error: String(e?.message || e) }; }
}
