import { NextResponse } from "next/server";
import { markSessionLive } from "@/lib/liveness";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      sessionId?: string;
      peakAccel?: number;
      frameDelta?: number;
    };
    if (!body.sessionId) {
      return NextResponse.json({ error: "sessionId required" }, { status: 400 });
    }
    const result = markSessionLive({
      sessionId: body.sessionId,
      peakAccel: Number(body.peakAccel),
      frameDelta: Number(body.frameDelta),
    });
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }
    return NextResponse.json({ ok: true, live: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "liveness failed" },
      { status: 500 },
    );
  }
}
