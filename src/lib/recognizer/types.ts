export type RecognizeInput = {
  imageBuffer: Buffer;
  mimeType: string;
  filename: string;
};

export type RecognizeResult = {
  make: string;
  model: string;
  yearLabel: string;
  bodyStyle: string;
  horsepower: number;
  topSpeed: number;
  estimatedValue: number;
  rarity: string;
  origin: string;
  notes: string;
  source: "mock" | "gemini" | "openai";
};

export interface Recognizer {
  recognize(input: RecognizeInput): Promise<RecognizeResult>;
}
