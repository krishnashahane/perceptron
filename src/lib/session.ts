import { cookies } from "next/headers";
import { SESSION_COOKIE, verifySession, type Session } from "@/lib/auth";

// Server-side session read for RSC / route handlers.
export async function getSession(): Promise<Session | null> {
  const jar = await cookies();
  return verifySession(jar.get(SESSION_COOKIE)?.value);
}
