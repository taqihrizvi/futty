import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { sessionCookieName, verifySessionToken } from "@/lib/session";

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const signedIn = await verifySessionToken(
    request.cookies.get(sessionCookieName())?.value,
    process.env.SESSION_SECRET,
  );

  if (pathname === "/login") {
    if (signedIn) return NextResponse.redirect(new URL("/", request.url));
    return NextResponse.next();
  }

  if (pathname === "/api/login" || pathname === "/api/health") return NextResponse.next();

  if (!signedIn) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Sign in required" }, { status: 401 });
    }
    const login = new URL("/login", request.url);
    login.searchParams.set("next", pathname);
    return NextResponse.redirect(login);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|icon.svg|manifest.webmanifest).*)"],
};
