import { NextResponse } from "next/server";
import { beginRequest, jsonError } from "@/server/http";
import { sessionCookieName } from "@/lib/session";

export async function POST() {
  try {
    await beginRequest();
    const response = NextResponse.json({ ok: true });
    response.cookies.set(sessionCookieName(), "", {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 0,
    });
    return response;
  } catch (error) {
    return jsonError(error, 500);
  }
}
