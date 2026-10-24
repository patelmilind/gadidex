import { cookies } from "next/headers";
import { store } from "./store";

export const GUEST_COOKIE = "gadidex_guest";

/** Resolve guest user from cookie. Cookie issuance is handled by middleware / API. */
export async function ensureGuestUser() {
  const jar = await cookies();
  const token = jar.get(GUEST_COOKIE)?.value;
  if (!token) {
    throw new Error("NO_GUEST_COOKIE");
  }

  const existing = await store.findUserByGuestToken(token);
  if (existing) return existing;

  return store.createUser(token);
}

export async function requireGuestUser() {
  return ensureGuestUser();
}
