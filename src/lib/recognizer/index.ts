import { MockCatalogRecognizer } from "./mock";
import { GeminiRecognizer, OpenAIRecognizer } from "./vision";
import type { Recognizer } from "./types";

export type { RecognizeResult, RecognizeInput } from "./types";

export function getRecognizer(): Recognizer {
  const gemini = process.env.GEMINI_API_KEY?.trim();
  if (gemini) return new GeminiRecognizer(gemini);
  const openai = process.env.OPENAI_API_KEY?.trim();
  if (openai) return new OpenAIRecognizer(openai);
  return new MockCatalogRecognizer();
}
