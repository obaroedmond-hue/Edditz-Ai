import { NextResponse } from "next/server";
import { admin, userFrom } from "@/lib/server";

export async function GET(req: Request) {
  const user = await userFrom(req);
  if (!user) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  const db = admin();
  const { data } = await db.from("generation_jobs").select("*").eq("user_id", user.id)
    .order("created_at", { ascending: false }).limit(30);
  const jobs = await Promise.all((data ?? []).map(async (j) => {
    if (!j.output_path) return j;
    const { data: s } = await db.storage.from("creations").createSignedUrl(j.output_path, 3600);
    return { ...j, url: s?.signedUrl };
  }));
  return NextResponse.json({ jobs });
}

export async function DELETE(req: Request) {
  const user = await userFrom(req);
  if (!user) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  const { id } = await req.json().catch(() => ({}));
  const db = admin();
  const { data: j } = await db.from("generation_jobs").select("output_path").eq("id", id).eq("user_id", user.id).single();
  if (!j) return NextResponse.json({ error: "Not found." }, { status: 404 });
  if (j.output_path) await db.storage.from("creations").remove([j.output_path]);
  await db.from("generation_jobs").delete().eq("id", id).eq("user_id", user.id);
  return NextResponse.json({ ok: true });
                                      }
