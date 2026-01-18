import { NextRequest, NextResponse } from "next/server";
import { getGame, createGame } from "@/lib/game-state";
import { runDM } from "@/lib/dm";

// GET - fetch current game state (for polling)
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  const { code } = await params;
  let game = await getGame(code);

  if (!game) {
    game = await createGame(code);
  }

  return NextResponse.json(game);
}

// POST - player action
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  const { code } = await params;
  const { action } = await req.json();

  if (!action || typeof action !== "string") {
    return NextResponse.json({ error: "No action" }, { status: 400 });
  }

  try {
    await runDM(code, action);
    const game = await getGame(code);
    return NextResponse.json(game);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "DM error" }, { status: 500 });
  }
}
