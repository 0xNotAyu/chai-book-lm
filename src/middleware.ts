import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const ONE_YEAR = 60 * 60 * 24 * 365;
const cookieOpts = {
  httpOnly: true,
  sameSite: "lax" as const,
  maxAge: ONE_YEAR,
  path: "/",
};

export function middleware(req: NextRequest) {
  const { pathname, searchParams } = req.nextUrl;
  let res: NextResponse | undefined;

  if (pathname === "/") {
    if (searchParams.get("start") === "1") {
      // "Try" button: remember that the visitor saw the welcome page, then enter the app.
      const url = req.nextUrl.clone();
      url.searchParams.delete("start");
      res = NextResponse.redirect(url);
      res.cookies.set("cbl_welcomed", "1", cookieOpts);
    } else if (!req.cookies.get("cbl_welcomed")) {
      // First visit: show the welcome page.
      res = NextResponse.redirect(new URL("/welcome", req.url));
    }
  }

  res ??= NextResponse.next();

  if (!req.cookies.get("cbl_uid")) {
    res.cookies.set("cbl_uid", crypto.randomUUID(), cookieOpts);
  }
  return res;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};