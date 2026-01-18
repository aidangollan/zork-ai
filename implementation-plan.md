# ZORK-DM: Janky MVP (Vercel Only)

> No WebSockets. No PartyKit. Just Vercel + polling like it's 2005.

---

## How It Works (The Lazy Way)

```
┌──────────────┐         ┌──────────────┐         ┌──────────────┐
│   Player     │ ──SSE──▶│   Vercel     │◀──poll──│  Spectators  │
│   Browser    │         │   + KV       │         │   Browsers   │
└──────────────┘         └──────────────┘         └──────────────┘
                               │
                               ▼
                        ┌──────────────┐
                        │ Claude Opus  │
                        │    4.5       │
                        └──────────────┘
```

- **Player types** → SSE streams AI response with thinking states
- **Spectators** → Poll `/api/game/[roomId]` every 2 seconds
- **State** → Vercel KV (Redis)

That's it. Janky but works.

---

## Setup (5 commands)

```bash
# Create project
npx create-next-app@latest zork-dm --typescript --tailwind --app --src-dir
cd zork-dm

# Install deps
npm install ai @ai-sdk/anthropic @vercel/kv zod nanoid

# Link to Vercel
vercel link

# Add KV database (opens browser, click through it)
vercel storage add kv

# Add your Anthropic key
vercel env add ANTHROPIC_API_KEY

# Pull env vars locally
vercel env pull .env.local
```

---

## Project Structure

```
zork-dm/
├── src/
│   ├── app/
│   │   ├── page.tsx                 # Landing (create/join room)
│   │   ├── room/[code]/page.tsx     # Game room
│   │   └── api/
│   │       ├── game/[code]/route.ts # GET state, POST action
│   │       └── stream/[code]/route.ts # SSE for active player
│   └── lib/
│       ├── game-state.ts            # KV helpers
│       ├── dm.ts                    # AI + tools
│       └── brains.ts                # Simple 4 brains
├── .env.local
└── package.json
```

---

## The Code

### 1. Game State (`src/lib/game-state.ts`)

```typescript
import { kv } from "@vercel/kv";

export interface GameState {
  roomCode: string;
  transcript: TranscriptEntry[];
  storyBeat: string;
  worldState: Record<string, any>;
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
```

### 2. Simple Brains (`src/lib/brains.ts`)

```typescript
// WORLD BRAIN - just a big string lol
export const WORLD_LORE = `
LOCATIONS:
- Ashwick: Small village at forest edge. Population ~200. Known for wool trade.
- The Weary Pilgrim: Village tavern run by Mara Thornwood. Warm, smells of woodsmoke.
- Crimson Citadel: Ancient fortress of red stone. Built by Dragon Lords in First Age. Currently home to Lord Vexis.
- The Whispering Wood: Forest surrounding Ashwick. Locals avoid it after dark.

HISTORY:
- First Age: Dragon Lords ruled, built the Citadel
- The Betrayal: Lord Vexis betrayed his kin, was cursed with immortality
- Present: Villagers disappearing. Rumors of lights in the Citadel.

CHARACTERS:
- Mara Thornwood: Innkeeper, 40s, protective of village. Brother disappeared at Citadel.
- Lord Vexis: Last Dragon Lord. Immortal, weary, secretly wants the curse to end.
- Captain Dren: Citadel guard captain. Loyal but conflicted.

FACTIONS:
- Villagers: Scared, suspicious of outsiders, won't talk about the Citadel
- Citadel Guards: Serve Lord Vexis, don't know the full truth
`;

// STORY BRAIN - simple beat tracking
export const STORY_BEATS: Record<string, { next: string[]; desc: string }> = {
  intro: { next: ["village", "citadel_approach"], desc: "Just arrived at Ashwick" },
  village: { next: ["tavern", "investigate", "citadel_approach"], desc: "In the village" },
  tavern: { next: ["talk_mara", "village", "rest"], desc: "At the Weary Pilgrim" },
  talk_mara: { next: ["learn_secret", "village"], desc: "Speaking with Mara" },
  learn_secret: { next: ["citadel_approach"], desc: "Learned about the secret passage" },
  citadel_approach: { next: ["guards", "sneak", "parley"], desc: "Approaching the Citadel" },
  guards: { next: ["combat", "flee", "parley"], desc: "Confronting guards" },
  combat: { next: ["victory", "defeat"], desc: "In combat" },
};

// CHARACTER BRAIN - NPC prompts
export const CHARACTERS: Record<string, { name: string; voice: string; secret: string }> = {
  mara: {
    name: "Mara Thornwood",
    voice: "Warm but guarded. Short sentences. Says 'aye' when agreeing. Working-class dialect.",
    secret: "Her brother went to the Citadel and never returned. She knows a secret passage.",
  },
  vexis: {
    name: "Lord Vexis",
    voice: "Ancient, weary, formal. Long pauses. Archaic words. Melancholic.",
    secret: "Wants the curse to end. Remembers every person he's killed.",
  },
  dren: {
    name: "Captain Dren",
    voice: "Gruff, military, few words. Barks orders.",
    secret: "Has family in the village. Hopes the curse ends.",
  },
};

// RULES BRAIN - dice
export function rollDice(notation: string): { rolls: number[]; total: number; crit: boolean } {
  const match = notation.match(/(\d+)d(\d+)([+-]\d+)?/);
  if (!match) return { rolls: [0], total: 0, crit: false };
  
  const [, count, sides, mod] = match;
  const rolls: number[] = [];
  for (let i = 0; i < parseInt(count); i++) {
    rolls.push(Math.floor(Math.random() * parseInt(sides)) + 1);
  }
  const total = rolls.reduce((a, b) => a + b, 0) + (parseInt(mod) || 0);
  const crit = parseInt(sides) === 20 && (rolls[0] === 20 || rolls[0] === 1);
  
  return { rolls, total, crit };
}

export function skillCheck(difficulty: "easy" | "medium" | "hard"): { roll: number; dc: number; success: boolean } {
  const DCs = { easy: 10, medium: 15, hard: 20 };
  const roll = Math.floor(Math.random() * 20) + 1;
  return { roll, dc: DCs[difficulty], success: roll >= DCs[difficulty] };
}
```

### 3. DM Logic (`src/lib/dm.ts`)

```typescript
import { streamText, generateText, tool } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import { z } from "zod";
import { WORLD_LORE, CHARACTERS, rollDice, skillCheck, STORY_BEATS } from "./brains";
import { addToTranscript, setThinking, getGame } from "./game-state";

const SYSTEM = `You are the Dungeon Master for a Zork-style text adventure.

VOICE:
- Second person ("You step forward...")
- Terse, evocative. Max 3-4 sentences per beat.
- No markdown. No **bold**. No headers. Plain text only.
- End with implicit prompt, not "What do you do?"

WORLD KNOWLEDGE:
${WORLD_LORE}

USE TOOLS:
- roll_dice: For uncertain outcomes
- speak_as_npc: When NPCs talk (use their voice!)
- check_skill: For skill challenges

Keep it punchy. This is a terminal, not a novel.`;

export async function runDM(roomCode: string, playerAction: string) {
  const game = await getGame(roomCode);
  if (!game) throw new Error("Game not found");

  // Add player action to transcript
  await addToTranscript(roomCode, { type: "player", content: `> ${playerAction}` });

  // Set thinking
  await setThinking(roomCode, "The Dungeon Master considers...");

  const recentTranscript = game.transcript.slice(-8).map(e => e.content).join("\n\n");

  const result = await streamText({
    model: anthropic("claude-opus-4-20250514"),
    system: SYSTEM,
    prompt: `Recent transcript:\n${recentTranscript}\n\nPlayer: ${playerAction}\n\nRespond as DM:`,
    tools: {
      roll_dice: tool({
        description: "Roll dice for uncertain outcomes",
        parameters: z.object({
          dice: z.string().describe('Dice notation like "1d20" or "2d6+3"'),
          reason: z.string(),
        }),
        execute: async ({ dice, reason }) => {
          await setThinking(roomCode, "The dice tumble... 🎲");
          const result = rollDice(dice);
          await addToTranscript(roomCode, {
            type: "dice",
            content: `🎲 [${result.rolls.join(", ")}] = ${result.total}${result.crit ? (result.rolls[0] === 20 ? " ✨CRIT!" : " 💀FUMBLE!") : ""}`,
          });
          return result;
        },
      }),
      speak_as_npc: tool({
        description: "Have an NPC speak",
        parameters: z.object({
          characterId: z.enum(["mara", "vexis", "dren"]),
          situation: z.string(),
        }),
        execute: async ({ characterId, situation }) => {
          const char = CHARACTERS[characterId];
          await setThinking(roomCode, `Channeling ${char.name}...`);
          
          const { text } = await generateText({
            model: anthropic("claude-sonnet-4-20250514"),
            prompt: `You are ${char.name}. Voice: ${char.voice}. Secret (reveal only if dramatic): ${char.secret}\n\nSituation: ${situation}\n\nRespond in character, 1-2 sentences:`,
            maxTokens: 100,
          });
          
          await addToTranscript(roomCode, {
            type: "npc",
            content: text,
            speaker: char.name,
          });
          return { spoke: true };
        },
      }),
      check_skill: tool({
        description: "Make a skill check",
        parameters: z.object({
          skill: z.string(),
          difficulty: z.enum(["easy", "medium", "hard"]),
        }),
        execute: async ({ skill, difficulty }) => {
          await setThinking(roomCode, "Testing your fate...");
          const result = skillCheck(difficulty);
          await addToTranscript(roomCode, {
            type: "dice",
            content: `🎯 ${skill} check: [${result.roll}] vs DC ${result.dc} — ${result.success ? "SUCCESS" : "FAILURE"}`,
          });
          return result;
        },
      }),
    },
    maxSteps: 4,
  });

  // Collect the final narration
  let narration = "";
  for await (const chunk of result.textStream) {
    narration += chunk;
  }

  // Clear thinking and add narration
  await setThinking(roomCode, null);
  if (narration.trim()) {
    await addToTranscript(roomCode, { type: "narration", content: narration.trim() });
  }

  return narration;
}
```

### 4. API Routes

**`src/app/api/game/[code]/route.ts`** — GET state, POST action

```typescript
import { NextRequest, NextResponse } from "next/server";
import { getGame, createGame, addToTranscript } from "@/lib/game-state";
import { runDM } from "@/lib/dm";

// GET - fetch current game state (for polling)
export async function GET(
  req: NextRequest,
  { params }: { params: { code: string } }
) {
  const { code } = params;
  let game = await getGame(code);
  
  if (!game) {
    game = await createGame(code);
  }

  return NextResponse.json(game);
}

// POST - player action
export async function POST(
  req: NextRequest,
  { params }: { params: { code: string } }
) {
  const { code } = params;
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
```

### 5. Terminal UI (`src/app/room/[code]/page.tsx`)

```tsx
"use client";

import { useEffect, useState, useRef } from "react";
import { useParams } from "next/navigation";

interface Entry {
  id: string;
  type: "narration" | "player" | "dice" | "npc";
  content: string;
  speaker?: string;
}

interface GameState {
  transcript: Entry[];
  thinking: { active: boolean; phase: string } | null;
  lastUpdate: number;
}

export default function Room() {
  const { code } = useParams<{ code: string }>();
  const [game, setGame] = useState<GameState | null>(null);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const termRef = useRef<HTMLDivElement>(null);
  const lastUpdate = useRef(0);

  // Poll for updates
  useEffect(() => {
    const poll = async () => {
      try {
        const res = await fetch(`/api/game/${code}`);
        const data = await res.json();
        if (data.lastUpdate !== lastUpdate.current) {
          setGame(data);
          lastUpdate.current = data.lastUpdate;
        }
      } catch (e) {
        console.error(e);
      }
    };

    poll();
    const interval = setInterval(poll, 2000);
    return () => clearInterval(interval);
  }, [code]);

  // Auto-scroll
  useEffect(() => {
    termRef.current?.scrollTo(0, termRef.current.scrollHeight);
  }, [game?.transcript, game?.thinking]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    setLoading(true);
    const action = input.trim();
    setInput("");

    try {
      const res = await fetch(`/api/game/${code}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const data = await res.json();
      setGame(data);
      lastUpdate.current = data.lastUpdate;
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  const thinking = game?.thinking?.active ? game.thinking.phase : null;

  return (
    <div className="h-screen bg-black text-green-400 font-mono flex flex-col p-4">
      {/* Header */}
      <div className="border-b border-green-900 pb-2 mb-4 flex justify-between text-sm">
        <span className="text-green-600">ZORK-DM</span>
        <span className="text-green-700">room: {code}</span>
      </div>

      {/* Transcript */}
      <div ref={termRef} className="flex-1 overflow-y-auto space-y-3 mb-4">
        {game?.transcript.map((e) => (
          <div key={e.id} className={
            e.type === "player" ? "text-amber-400" :
            e.type === "dice" ? "text-cyan-400" :
            e.type === "npc" ? "text-yellow-300" :
            "text-green-400"
          }>
            {e.type === "npc" && e.speaker && (
              <span className="text-yellow-500">{e.speaker}: </span>
            )}
            <span className="whitespace-pre-wrap">{e.content}</span>
          </div>
        ))}

        {thinking && (
          <div className="text-green-600 animate-pulse">
            ◐ {thinking}
          </div>
        )}

        {loading && !thinking && (
          <div className="text-green-700 animate-pulse">...</div>
        )}
      </div>

      {/* Input */}
      <form onSubmit={submit} className="flex border-t border-green-900 pt-4">
        <span className="text-green-600 mr-2">&gt;</span>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          disabled={loading}
          className="flex-1 bg-transparent outline-none disabled:opacity-50"
          placeholder={loading ? "" : "What do you do?"}
          autoFocus
        />
      </form>
    </div>
  );
}
```

### 6. Landing Page (`src/app/page.tsx`)

```tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function Home() {
  const router = useRouter();
  const [joinCode, setJoinCode] = useState("");

  const create = () => {
    const code = Math.random().toString(36).slice(2, 8);
    router.push(`/room/${code}`);
  };

  const join = (e: React.FormEvent) => {
    e.preventDefault();
    if (joinCode.trim()) router.push(`/room/${joinCode.trim()}`);
  };

  return (
    <div className="min-h-screen bg-black text-green-400 font-mono flex items-center justify-center p-4">
      <div className="max-w-md w-full space-y-8">
        <pre className="text-green-600 text-xs text-center">
{`
███████╗ ██████╗ ██████╗ ██╗  ██╗
╚══███╔╝██╔═══██╗██╔══██╗██║ ██╔╝
  ███╔╝ ██║   ██║██████╔╝█████╔╝ 
 ███╔╝  ██║   ██║██╔══██╗██╔═██╗ 
███████╗╚██████╔╝██║  ██║██║  ██╗
╚══════╝ ╚═════╝ ╚═╝  ╚═╝╚═╝  ╚═╝
        D U N G E O N   M A S T E R
`}
        </pre>

        <div className="border border-green-900 p-6 space-y-6">
          <button
            onClick={create}
            className="w-full py-3 border border-green-700 hover:bg-green-900/30"
          >
            [ NEW GAME ]
          </button>

          <div className="text-center text-green-800">or</div>

          <form onSubmit={join} className="space-y-3">
            <input
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value)}
              placeholder="room code"
              className="w-full bg-black border border-green-900 px-4 py-2 outline-none focus:border-green-700"
            />
            <button className="w-full py-2 border border-green-900 hover:bg-green-900/30">
              [ JOIN ]
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
```

### 7. Config (`vercel.json`)

```json
{
  "functions": {
    "src/app/api/game/[code]/route.ts": {
      "maxDuration": 60
    }
  }
}
```

---

## Deploy

```bash
# That's literally it
vercel --prod
```

---

## How Spectating Works

It's polling. Every 2 seconds, browsers fetch `/api/game/[code]`. When the game state changes, they see it.

Is this efficient? No.  
Does it work? Yes.  
Is it janky? Absolutely.

---

## Total Setup Time: ~20 minutes

```bash
npx create-next-app@latest zork-dm --typescript --tailwind --app --src-dir
cd zork-dm
npm install ai @ai-sdk/anthropic @vercel/kv zod
vercel link
vercel storage add kv     # click click in browser
vercel env add ANTHROPIC_API_KEY
vercel env pull .env.local

# copy the code files above

vercel --prod
```

Done. Send your friend the link.

---

## Cost

- **Vercel**: Free tier
- **Vercel KV**: Free tier (30MB, 3000 req/day)
- **Claude Opus 4.5**: ~$0.02-0.05 per turn

For a demo with a friend? Basically free.