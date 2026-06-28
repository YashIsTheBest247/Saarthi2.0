export type FeatureKey = "kavach" | "samajh" | "haq" | "sehat" | "paisa" | "samay" | "setu" | "krishi" | "kar" | "raahat" | "disha" | "resume" | "extract" | "route" | "emergency" | "form16" | "manager";

export interface ApiMeta {
  _mock?: boolean;
  _error?: string;
}

export async function callFeature<T>(feature: FeatureKey, body: Record<string, unknown>): Promise<T & ApiMeta> {
  const res = await fetch(`/api/${feature}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`Request failed (${res.status})`);
  return res.json();
}

export interface Health {
  ok: boolean;
  live: boolean;
  model: string;
}

export async function getHealth(): Promise<Health> {
  try {
    const res = await fetch("/api/health");
    return await res.json();
  } catch {
    return { ok: false, live: false, model: "offline" };
  }
}

/** Read a File into base64 (no data: prefix) for the Gemini image parts. */
export function fileToInlineData(file: File): Promise<{ mimeType: string; data: string }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      const data = result.split(",")[1] ?? "";
      resolve({ mimeType: file.type || "image/jpeg", data });
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
