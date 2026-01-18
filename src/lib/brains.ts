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
