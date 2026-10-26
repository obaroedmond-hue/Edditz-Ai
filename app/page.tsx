"use client";
import { useEffect, useState, useCallback } from "react";
import { createClient } from "@supabase/supabase-js";

const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
const ASPECTS = ["1:1", "3:4", "4:3", "9:16", "16:9"];

export default function Home() {
  const [token, setToken] = useState<string | null>(null);
  const [email, setEmail] = useState(""); const [pw, setPw] = useState("");
  const [prompt, setPrompt] = useState(""); const [aspect, setAspect] = useState("1:1");
  const [userKey, setUserKey] = useState(""); const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(""); const [jobs, setJobs] = useState<any[]>([]);

  useEffect(() => {
    sb.auth.getSession().then(({ data }) => setToken(data.session?.access_token ?? null));
    const { data: l } = sb.auth.onAuthStateChange((_e, s) => setToken(s?.access_token ?? null));
    return () => l.subscription.unsubscribe();
  }, []);

  const load = useCallback(async () => {
    if (!token) return;
    const r = await fetch("/api/jobs", { headers: { Authorization: `Bearer ${token}` } });
    if (r.ok) setJobs((await r.json()).jobs);
  }, [token]);
  useEffect(() => { load(); }, [load]);

  async function auth(mode: "in" | "up") {
    setMsg("");
    const { error } = mode === "in"
      ? await sb.auth.signInWithPassword({ email, password: pw })
      : await sb.auth.signUp({ email, password: pw });
    setMsg(error ? error.message : mode === "up" ? "Check your email to confirm, then sign in." : "");
  }

  async function generate() {
    setBusy(true); setMsg("Generating. This usually takes a few seconds.");
    const r = await fetch("/api/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}`, ...(userKey ? { "x-provider-key": userKey } : {}) },
      body: JSON.stringify({ prompt, aspect }),
    });
    const d = await r.json().catch(() => ({}));
    setMsg(r.ok ? "" : d.error || "Something went wrong.");
    setBusy(false); load();
  }

  async function improve() {
    setBusy(true); setMsg("Improving your prompt.");
    const r = await fetch("/api/improve", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}`, ...(userKey ? { "x-provider-key": userKey } : {}) },
      body: JSON.stringify({ prompt }),
    });
    const d = await r.json().catch(() => ({}));
    if (r.ok) { setPrompt(d.prompt); setMsg("Prompt improved. Edit it if you like, then generate."); }
    else setMsg(d.error || "Could not improve the prompt.");
    setBusy(false);
  }

  async function remove(id: string) {
    await fetch("/api/jobs", { method: "DELETE", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify({ id }) });
    load();
  }

  if (!token) return (
    <main>
      <h1>Editz AI</h1><p className="sub">Sign in to start creating.</p>
      <div className="card">
        <label htmlFor="e">Email</label><input id="e" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        <label htmlFor="p">Password</label><input id="p" type="password" value={pw} onChange={(e) => setPw(e.target.value)} />
        <button onClick={() => auth("in")}>Sign in</button>
        <button className="ghost" onClick={() => auth("up")}>Create account</button>
        {msg && <p className="err">{msg}</p>}
      </div>
    </main>
  );

  return (
    <main>
      <h1>Create image</h1>
      <p className="sub">Free tier model: FLUX.1 schnell. A daily limit applies unless you use your own key.</p>
      <div className="card">
        <label htmlFor="pr">Prompt</label>
        <textarea id="pr" value={prompt} onChange={(e) => setPrompt(e.target.value)} placeholder="A rainy Tokyo street at night, cinematic" />
        <label htmlFor="as">Aspect ratio</label>
        <select id="as" value={aspect} onChange={(e) => setAspect(e.target.value)}>{ASPECTS.map((a) => <option key={a}>{a}</option>)}</select>
        <label htmlFor="k">Your Hugging Face key (optional, sent per request, never saved)</label>
        <input id="k" type="password" value={userKey} onChange={(e) => setUserKey(e.target.value)} />
        <button className="ghost" disabled={busy || prompt.trim().length < 3} onClick={improve}>Improve prompt</button>
        <button disabled={busy || prompt.trim().length < 3} onClick={generate}>{busy ? "Working…" : "Generate"}</button>
        {msg && <p className={busy ? "tag" : "err"}>{msg}</p>}
      </div>
      <h1>My creations</h1>
      {jobs.length === 0 && <p className="sub">Nothing yet. Write a prompt above and tap Generate.</p>}
      <div className="grid">
        {jobs.map((j) => (
          <div key={j.id} className="card">
            {j.url ? <img src={j.url} alt={j.prompt} loading="lazy" /> : <p className="tag">{j.status === "failed" ? j.error : j.status}</p>}
            <p className="tag">{j.prompt.slice(0, 60)}</p>
            <div className="row">
              {j.url && <a href={j.url} download style={{ color: "var(--accent)" }}>Download</a>}
              <button className="ghost" onClick={() => remove(j.id)}>Delete</button>
            </div>
          </div>
        ))}
      </div>
      <button className="ghost" onClick={() => sb.auth.signOut()}>Sign out</button>
    </main>
  );
                 }
