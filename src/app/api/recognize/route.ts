import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { GUEST_COOKIE, ensureGuestUser } from "@/lib/auth";
import { consumeLiveSession } from "@/lib/liveness";
import { getRecognizer } from "@/lib/recognizer";
import { assertStreetPhoto } from "@/lib/recognizer/streetPhoto";
import { store } from "@/lib/store";

export const runtime = "nodejs";

async function guestOrCreate() {
  try {
    return await ensureGuestUser();
  } catch {
    const token = randomUUID();
    const jar = await cookies();
    jar.set(GUEST_COOKIE, token, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 365,
    });
    return store.createUser(token);
  }
}

export async function POST(request: Request) {
  try {
    const user = await guestOrCreate();
    const form = await request.formData();
    const file = form.get("image");
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "image required" }, { status: 400 });
    }

    const sessionId = form.get("sessionId");
    if (typeof sessionId !== "string" || !sessionId) {
      return NextResponse.json(
        { error: "Live camera session required. Open Scan on your phone." },
        { status: 400 },
      );
    }

    const latRaw = form.get("lat");
    const lngRaw = form.get("lng");
    const lat =
      typeof latRaw === "string" && latRaw !== "" ? Number(latRaw) : NaN;
    const lng =
      typeof lngRaw === "string" && lngRaw !== "" ? Number(lngRaw) : NaN;
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      return NextResponse.json(
        { error: "GPS required. Enable location and scan outdoors." },
        { status: 400 },
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const recognizeInput = {
      imageBuffer: buffer,
      mimeType: file.type || "image/jpeg",
      filename: file.name || "live-capture.jpg",
    };

    const street = await assertStreetPhoto(recognizeInput);
    if (!street.ok) {
      return NextResponse.json(
        {
          error:
            street.reason ||
            "Not accepted — capture a real car on the street, not a screen.",
        },
        { status: 400 },
      );
    }

    const live = consumeLiveSession(sessionId);
    if (!live.ok) {
      return NextResponse.json({ error: live.error }, { status: 400 });
    }

    const filename = `${Date.now()}-${Math.random().toString(36).slice(2)}.jpg`;
    const uploadsDir = path.join(process.cwd(), "public", "uploads");
    await mkdir(uploadsDir, { recursive: true });
    await writeFile(path.join(uploadsDir, filename), buffer);
    const imagePath = `/uploads/${filename}`;

    const result = await getRecognizer().recognize(recognizeInput);

    const card = await store.createCard({
      userId: user.id,
      make: result.make,
      model: result.model,
      yearLabel: result.yearLabel,
      bodyStyle: result.bodyStyle,
      horsepower: result.horsepower,
      topSpeed: result.topSpeed,
      estimatedValue: result.estimatedValue,
      rarity: result.rarity,
      origin: result.origin,
      notes: result.notes,
      imagePath,
      lat,
      lng,
    });

    return NextResponse.json({
      card,
      source: result.source,
      streetCheck: street.source,
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "recognize failed" },
      { status: 500 },
    );
  }
}
