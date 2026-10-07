import { NextResponse } from "next/server";
import { beginRequest, jsonError } from "@/server/http";
import { addTeamToTournament } from "@/server/repository";

type Context = { params: Promise<{ id: string }> };

export async function POST(request: Request, context: Context) {
  try {
    await beginRequest();
    const { id } = await context.params;
    const body = (await request.json()) as {
      teamId?: string;
      id?: string;
      name?: string;
      city?: string;
      groupId?: string;
    };
    if (!body.teamId && !body.name?.trim()) return jsonError(new Error("Choose a team or add a name"));
    return NextResponse.json(await addTeamToTournament(id, body));
  } catch (error) {
    return jsonError(error, 500);
  }
}
