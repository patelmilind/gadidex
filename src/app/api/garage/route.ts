import { NextResponse } from "next/server";
import { ensureGuestUser, requireGuestUser } from "@/lib/auth";
import { store } from "@/lib/store";

export async function GET() {
  try {
    const user = await ensureGuestUser();
    const cards = await store.listCards(user.id);
    return NextResponse.json({ cards, count: cards.length });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "garage list failed" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireGuestUser();
    const body = await request.json();
    const card = await store.createCard({
      userId: user.id,
      make: String(body.make ?? "Unknown"),
      model: String(body.model ?? "Unknown"),
      yearLabel: String(body.yearLabel ?? "Unknown"),
      bodyStyle: String(body.bodyStyle ?? "Unknown"),
      horsepower: Number(body.horsepower ?? 0),
      topSpeed: Number(body.topSpeed ?? 0),
      estimatedValue: Number(body.estimatedValue ?? 0),
      rarity: String(body.rarity ?? "Common"),
      origin: String(body.origin ?? "Unknown"),
      notes: String(body.notes ?? ""),
      imagePath: String(body.imagePath ?? ""),
      lat: body.lat != null ? Number(body.lat) : null,
      lng: body.lng != null ? Number(body.lng) : null,
    });
    return NextResponse.json({ card }, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
    console.error(error);
    return NextResponse.json({ error: "garage create failed" }, { status: 500 });
  }
}
