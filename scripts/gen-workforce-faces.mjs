// Generate photoreal Indian AI-employee portraits for the AI Workforce (keyless, Pollinations/FLUX).
// Run: node scripts/gen-workforce-faces.mjs
import { writeFile, mkdir } from "node:fs/promises";

const OUT = "public/agents";
const STYLE =
  "professional studio portrait, soft cinematic lighting, shallow depth of field, neutral warm grey background, 50mm lens, photorealistic, ultra detailed, sharp focus, looking at camera";

const JOBS = [
  { file: "finance.jpg", seed: 311, prompt: `headshot of a trustworthy Indian man in his 40s, bank/finance advisor, neat hair with light grey, subtle confident smile, wearing a navy blazer over a light shirt, ${STYLE}` },
  { file: "receivables.jpg", seed: 322, prompt: `headshot of a sharp Indian man in his early 30s, credit-control/legal-recovery professional, composed serious expression, wearing a charcoal formal shirt, ${STYLE}` },
  { file: "accounts.jpg", seed: 333, prompt: `headshot of a professional Indian woman accountant in her early 30s, thin-framed glasses, friendly competent expression, wearing a tailored blazer, ${STYLE}` },
  { file: "enviro.jpg", seed: 344, prompt: `headshot of an earnest Indian man in his 30s, environmental engineer, warm approachable expression, wearing an olive-green collared shirt, ${STYLE}` },
  { file: "food.jpg", seed: 355, prompt: `headshot of a warm Indian woman in her early 30s, food-safety and quality expert, friendly smile, wearing a clean white chef-style jacket, ${STYLE}` },
  { file: "build.jpg", seed: 366, prompt: `headshot of a confident Indian man in his 40s, civil/construction engineer, light stubble, wearing a light blue collared work shirt, ${STYLE}` },
  { file: "electronics.jpg", seed: 377, prompt: `headshot of a smart Indian woman in her late 20s, electronics and IT compliance engineer, confident modern expression, wearing a dark blazer, ${STYLE}` },
  { file: "mobility.jpg", seed: 388, prompt: `headshot of a capable Indian man in his 30s, automotive and EV engineer, friendly focused expression, wearing a dark polo shirt, ${STYLE}` },
];

async function gen({ file, prompt, seed }) {
  const url = `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=760&height=960&seed=${seed}&nologo=true&model=flux`;
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const ctrl = new AbortController();
      const to = setTimeout(() => ctrl.abort(), 90_000);
      const res = await fetch(url, { signal: ctrl.signal });
      clearTimeout(to);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const buf = Buffer.from(await res.arrayBuffer());
      if (buf.length < 3000) throw new Error("too small");
      await writeFile(`${OUT}/${file}`, buf);
      console.log(`✓ ${file} (${(buf.length / 1024).toFixed(0)} KB)`);
      return true;
    } catch (e) {
      console.log(`… ${file} attempt ${attempt} failed: ${e.message}`);
    }
  }
  console.log(`✗ ${file} could not be generated`);
  return false;
}

await mkdir(OUT, { recursive: true });
for (const job of JOBS) {
  // eslint-disable-next-line no-await-in-loop
  await gen(job);
}
console.log("done");
