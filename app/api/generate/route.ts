import { NextResponse } from "next/server";
import { admin, userFrom } from "@/lib/server";
import { providers } from "@/lib/providers";
import { MODEL } from "@/lib/providers/huggingface";

export const maxDuration = 60;
const ASPECTS = ["1:1", "3:4", "4:3", "9:16", "16:9"];

export async function POST(req: Request) {
  const user = await userFrom(req);
  if (!user) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  const { prompt, aspect = "1:1", providerId = "huggingface" } = await req.json().catch(() => ({}));
  const userKey = req.headers.get("x-provider-key") || undefined; // used for this request only, never stored
  if (typeof prompt !== "string" || prompt.trim().length < 3 || prompt.length > 1000)
    return NextResponse.json({ error: "Prompt must be 3 to 1000 characters." }, { status: 400 });
  if (!ASPECTS.includes(aspect)) return NextResponse.json({ error: "Unsupported aspect ratio." }, { status: 400 });
  const provider = providers[providerId];
  if (!provider) return NextResponse.json({ error: "Unknown provider." }, { status: 400 });

  const db = admin();
  if (!userKey) {
    const since = new Date(Date.now() - 86_400_000).toISOString();
    const { count } = await db.from("generation_jobs").select("id", { count: "exact", head: true })
      .eq("user_id", user.id).gte("created_at", since);
    const limit = Number(process.env.DAILY_IMAGE_LIMIT || 10);
    if ((count ?? 0) >= limit)
      return NextResponse.json({ error: `Daily limit of ${limit} reached. Add your own key to continue.` }, { status: 429 });
  }
  const { data: job, error: jobErr } = await db.from("generation_jobs")
    .insert({ user_id: user.id, provider: provider.id, model: MODEL, prompt: prompt.trim(), aspect }).select().single();
  if (jobErr || !job) return NextResponse.json({ error: "Could not create job." }, { status: 500 });

  try {
    const out = await provider.generateImage({ prompt: prompt.trim(), aspect, apiKey: userKey });
    const path = `${user.id}/${job.id}.png`;
    const up = await db.storage.from("creations").upload(path, out.bytes, { contentType: out.contentType });
    if (up.error) throw new Error("Could not save image.");
    await db.from("generation_jobs").update({ status: "succeeded", output_path: path }).eq("id", job.id);
    return NextResponse.json({ id: job.id, status: "succeeded" });
  } catch (e: any) {
    const msg = e?.message || "Generation failed.";
    await db.from("generation_jobs").update({ status: "failed", error: msg }).eq("id", job.id);
    return NextResponse.json({ id: job.id, status: "failed", error: msg }, { status: 502 });
  }
    }
