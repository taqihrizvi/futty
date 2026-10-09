import { NextResponse } from "next/server";
import { beginRequest, jsonError } from "@/server/http";
import { loadState } from "@/server/repository";

export async function GET() {
  try {
    await beginRequest();
    const state = await loadState();
    return NextResponse.json({
      tournaments: state.tournaments,
      teams: state.teams,
      players: state.players,
      matches: state.matches,
      events: state.events,
      myTeamId: null,
    });
  } catch (error) {
    return jsonError(error, 500);
  }
}
