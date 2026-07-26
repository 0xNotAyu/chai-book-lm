import "server-only";
import { cookies } from "next/headers";

export async function getUserId(): Promise<string | null> {
  const store = await cookies();
  return store.get("cbl_uid")?.value ?? null;
}