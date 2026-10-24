import { NextResponse } from "next/server";
import { createScanSession } from "@/lib/liveness";

export const runtime = "nodejs";

export async function POST() {
  const session = createScanSession();
  return NextResponse.json({
    sessionId: session.id,
    expiresAt: session.expiresAt,
  });
}
