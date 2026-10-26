export type Aspect = "1:1" | "3:4" | "4:3" | "9:16" | "16:9";
export interface ImageRequest { prompt: string; aspect: Aspect; apiKey?: string }
export interface ImageResult { bytes: ArrayBuffer; contentType: string }
export interface Provider {
  id: string;
  name: string;
  capabilities: { generateImage: boolean; editImage: boolean; generateVideo: boolean; editVideo: boolean };
  cost: "free-tier" | "user-key" | "paid";
  generateImage(req: ImageRequest): Promise<ImageResult>;
}
