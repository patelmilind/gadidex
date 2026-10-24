import type { RecognizeInput } from "./types";

export type StreetPhotoCheck = {
  ok: boolean;
  reason?: string;
  source: "heuristic" | "gemini" | "openai" | "skip";
};

function extractJson(text: string): Record<string, unknown> {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end === -1) {
    throw new Error("Street-photo model did not return JSON");
  }
  return JSON.parse(text.slice(start, end + 1)) as Record<string, unknown>;
}

const SCREEN_PROMPT = `You are a liveness / anti-spoof checker for a car-spotting app.
Decide if this image is a real outdoor/street photo of a physical car, OR a photo/screenshot of a screen, monitor, TV, phone display, poster, or printed image.
Return ONLY JSON:
{"isRealStreetPhoto": boolean, "isScreenOrDisplay": boolean, "reason": string}
Reject (isRealStreetPhoto false) when you see bezels, pixel grid/moire, UI chrome, reflections of a display, indoor desk setups, or clearly a photo of another photo/screen.`;

function heuristicScreenCheck(buffer: Buffer): StreetPhotoCheck {
  // Cheap JPEG/PNG entropy proxy: very flat buffers often mean solid UI / capture glitches.
  if (buffer.length < 12_000) {
    return {
      ok: false,
      reason: "Image too small / compressed to trust as a street capture.",
      source: "heuristic",
    };
  }
  const sample = buffer.subarray(0, Math.min(buffer.length, 4096));
  const counts = new Map<number, number>();
  for (const byte of sample) {
    counts.set(byte, (counts.get(byte) ?? 0) + 1);
  }
  const unique = counts.size;
  if (unique < 24) {
    return {
      ok: false,
      reason: "Image looks flat or synthetic. Capture a real car outdoors.",
      source: "heuristic",
    };
  }
  return { ok: true, source: "heuristic" };
}

async function geminiStreetCheck(
  apiKey: string,
  input: RecognizeInput,
): Promise<StreetPhotoCheck> {
  const b64 = input.imageBuffer.toString("base64");
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [
        {
          parts: [
            { text: SCREEN_PROMPT },
            { inline_data: { mime_type: input.mimeType, data: b64 } },
          ],
        },
      ],
    }),
  });
  if (!res.ok) {
    throw new Error(`Gemini street check failed ${res.status}`);
  }
  const json = (await res.json()) as {
    candidates?: { content?: { parts?: { text?: string }[] } }[];
  };
  const text = json.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
  const data = extractJson(text);
  const isReal = Boolean(data.isRealStreetPhoto) && !data.isScreenOrDisplay;
  return {
    ok: isReal,
    reason: isReal
      ? undefined
      : String(data.reason ?? "Looks like a screen or non-street photo."),
    source: "gemini",
  };
}

async function openaiStreetCheck(
  apiKey: string,
  input: RecognizeInput,
): Promise<StreetPhotoCheck> {
  const dataUrl = `data:${input.mimeType};base64,${input.imageBuffer.toString("base64")}`;
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: SCREEN_PROMPT },
            { type: "image_url", image_url: { url: dataUrl } },
          ],
        },
      ],
      temperature: 0,
    }),
  });
  if (!res.ok) {
    throw new Error(`OpenAI street check failed ${res.status}`);
  }
  const json = (await res.json()) as {
    choices?: { message?: { content?: string } }[];
  };
  const text = json.choices?.[0]?.message?.content ?? "";
  const data = extractJson(text);
  const isReal = Boolean(data.isRealStreetPhoto) && !data.isScreenOrDisplay;
  return {
    ok: isReal,
    reason: isReal
      ? undefined
      : String(data.reason ?? "Looks like a screen or non-street photo."),
    source: "openai",
  };
}

/** Reject photos of screens when a vision key is set; otherwise light heuristics. */
export async function assertStreetPhoto(
  input: RecognizeInput,
): Promise<StreetPhotoCheck> {
  const gemini = process.env.GEMINI_API_KEY?.trim();
  if (gemini) return geminiStreetCheck(gemini, input);
  const openai = process.env.OPENAI_API_KEY?.trim();
  if (openai) return openaiStreetCheck(openai, input);
  return heuristicScreenCheck(input.imageBuffer);
}
