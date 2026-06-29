import { useState } from "react";
import { Mail, Loader2, Check } from "lucide-react";
import { useApp } from "../app/AppContext";

/**
 * "Email me when it's done" — the user enters their Gmail and we POST the result
 * to /api/notify. Sends a real email if the server has Gmail SMTP configured,
 * otherwise the API returns a demo-safe mock and we say so.
 */
export function NotifyMe({
  getPayload,
  getICS,
  accent = "#2D6BFF",
}: {
  getPayload: () => { title: string; message: string };
  getICS?: () => string | undefined;
  accent?: string;
}) {
  const { t } = useApp();
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "mock" | "invalid" | "err">("idle");

  async function send() {
    const to = email.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) { setStatus("invalid"); return; }
    setStatus("sending");
    try {
      const { title, message } = getPayload();
      const ics = getICS?.();
      const res = await fetch("/api/notify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ to, title, message, ics }),
      });
      const j = await res.json();
      if (!res.ok || j.ok === false) setStatus("err");
      else setStatus(j._mock ? "mock" : "sent");
    } catch {
      setStatus("err");
    }
  }

  const done = status === "sent" || status === "mock";

  return (
    <div className="mt-5 rounded-2xl border border-line bg-mist/40 p-4">
      <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-graphite deva">
        <Mail className="h-4 w-4" style={{ color: accent }} /> {t("notify.label")}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <input
          type="email"
          value={email}
          onChange={(e) => { setEmail(e.target.value); if (status !== "idle") setStatus("idle"); }}
          placeholder={t("notify.ph")}
          className="min-w-[12rem] flex-1 rounded-xl border border-line bg-paper px-3.5 py-2.5 text-sm text-ink outline-none focus:border-[#2D6BFF]"
        />
        <button
          onClick={send}
          disabled={status === "sending" || done}
          className="btn-accent text-sm disabled:opacity-60"
          style={{ background: accent }}
        >
          {status === "sending" ? <><Loader2 className="h-4 w-4 animate-spin" /> {t("notify.sending")}</>
            : done ? <><Check className="h-4 w-4" /> {t(status === "mock" ? "notify.sentMock" : "notify.sent")}</>
              : <><Mail className="h-4 w-4" /> {t("notify.btn")}</>}
        </button>
      </div>
      {status === "invalid" && <p className="mt-2 text-xs font-medium text-danger deva">{t("notify.invalid")}</p>}
      {status === "err" && <p className="mt-2 text-xs font-medium text-danger deva">{t("notify.invalid")}</p>}
    </div>
  );
}
