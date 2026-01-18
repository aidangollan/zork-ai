import { NextRequest, NextResponse } from "next/server";
import { getGame, addPlayer, addCharacter, getPlayer } from "@/lib/game-state";
import { Character } from "@/lib/character";

// POST - join game or create character
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  const { code } = await params;
  const body = await req.json();

  // Join game (add player)
  if (body.action === "join") {
    const { playerName } = body;

    if (!playerName || typeof playerName !== "string") {
      return NextResponse.json({ error: "Player name required" }, { status: 400 });
    }

    const result = await addPlayer(code, playerName.trim());

    if (!result) {
      return NextResponse.json({ error: "Could not join game (room full or not found)" }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      playerId: result.playerId,
      game: result.game,
    });
  }

  // Create character
  if (body.action === "createCharacter") {
    const { playerId, character } = body;

    if (!playerId || !character) {
      return NextResponse.json({ error: "Player ID and character required" }, { status: 400 });
    }

    // Verify player exists
    const player = await getPlayer(code, playerId);
    if (!player) {
      return NextResponse.json({ error: "Player not found" }, { status: 404 });
    }

    // Check if player already has a character
    if (player.characterId) {
      return NextResponse.json({ error: "Player already has a character" }, { status: 400 });
    }

    const game = await addCharacter(code, playerId, character as Character);

    if (!game) {
      return NextResponse.json({ error: "Could not create character" }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      game,
    });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}

// GET - get player info
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  const { code } = await params;
  const { searchParams } = new URL(req.url);
  const playerId = searchParams.get("playerId");

  if (!playerId) {
    // Return all players
    const game = await getGame(code);
    if (!game) {
      return NextResponse.json({ error: "Game not found" }, { status: 404 });
    }
    return NextResponse.json({ players: game.players });
  }

  // Return specific player
  const player = await getPlayer(code, playerId);
  if (!player) {
    return NextResponse.json({ error: "Player not found" }, { status: 404 });
  }

  return NextResponse.json({ player });
}
