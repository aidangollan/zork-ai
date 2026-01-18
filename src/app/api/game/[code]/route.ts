import { NextRequest, NextResponse } from "next/server";
import { getGame, createGame, getPlayer } from "@/lib/game-state";
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
  const { action, playerId, characterId } = await req.json();

  if (!action || typeof action !== "string") {
    return NextResponse.json({ error: "No action" }, { status: 400 });
  }

  // Verify player exists if provided
  if (playerId) {
    const player = await getPlayer(code, playerId);
    if (!player) {
      return NextResponse.json({ error: "Player not found" }, { status: 404 });
    }
  }

  // Get game to find character name
  const gameState = await getGame(code);
  if (!gameState) {
    return NextResponse.json({ error: "Game not found" }, { status: 404 });
  }

  // Check if game is still in character creation phase
  if (gameState.phase === "character_creation") {
    return NextResponse.json({ error: "Game not started - waiting for character creation" }, { status: 400 });
  }

  // Find the character making the action
  const character = characterId
    ? gameState.characters.find((c) => c.id === characterId)
    : null;

  try {
    await runDM(code, action, character || undefined);
    const game = await getGame(code);
    return NextResponse.json(game);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "DM error" }, { status: 500 });
  }
}
