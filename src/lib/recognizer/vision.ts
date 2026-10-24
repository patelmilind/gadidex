import type { RecognizeInput, RecognizeResult, Recognizer } from "./types";

function extractJson(text: string): Record<string, unknown> {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end === -1) {
    throw new Error("Vision model did not return JSON");
  }
  return JSON.parse(text.slice(start, end + 1)) as Record<string, unknown>;
}

function toResult(
  data: Record<string, unknown>,
  source: "gemini" | "openai",
): RecognizeResult {
  return {
    make: String(data.make ?? "Unknown"),
    model: String(data.model ?? "Unknown"),
    yearLabel: String(data.yearLabel ?? data.year ?? "Unknown"),
    bodyStyle: String(data.bodyStyle ?? "Unknown"),
    horsepower: Number(data.horsepower ?? 0),
    topSpeed: Number(data.topSpeed ?? 0),
    estimatedValue: Number(data.estimatedValue ?? 0),
    rarity: String(data.rarity ?? "Uncommon"),
    origin: String(data.origin ?? "Unknown"),
    notes: String(data.notes ?? "Identified by vision model."),
    source,
  };
}

const PROMPT = `You identify cars from photos for a collectible spotting game.
Return ONLY a JSON object with keys:
make, model, yearLabel, bodyStyle, horsepower, topSpeed, estimatedValue, rarity, origin, notes.
rarity must be one of: Common, Uncommon, Rare, Epic, Legendary.
estimatedValue is USD integer. horsepower and topSpeed are integers (km/h for topSpeed).`;

export class GeminiRecognizer implements Recognizer {
  constructor(private apiKey: string) {}

  async recognize(input: RecognizeInput): Promise<RecognizeResult> {
    const b64 = input.imageBuffer.toString("base64");
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${this.apiKey}`;
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              { text: PROMPT },
              { inline_data: { mime_type: input.mimeType, data: b64 } },
            ],
          },
        ],
      }),
    });
    if (!res.ok) {
      throw new Error(`Gemini error ${res.status}: ${await res.text()}`);
    }
    const json = (await res.json()) as {
      candidates?: { content?: { parts?: { text?: string }[] } }[];
    };
    const text = json.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
    return toResult(extractJson(text), "gemini");
  }
}

export class OpenAIRecognizer implements Recognizer {
  constructor(private apiKey: string) {}

  async recognize(input: RecognizeInput): Promise<RecognizeResult> {
    const b64 = input.imageBuffer.toString("base64");
    const dataUrl = `data:${input.mimeType};base64,${b64}`;
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: PROMPT },
              { type: "image_url", image_url: { url: dataUrl } },
            ],
          },
        ],
        temperature: 0.2,
      }),
    });
    if (!res.ok) {
      throw new Error(`OpenAI error ${res.status}: ${await res.text()}`);
    }
    const json = (await res.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    const text = json.choices?.[0]?.message?.content ?? "";
    return toResult(extractJson(text), "openai");
  }
}
