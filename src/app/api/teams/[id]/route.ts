import { NextResponse } from "next/server";
import { beginRequest, jsonError } from "@/server/http";
import { removeTeam } from "@/server/repository";

type Context = { params: Promise<{ id: string }> };

export async function DELETE(_request: Request, context: Context) {
  try {
    await beginRequest();
    const { id } = await context.params;
    return NextResponse.json(await removeTeam(id));
  } catch (error) {
    return jsonError(error, 500);
  }
}
