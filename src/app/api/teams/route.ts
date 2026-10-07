import { NextResponse } from "next/server";
import { beginRequest, jsonError } from "@/server/http";
import { addTeam } from "@/server/repository";

export async function POST(request: Request) {
  try {
    await beginRequest();
    const body = (await request.json()) as { id?: string; name?: string; city?: string };
    if (!body.name?.trim()) return jsonError(new Error("Add a team name"));
    return NextResponse.json(await addTeam({ id: body.id, name: body.name, city: body.city }));
  } catch (error) {
    return jsonError(error, 500);
  }
}
