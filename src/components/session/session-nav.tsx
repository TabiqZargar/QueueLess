import { getCurrentUser } from "@/lib/auth/authorization";
import { UserMenu } from "./user-menu";

/**
 * Server component that resolves the current session and renders the header
 * user menu. The session cookie is only ever read server-side.
 */
export async function SessionNav() {
  const user = await getCurrentUser();
  return <UserMenu user={user} />;
}