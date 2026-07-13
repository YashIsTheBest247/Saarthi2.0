/**
 * Strip stray markdown so agent text always renders as clean plain text
 * (a safety net on top of the "plain text only" prompt rule). Used for prose
 * shown directly in the UI — NOT for code/LaTeX blocks.
 */
export function clean(s?: string): string {
  if (!s) return "";
  let text = s.trim();
  // The model sometimes wraps its answer as JSON, e.g. {"answer":"…"} (and it can be
  // truncated). Unwrap it so the UI shows the prose, never the JSON envelope.
  if (text.startsWith("{") && /^\{\s*"(answer|reply|deliverable|text|summary|output|result|message)"\s*:/.test(text)) {
    try {
      const o = JSON.parse(text);
      const v = o.answer ?? o.reply ?? o.deliverable ?? o.text ?? o.summary ?? o.output ?? o.result ?? o.message;
      if (typeof v === "string") text = v;
    } catch {
      // truncated / malformed JSON → pull the value out with a regex
      const m = text.match(/^\{\s*"(?:answer|reply|deliverable|text|summary|output|result|message)"\s*:\s*"([\s\S]*)$/);
      if (m) text = m[1].replace(/"\s*[,}][\s\S]*$/, "").replace(/"\s*$/, "").replace(/\\"/g, '"').replace(/\\n/g, "\n").replace(/\\t/g, "\t");
    }
  }
  return text
    .replace(/\*\*(.*?)\*\*/g, "$1")            // **bold**
    .replace(/__(.*?)__/g, "$1")                // __bold__
    .replace(/(^|[\s(])\*(\S.*?\S|\S)\*(?=[\s).,!?:;]|$)/g, "$1$2") // *italic*
    .replace(/^\s{0,3}#{1,6}\s+/gm, "")          // # headings
    .replace(/^\s*[*+-]\s+/gm, "• ")             // * / - bullets → •
    .replace(/`([^`]+)`/g, "$1")                 // `code`
    .trim();
}
