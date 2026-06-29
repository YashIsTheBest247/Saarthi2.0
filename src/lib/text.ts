/**
 * Strip stray markdown so agent text always renders as clean plain text
 * (a safety net on top of the "plain text only" prompt rule). Used for prose
 * shown directly in the UI — NOT for code/LaTeX blocks.
 */
export function clean(s?: string): string {
  if (!s) return "";
  return s
    .replace(/\*\*(.*?)\*\*/g, "$1")            // **bold**
    .replace(/__(.*?)__/g, "$1")                // __bold__
    .replace(/(^|[\s(])\*(\S.*?\S|\S)\*(?=[\s).,!?:;]|$)/g, "$1$2") // *italic*
    .replace(/^\s{0,3}#{1,6}\s+/gm, "")          // # headings
    .replace(/^\s*[*+-]\s+/gm, "• ")             // * / - bullets → •
    .replace(/`([^`]+)`/g, "$1")                 // `code`
    .trim();
}
