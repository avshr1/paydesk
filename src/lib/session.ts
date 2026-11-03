import { redirect } from "next/navigation";
import { auth } from "@/auth";

// Returns the logged-in user's ID, or sends them to the login page.
// Use this in every page and Server Action that touches user data.
export async function requireUserId(): Promise<string> {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  return session.user.id;
}
