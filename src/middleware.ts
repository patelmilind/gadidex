import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const GUEST_COOKIE = "gadidex_guest";

export function middleware(request: NextRequest) {
  const response = NextResponse.next();
  if (!request.cookies.get(GUEST_COOKIE)?.value) {
    const token = crypto.randomUUID();
    response.cookies.set(GUEST_COOKIE, token, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 365,
    });
  }
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|uploads|.*\\..*).*)"],
};
