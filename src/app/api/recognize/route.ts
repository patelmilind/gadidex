import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { GUEST_COOKIE, ensureGuestUser } from "@/lib/auth";
import { getRecognizer } from "@/lib/recognizer";
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

    const latRaw = form.get("lat");
    const lngRaw = form.get("lng");
    const lat =
      typeof latRaw === "string" && latRaw !== "" ? Number(latRaw) : null;
    const lng =
      typeof lngRaw === "string" && lngRaw !== "" ? Number(lngRaw) : null;

    const buffer = Buffer.from(await file.arrayBuffer());
    const recognizeInput = {
      imageBuffer: buffer,
      mimeType: file.type || "image/jpeg",
      filename: file.name || "live-capture.jpg",
    };

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
      lat: lat != null && Number.isFinite(lat) ? lat : null,
      lng: lng != null && Number.isFinite(lng) ? lng : null,
    });

    return NextResponse.json({ card, source: result.source });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "recognize failed" },
      { status: 500 },
    );
  }
}