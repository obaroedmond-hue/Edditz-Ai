import { huggingface } from "./huggingface";
import { Provider } from "./types";
// Add new providers here. The UI and API only use this registry.
export const providers: Record<string, Provider> = { [huggingface.id]: huggingface };
