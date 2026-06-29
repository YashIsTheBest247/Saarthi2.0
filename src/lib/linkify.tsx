import { ReactNode } from "react";

/**
 * Turn phone/helpline numbers into tap-to-call `tel:` links and URLs into links,
 * inside otherwise-plain agent text. Copy/raw text is never altered.
 */
const RE = /((?:https?:\/\/)?[a-z0-9][a-z0-9.-]*\.(?:gov\.in|nic\.in|org|com|in|net)(?:\/[^\s,)]*)?|(?<![₹\d.,@/-])(?:1800[\s-]?\d{3}[\s-]?\d{3,4}|0\d{2,4}[\s-]?\d{6,8}|[6-9]\d{9}|1[0-9]{2,4})(?![\d.,]))/gi;

export function linkify(text?: string): ReactNode[] {
  if (!text) return [text || ""];
  const out: ReactNode[] = [];
  const re = new RegExp(RE.source, "gi");
  let last = 0;
  let k = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) {
    if (m.index > last) out.push(text.slice(last, m.index));
    const tok = m[0];
    const cls = "font-medium text-[#2D6BFF] underline decoration-dotted underline-offset-2";
    if (/[a-z]/i.test(tok)) {
      const href = tok.startsWith("http") ? tok : `https://${tok}`;
      out.push(<a key={k++} href={href} target="_blank" rel="noreferrer" className={cls}>{tok}</a>);
    } else {
      out.push(<a key={k++} href={`tel:${tok.replace(/[^\d+]/g, "")}`} className={cls}>{tok}</a>);
    }
    last = m.index + tok.length;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}
