import { NextResponse } from "next/server";
import { beginRequest, jsonError } from "@/server/http";
import { verifyPassword } from "@/server/password";
import { ensureReady } from "@/server/repository";
import { findUserByEmail } from "@/server/users";
import {
  createSessionToken,
  safeNextPath,
  sessionCookieName,
  sessionMaxAge,
} from "@/lib/session";

export async function POST(request: Request) {
  try {
    await beginRequest();
    await ensureReady();
    const body = (await request.json()) as { email?: string; password?: string; next?: string };
    const secret = process.env.SESSION_SECRET;
    const email = (body.email ?? "").trim().toLowerCase();
    const password = body.password ?? "";
    if (!secret) {
      return NextResponse.json({ error: "Sign-in is not configured" }, { status: 500 });
    }
    const user = email.includes("@") ? await findUserByEmail(email) : null;
    if (!user || !(await verifyPassword(password, user.passwordHash))) {
      return NextResponse.json({ error: "Email or password is not correct." }, { status: 401 });
    }
    const response = NextResponse.json({ next: safeNextPath(body.next) });
    response.cookies.set(sessionCookieName(), await createSessionToken(secret, user.email), {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: sessionMaxAge(),
    });
    return response;
  } catch (error) {
    return jsonError(error, 500);
  }
}
