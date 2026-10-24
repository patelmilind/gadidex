import { NextResponse } from "next/server";
import { ensureGuestUser } from "@/lib/auth";
import { store } from "@/lib/store";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Params) {
  try {
    const { id } = await params;
    const user = await ensureGuestUser();
    const card = await store.getCard(id, user.id);
    if (!card) {
      return NextResponse.json({ error: "not found" }, { status: 404 });
    }
    return NextResponse.json({ card });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "card fetch failed" }, { status: 500 });
  }
}
