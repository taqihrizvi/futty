import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { displayNameFromEmail } from "@/lib/display-name";
import { sessionCookieName, verifySessionToken } from "@/lib/session";
import { beginRequest, jsonError } from "@/server/http";
import { ensureReady } from "@/server/repository";
import { findUserByEmail } from "@/server/users";

export async function GET() {
  try {
    await beginRequest();
    await ensureReady();
    const token = (await cookies()).get(sessionCookieName())?.value;
    const session = await verifySessionToken(token, process.env.SESSION_SECRET);
    if (!session) return NextResponse.json({ error: "Sign in required" }, { status: 401 });
    const user = await findUserByEmail(session.email);
    if (!user) return NextResponse.json({ error: "Sign in required" }, { status: 401 });
    return NextResponse.json({ email: user.email, name: displayNameFromEmail(user.email) });
  } catch (error) {
    return jsonError(error, 500);
  }
}
