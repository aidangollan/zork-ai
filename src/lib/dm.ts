import { streamText, generateText, stepCountIs } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import { z } from "zod";
import { WORLD_LORE, CHARACTERS, rollDice, skillCheck } from "./brains";
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

const rollDiceSchema = z.object({
  dice: z.string().describe('Dice notation like "1d20" or "2d6+3"'),
  reason: z.string(),
});

const speakAsNpcSchema = z.object({
  characterId: z.enum(["mara", "vexis", "dren"]),
  situation: z.string(),
});

const checkSkillSchema = z.object({
  skill: z.string(),
  difficulty: z.enum(["easy", "medium", "hard"]),
});

export async function runDM(roomCode: string, playerAction: string) {
  const game = await getGame(roomCode);
  if (!game) throw new Error("Game not found");

  // Add player action to transcript
  await addToTranscript(roomCode, { type: "player", content: `> ${playerAction}` });

  // Set thinking
  await setThinking(roomCode, "The Dungeon Master considers...");

  const recentTranscript = game.transcript.slice(-8).map(e => e.content).join("\n\n");

  const result = streamText({
    model: anthropic("claude-sonnet-4-5"),
    system: SYSTEM,
    prompt: `Recent transcript:\n${recentTranscript}\n\nPlayer: ${playerAction}\n\nRespond as DM:`,
    tools: {
      roll_dice: {
        description: "Roll dice for uncertain outcomes",
        inputSchema: rollDiceSchema,
        execute: async ({ dice }: z.infer<typeof rollDiceSchema>) => {
          await setThinking(roomCode, "The dice tumble...");
          const diceResult = rollDice(dice);
          await addToTranscript(roomCode, {
            type: "dice",
            content: `[${diceResult.rolls.join(", ")}] = ${diceResult.total}${diceResult.crit ? (diceResult.rolls[0] === 20 ? " CRIT!" : " FUMBLE!") : ""}`,
          });
          return diceResult;
        },
      },
      speak_as_npc: {
        description: "Have an NPC speak",
        inputSchema: speakAsNpcSchema,
        execute: async ({ characterId, situation }: z.infer<typeof speakAsNpcSchema>) => {
          const char = CHARACTERS[characterId];
          await setThinking(roomCode, `Channeling ${char.name}...`);

          const { text } = await generateText({
            model: anthropic("claude-sonnet-4-20250514"),
            prompt: `You are ${char.name}. Voice: ${char.voice}. Secret (reveal only if dramatic): ${char.secret}\n\nSituation: ${situation}\n\nRespond in character, 1-2 sentences:`,
            maxOutputTokens: 100,
          });

          await addToTranscript(roomCode, {
            type: "npc",
            content: text,
            speaker: char.name,
          });
          return { spoke: true };
        },
      },
      check_skill: {
        description: "Make a skill check",
        inputSchema: checkSkillSchema,
        execute: async ({ skill, difficulty }: z.infer<typeof checkSkillSchema>) => {
          await setThinking(roomCode, "Testing your fate...");
          const checkResult = skillCheck(difficulty);
          await addToTranscript(roomCode, {
            type: "dice",
            content: `${skill} check: [${checkResult.roll}] vs DC ${checkResult.dc} - ${checkResult.success ? "SUCCESS" : "FAILURE"}`,
          });
          return checkResult;
        },
      },
    },
    stopWhen: stepCountIs(4),
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
