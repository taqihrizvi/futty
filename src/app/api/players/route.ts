import { NextResponse } from "next/server";
import { uid } from "@/lib/ids";
import type { Player } from "@/lib/types";
import { beginRequest, jsonError } from "@/server/http";
import { addPlayer } from "@/server/repository";

export async function POST(request: Request) {
  try {
    await beginRequest();
    const body = (await request.json()) as Partial<Player>;
    if (!body.name?.trim() || !body.teamId || body.number == null) {
      return jsonError(new Error("Player name, number, and team are required"));
    }
    const player: Player = {
      id: body.id || uid("p"),
      teamId: body.teamId,
      name: body.name.trim(),
      number: Number(body.number),
      position: body.position?.trim() || null,
    };
    return NextResponse.json(await addPlayer(player));
  } catch (error) {
    return jsonError(error, 500);
  }
}
