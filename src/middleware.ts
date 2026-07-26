import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";


export function middleware(req: NextRequest) {
  const res = NextResponse.next();
  if (!req.cookies.get("cbl_uid")) {
    res.cookies.set("cbl_uid", crypto.randomUUID(), { httpOnly: true, sameSite: "lax", maxAge: 60 * 60 * 24 * 365, path: "/" });
  }
  return res;
}

export const config = { matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"] };