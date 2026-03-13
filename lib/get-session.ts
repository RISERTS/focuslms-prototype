import { cookies } from "next/headers";
import { verifySession } from "@/lib/auth";

export async function getSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get("focuslms_session")?.value;

  if (!token) return null;

  try {
    return await verifySession(token);
  } catch {
    return null;
  }
}