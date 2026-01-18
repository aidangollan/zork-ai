import { kv } from "@vercel/kv";
import { Character, CharacterClass, Race } from "./character";
import { CombatState } from "./rules/combat";

export interface GameState {
  roomCode: string;

  // Players & Characters
  players: Player[];
  characters: Character[];

  // Game Progress
  transcript: TranscriptEntry[];
  storyBeat: string;
  worldState: WorldState;

  // Combat
  combat: CombatState | null;

  // Session
  currentTurn: string | null; // character ID whose turn it is
  phase: "character_creation" | "exploration" | "combat" | "social" | "rest";

  // Meta
  thinking: ThinkingState | null;
  lastUpdate: number;
}

export interface Player {
  id: string;
  name: string;
  joinedAt: number;
  characterId: string | null;
}

export interface WorldState {
  location: string;
  timeOfDay: "dawn" | "morning" | "noon" | "afternoon" | "evening" | "twilight" | "night";
  discoveredLocations: string[];
  questFlags: Record<string, boolean>;
  npcRelationships: Record<string, number>; // -100 to 100
}

export interface ThinkingState {
  active: boolean;
  phase: string;
}

export interface TranscriptEntry {
  id: string;
  type: "narration" | "player" | "dice" | "npc" | "combat" | "system";
  content: string;
  speaker?: string;
  characterId?: string;
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
    players: [],
    characters: [],
    transcript: [
      {
        id: "intro",
        type: "narration",
        content: INTRO,
        ts: Date.now(),
      },
    ],
    storyBeat: "intro",
    worldState: {
      location: "road_to_ashwick",
      timeOfDay: "twilight",
      discoveredLocations: ["road_to_ashwick"],
      questFlags: {},
      npcRelationships: {},
    },
    combat: null,
    currentTurn: null,
    phase: "character_creation",
    thinking: null,
    lastUpdate: Date.now(),
  };
  await kv.set(`game:${code}`, state, { ex: 86400 * 7 }); // 7 day expiry
  return state;
}

export async function updateGame(
  code: string,
  updates: Partial<GameState>
): Promise<GameState | null> {
  const game = await getGame(code);
  if (!game) return null;
  const updated = { ...game, ...updates, lastUpdate: Date.now() };
  await kv.set(`game:${code}`, updated, { ex: 86400 * 7 });
  return updated;
}

export async function addToTranscript(
  code: string,
  entry: Omit<TranscriptEntry, "id" | "ts">
): Promise<GameState | null> {
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

export async function setThinking(
  code: string,
  phase: string | null
): Promise<void> {
  const game = await getGame(code);
  if (!game) return;
  game.thinking = phase ? { active: true, phase } : null;
  game.lastUpdate = Date.now();
  await kv.set(`game:${code}`, game, { ex: 86400 * 7 });
}

// ============= PLAYER MANAGEMENT =============

export async function addPlayer(
  code: string,
  playerName: string
): Promise<{ game: GameState; playerId: string } | null> {
  const game = await getGame(code);
  if (!game) return null;

  // Check if we have room (max 4 players)
  if (game.players.length >= 4) return null;

  const playerId = crypto.randomUUID();
  const player: Player = {
    id: playerId,
    name: playerName,
    joinedAt: Date.now(),
    characterId: null,
  };

  game.players.push(player);
  game.lastUpdate = Date.now();
  await kv.set(`game:${code}`, game, { ex: 86400 * 7 });

  return { game, playerId };
}

export async function getPlayer(
  code: string,
  playerId: string
): Promise<Player | null> {
  const game = await getGame(code);
  if (!game) return null;
  return game.players.find((p) => p.id === playerId) || null;
}

// ============= CHARACTER MANAGEMENT =============

export async function addCharacter(
  code: string,
  playerId: string,
  character: Character
): Promise<GameState | null> {
  const game = await getGame(code);
  if (!game) return null;

  // Find the player
  const playerIndex = game.players.findIndex((p) => p.id === playerId);
  if (playerIndex === -1) return null;

  // Add character and link to player
  game.characters.push(character);
  game.players[playerIndex].characterId = character.id;

  // Check if all players have characters - if so, start exploration
  const allHaveCharacters = game.players.every((p) => p.characterId !== null);
  if (allHaveCharacters && game.players.length > 0) {
    game.phase = "exploration";

    // Add a narration introducing the characters
    const charIntros = game.characters.map(
      (c) => `${c.name}, the ${c.race} ${c.class}`
    );
    game.transcript.push({
      id: crypto.randomUUID(),
      type: "system",
      content: `Heroes assembled: ${charIntros.join(", ")}. The adventure begins!`,
      ts: Date.now(),
    });
  }

  game.lastUpdate = Date.now();
  await kv.set(`game:${code}`, game, { ex: 86400 * 7 });
  return game;
}

export async function getCharacter(
  code: string,
  characterId: string
): Promise<Character | null> {
  const game = await getGame(code);
  if (!game) return null;
  return game.characters.find((c) => c.id === characterId) || null;
}

export async function updateCharacter(
  code: string,
  characterId: string,
  updates: Partial<Character>
): Promise<GameState | null> {
  const game = await getGame(code);
  if (!game) return null;

  const charIndex = game.characters.findIndex((c) => c.id === characterId);
  if (charIndex === -1) return null;

  game.characters[charIndex] = { ...game.characters[charIndex], ...updates };
  game.lastUpdate = Date.now();
  await kv.set(`game:${code}`, game, { ex: 86400 * 7 });
  return game;
}

// ============= COMBAT MANAGEMENT =============

export async function startCombat(
  code: string,
  combatState: CombatState
): Promise<GameState | null> {
  const game = await getGame(code);
  if (!game) return null;

  game.combat = combatState;
  game.phase = "combat";
  game.currentTurn =
    combatState.initiativeOrder[0]?.characterId ||
    combatState.initiativeOrder[0]?.id ||
    null;
  game.lastUpdate = Date.now();

  await kv.set(`game:${code}`, game, { ex: 86400 * 7 });
  return game;
}

export async function endCombat(code: string): Promise<GameState | null> {
  const game = await getGame(code);
  if (!game) return null;

  game.combat = null;
  game.phase = "exploration";
  game.currentTurn = null;
  game.lastUpdate = Date.now();

  await kv.set(`game:${code}`, game, { ex: 86400 * 7 });
  return game;
}

export async function updateCombat(
  code: string,
  combatUpdates: Partial<CombatState>
): Promise<GameState | null> {
  const game = await getGame(code);
  if (!game || !game.combat) return null;

  game.combat = { ...game.combat, ...combatUpdates };
  game.lastUpdate = Date.now();

  await kv.set(`game:${code}`, game, { ex: 86400 * 7 });
  return game;
}
