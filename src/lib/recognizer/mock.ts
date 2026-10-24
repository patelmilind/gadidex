import { store } from "../store";
import type { RecognizeInput, RecognizeResult, Recognizer } from "./types";

const RARITIES = ["Common", "Uncommon", "Rare", "Epic", "Legendary"] as const;

function pickRarity(seed: number): string {
  return RARITIES[seed % RARITIES.length];
}

export class MockCatalogRecognizer implements Recognizer {
  async recognize(input: RecognizeInput): Promise<RecognizeResult> {
    const cars = await store.listCatalog();
    if (cars.length === 0) {
      return {
        make: "Unknown",
        model: "Daily Driver",
        yearLabel: "2015-2020",
        bodyStyle: "Sedan",
        horsepower: 180,
        topSpeed: 210,
        estimatedValue: 12000,
        rarity: "Common",
        origin: "Global",
        notes: "Catalog empty.",
        source: "mock",
      };
    }

    const hash = input.imageBuffer.reduce((a, b) => (a + b) % 2147483647, 0);
    const nameHint = input.filename.toLowerCase();
    const byKeyword = cars.find((c) =>
      c.keywords
        .split(",")
        .map((k) => k.trim().toLowerCase())
        .some((k) => k && nameHint.includes(k)),
    );
    const car = byKeyword ?? cars[hash % cars.length];

    return {
      make: car.make,
      model: car.model,
      yearLabel: car.yearLabel,
      bodyStyle: car.bodyStyle,
      horsepower: car.horsepower,
      topSpeed: car.topSpeed,
      estimatedValue: car.estimatedValue,
      rarity: car.rarity || pickRarity(hash),
      origin: car.origin,
      notes: car.notes,
      source: "mock",
    };
  }
}
