import { NextResponse } from "next/server";
import type { NewTournamentInput } from "@/lib/types";
import { beginRequest, jsonError } from "@/server/http";
import { publishNewTournament } from "@/server/repository";

export async function POST(request: Request) {
  try {
    await beginRequest();
    const input = (await request.json()) as NewTournamentInput;
    if (!input.name?.trim() || !Array.isArray(input.teams)) {
      return jsonError(new Error("Tournament details are incomplete"));
    }
    const published = await publishNewTournament(input);
    return NextResponse.json(published);
  } catch (error) {
    return jsonError(error, 500);
  }
}
