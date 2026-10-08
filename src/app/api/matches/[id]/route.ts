import { NextResponse } from "next/server";
import type { MatchEvent } from "@/lib/types";
import { beginRequest, jsonError } from "@/server/http";
import {
  addMatchEvent,
  armClock,
  endHalf,
  endMatch,
  pauseMatch,
  recordPenalties,
  resumeMatch,
  startMatch,
  startSecondHalf,
  undoMatchEvent,
} from "@/server/repository";

type Context = { params: Promise<{ id: string }> };

type Body =
  | { action: "event"; event: MatchEvent }
  | { action: "undo" }
  | { action: "start"; homePlayerIds?: string[]; awayPlayerIds?: string[] }
  | { action: "stop" }
  | { action: "resume" }
  | { action: "end"; penaltyWinnerId?: string }
  | { action: "penalties"; teamId: string }
  | { action: "end-half" }
  | { action: "second-half" }
  | { action: "clock" };

export async function POST(request: Request, context: Context) {
  try {
    await beginRequest();
    const { id } = await context.params;
    const body = (await request.json()) as Body;
    if (body.action === "event") {
      return NextResponse.json(await addMatchEvent({ ...body.event, matchId: id }));
    }
    if (body.action === "undo") return NextResponse.json(await undoMatchEvent(id));
    if (body.action === "start") {
      return NextResponse.json(await startMatch(id, body.homePlayerIds ?? [], body.awayPlayerIds ?? []));
    }
    if (body.action === "stop") return NextResponse.json(await pauseMatch(id));
    if (body.action === "resume") return NextResponse.json(await resumeMatch(id));
    if (body.action === "end") return NextResponse.json(await endMatch(id, body.penaltyWinnerId));
    if (body.action === "penalties") return NextResponse.json(await recordPenalties(id, body.teamId));
    if (body.action === "end-half") return NextResponse.json(await endHalf(id));
    if (body.action === "second-half") return NextResponse.json(await startSecondHalf(id));
    if (body.action === "clock") return NextResponse.json(await armClock(id));
    return jsonError(new Error("Unknown match action"));
  } catch (error) {
    return jsonError(error, 500);
  }
}
