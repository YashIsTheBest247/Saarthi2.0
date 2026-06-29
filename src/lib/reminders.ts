// Cross-agent hand-off to Smriti (the manager) + browser reminders.
// Smriti's task board is the single source of truth in localStorage; any agent
// can drop a task here, and Smriti will show it, forecast it and remind about it.

const TASKS_KEY = "saarthi.samay.tasks";

export interface SmritiTask {
  id: number;
  title: string;
  priority: "High" | "Medium" | "Low";
  done: boolean;
  deadline?: string;       // ISO / datetime-local
  estimateMins?: number;
  recur?: "none";
  source?: string;         // which agent created it
}

const uid = () => Math.floor(Math.random() * 1e9);

/** Append a task to Smriti's board. Returns the created task. */
export function sendToSmriti(t: { title: string; deadline?: string; priority?: SmritiTask["priority"]; estimateMins?: number; source?: string }): SmritiTask {
  let list: SmritiTask[] = [];
  try { list = JSON.parse(localStorage.getItem(TASKS_KEY) || "[]"); } catch { list = []; }
  const task: SmritiTask = {
    id: uid(),
    title: t.title,
    priority: t.priority || "High",
    done: false,
    deadline: t.deadline || undefined,
    estimateMins: t.estimateMins,
    recur: "none",
    source: t.source,
  };
  list.push(task);
  try { localStorage.setItem(TASKS_KEY, JSON.stringify(list)); } catch { /* ignore */ }
  window.dispatchEvent(new Event("saarthi:tasks-updated"));
  return task;
}

/** Ask for notification permission (no-op if unsupported / already decided). */
export async function ensureNotifyPermission(): Promise<boolean> {
  try {
    if (!("Notification" in window)) return false;
    if (Notification.permission === "granted") return true;
    if (Notification.permission === "denied") return false;
    return (await Notification.requestPermission()) === "granted";
  } catch { return false; }
}

/** Fire a browser notification now (falls back silently if blocked). */
export async function notify(title: string, body?: string) {
  const ok = await ensureNotifyPermission();
  if (!ok) return false;
  try { new Notification(title, { body, icon: "/favicon.svg" }); return true; } catch { return false; }
}

/** Schedule an in-session reminder if the deadline is within the next 24h. */
export function scheduleReminder(title: string, deadlineIso?: string) {
  if (!deadlineIso) return;
  const ms = new Date(deadlineIso).getTime() - Date.now();
  if (isNaN(ms) || ms <= 0 || ms > 24 * 3600 * 1000) return; // longer-term reminders live in the .ics
  window.setTimeout(() => notify("⏰ Due now", `${title} — from Smriti`), ms);
}

/* ------------------------------ ICS ------------------------------ */
const fmt = (dt: Date) => dt.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");

/** Build a .ics calendar (with a 1-hour-before alarm) for tasks that have a deadline. */
export function buildICS(items: { id?: number; title: string; deadline?: string; estimateMins?: number }[]): string {
  const events = items.filter((t) => t.deadline).map((t) => {
    const start = new Date(t.deadline!);
    const end = new Date(start.getTime() + (t.estimateMins ?? 60) * 60000);
    return ["BEGIN:VEVENT", `UID:${t.id ?? uid()}@saarthi`, `DTSTAMP:${fmt(new Date())}`, `DTSTART:${fmt(start)}`, `DTEND:${fmt(end)}`, `SUMMARY:${t.title.replace(/\n/g, " ")}`, "BEGIN:VALARM", "TRIGGER:-PT60M", "ACTION:DISPLAY", "DESCRIPTION:Reminder", "END:VALARM", "END:VEVENT"].join("\r\n");
  });
  return ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Saarthi//Reminders//EN", ...events, "END:VCALENDAR"].join("\r\n");
}

/** Download an .ics for one or more dated items. */
export function downloadICS(items: { id?: number; title: string; deadline?: string; estimateMins?: number }[], filename = "saarthi-reminder.ics") {
  const blob = new Blob([buildICS(items)], { type: "text/calendar" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

/** Best-effort parse of a human deadline ("Today, Jun 29 2026", "Friday 5pm", "by 5th").
 *  Falls back to tomorrow 9am so the calendar event is always valid. */
export function parseWhen(s?: string): Date {
  if (s) {
    const str = s.replace(/^(today|tomorrow|by|due|on|deadline)[,:\s-]+/i, "").trim();
    let d = new Date(str);
    if (!isNaN(d.getTime())) { if (d.getHours() === 0 && d.getMinutes() === 0) d.setHours(9, 0, 0, 0); return d; }
    d = new Date(s);
    if (!isNaN(d.getTime())) return d;
  }
  const f = new Date(); f.setDate(f.getDate() + 1); f.setHours(9, 0, 0, 0); return f;
}

/** Download an .ics for tasks whose deadlines are free-text (e.g. from an agent). */
export function downloadTasksICS(tasks: { title: string; deadline?: string; estimateMins?: number }[], filename = "saarthi-reminders.ics") {
  downloadICS(tasks.map((t) => ({ title: t.title, deadline: parseWhen(t.deadline).toISOString(), estimateMins: t.estimateMins })), filename);
}
