import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { randomUUID } from "crypto";
import { GUEST_COOKIE, ensureGuestUser } from "@/lib/auth";
import { store } from "@/lib/store";

export async function POST() {
  const jar = await cookies();
  let token = jar.get(GUEST_COOKIE)?.value;
  if (!token) {
    token = randomUUID();
    jar.set(GUEST_COOKIE, token, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 365,
    });
  }

  let user = await store.findUserByGuestToken(token);
  if (!user) {
    user = await store.createUser(token);
  }

  return NextResponse.json({
    id: user.id,
    guest: true,
    googleLinked: Boolean(user.googleSub),
  });
}

export async function GET() {
  try {
    const user = await ensureGuestUser();
    return NextResponse.json({
      id: user.id,
      guest: true,
      googleLinked: Boolean(user.googleSub),
    });
  } catch {
    return NextResponse.json({ error: "no guest session" }, { status: 401 });
  }
}
