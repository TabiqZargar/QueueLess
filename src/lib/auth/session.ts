import { cookies } from "next/headers";

/**
 * HTTP-only, same-site cookie session used during development.
 *
 * The cookie stores only an opaque user id which is resolved through the mock
 * auth provider on every request - the client never holds role or identity
 * data it can trust. Nothing about this session is verifiable by the browser.
 *
 * This is a development-only mechanism: the database contributor will replace
 * it (and the whole mock-auth provider) with a real authenticated session
 * without changing the authorization API or the application code that calls
 * getSession / requireRole.
 */
export const SESSION_COOKIE_NAME = "queueless_session";

const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 7;

export async function createSession(userId: string): Promise<void> {
  cookies().set(SESSION_COOKIE_NAME, `user:${userId}`, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_MAX_AGE_SECONDS,
  });
}

export async function destroySession(): Promise<void> {
  cookies().delete(SESSION_COOKIE_NAME);
}

export async function readSessionUserId(): Promise<string | null> {
  const value = cookies().get(SESSION_COOKIE_NAME)?.value;
  if (!value) return null;
  const prefix = "user:";
  if (!value.startsWith(prefix)) return null;
  const userId = value.slice(prefix.length);
  return userId.length > 0 ? userId : null;
}