import { kv } from "@vercel/kv";

export interface GameState {
  roomCode: string;
  transcript: TranscriptEntry[];
  storyBeat: string;
  worldState: Record<string, unknown>;
  thinking: { active: boolean; phase: string } | null;
  lastUpdate: number;
}

export interface TranscriptEntry {
  id: string;
  type: "narration" | "player" | "dice" | "npc";
  content: string;
  speaker?: string;
  ts: number;
}

const INTRO = `
╔════════════════════════════════════════════════════════════════╗
║            THE CURSE OF THE CRIMSON CITADEL                    ║
╚════════════════════════════════════════════════════════════════╝

The road to Ashwick is longer than the maps suggested. Twilight
paints the sky amber and violet as you crest the hill.

Below: a village. Thatched roofs huddled against the forest.

Beyond: the Crimson Citadel. Red stone walls drinking the last
light. Something wrong emanates from those ancient towers.

A weathered sign: "ASHWICK - Travelers Welcome"

What do you do?`.trim();

export async function getGame(code: string): Promise<GameState | null> {
  return kv.get<GameState>(`game:${code}`);
}

export async function createGame(code: string): Promise<GameState> {
  const state: GameState = {
    roomCode: code,
    transcript: [{
      id: "intro",
      type: "narration",
      content: INTRO,
      ts: Date.now(),
    }],
    storyBeat: "intro",
    worldState: { timeOfDay: "twilight", villageAttitude: "neutral" },
    thinking: null,
    lastUpdate: Date.now(),
  };
  await kv.set(`game:${code}`, state, { ex: 86400 * 7 }); // 7 day expiry
  return state;
}

export async function updateGame(code: string, updates: Partial<GameState>) {
  const game = await getGame(code);
  if (!game) return null;
  const updated = { ...game, ...updates, lastUpdate: Date.now() };
  await kv.set(`game:${code}`, updated, { ex: 86400 * 7 });
  return updated;
}

export async function addToTranscript(code: string, entry: Omit<TranscriptEntry, "id" | "ts">) {
  const game = await getGame(code);
  if (!game) return null;
  game.transcript.push({
    ...entry,
    id: crypto.randomUUID(),
    ts: Date.now(),
  });
  // Keep last 100 entries
  if (game.transcript.length > 100) {
    game.transcript = game.transcript.slice(-100);
  }
  game.lastUpdate = Date.now();
  await kv.set(`game:${code}`, game, { ex: 86400 * 7 });
  return game;
}

export async function setThinking(code: string, phase: string | null) {
  const game = await getGame(code);
  if (!game) return;
  game.thinking = phase ? { active: true, phase } : null;
  game.lastUpdate = Date.now();
  await kv.set(`game:${code}`, game, { ex: 86400 * 7 });
}
