import { Provider, Aspect } from "./types";

const SIZES: Record<Aspect, [number, number]> = {
  "1:1": [1024, 1024], "3:4": [768, 1024], "4:3": [1024, 768],
  "9:16": [576, 1024], "16:9": [1024, 576],
};
export const MODEL = "black-forest-labs/FLUX.1-schnell";

export const huggingface: Provider = {
  id: "huggingface",
  name: "FLUX.1 schnell (Hugging Face)",
  capabilities: { generateImage: true, editImage: false, generateVideo: false, editVideo: false },
  cost: "free-tier",
  async generateImage({ prompt, aspect, apiKey }) {
    const token = apiKey || process.env.HF_TOKEN;
    if (!token) throw new Error("No Hugging Face token configured.");
    const [width, height] = SIZES[aspect];
    const res = await fetch(`https://router.huggingface.co/hf-inference/models/${MODEL}`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json", Accept: "image/png" },
      body: JSON.stringify({ inputs: prompt, parameters: { width, height } }),
      signal: AbortSignal.timeout(90_000),
    });
    if (res.status === 402 || res.status === 429)
      throw new Error("Free quota used up. Wait for it to reset or add your own Hugging Face key.");
    if (!res.ok) throw new Error(`Provider error ${res.status}`);
    return { bytes: await res.arrayBuffer(), contentType: res.headers.get("content-type") || "image/png" };
  },
};
