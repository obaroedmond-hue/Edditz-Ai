import { NextResponse } from "next/server";
import { userFrom } from "@/lib/server";

export const maxDuration = 30;
const SYSTEM = "You rewrite short ideas into one detailed prompt for an AI image generator. Add subject detail, setting, lighting, camera or lens, mood and style. Keep the user's intent. Do not add text overlays or real people's names. Reply with the prompt only, under 80 words.";

export async function POST(req: Request) {
  const user = await userFrom(req);
  if (!user) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  const { prompt } = await req.json().catch(() => ({}));
  if (typeof prompt !== "string" || prompt.trim().length < 3 || prompt.length > 500)
    return NextResponse.json({ error: "Write 3 to 500 characters first." }, { status: 400 });
  const token = req.headers.get("x-provider-key") || process.env.HF_TOKEN;
  if (!token) return NextResponse.json({ error: "No Hugging Face token configured." }, { status: 500 });
  const model = process.env.PROMPT_MODEL || "meta-llama/Llama-3.1-8B-Instruct";
  try {
    const r = await fetch("https://router.huggingface.co/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ model, max_tokens: 200, messages: [{ role: "system", content: SYSTEM }, { role: "user", content: prompt.trim() }] }),
      signal: AbortSignal.timeout(25_000),
    });
    if (r.status === 402 || r.status === 429)
      return NextResponse.json({ error: "Free quota used up. Try later or use your own key." }, { status: 429 });
    if (!r.ok) return NextResponse.json({ error: `Prompt helper unavailable (${r.status}). You can still generate with your own prompt.` }, { status: 502 });
    const d = await r.json();
    const text = d?.choices?.[0]?.message?.content?.trim();
    if (!text) return NextResponse.json({ error: "Empty reply. Try again." }, { status: 502 });
    return NextResponse.json({ prompt: text.slice(0, 900) });
  } catch {
    return NextResponse.json({ error: "Prompt helper timed out. Try again." }, { status: 504 });
  }
    }
