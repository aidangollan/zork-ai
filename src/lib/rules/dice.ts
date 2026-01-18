// Dice rolling utilities for D&D 5e

export interface RollResult {
  rolls: number[];
  total: number;
  modifier: number;
  natural: number;      // Sum of dice without modifier
  isCritical: boolean;  // Natural 20 on d20
  isFumble: boolean;    // Natural 1 on d20
  advantage?: "advantage" | "disadvantage" | "normal";
  discardedRoll?: number;  // For advantage/disadvantage
}

export type AdvantageType = "advantage" | "disadvantage" | "normal";

/**
 * Roll dice with standard notation (e.g., "2d6+3", "1d20-1")
 */
export function roll(
  notation: string,
  advantageType: AdvantageType = "normal"
): RollResult {
  const match = notation.match(/^(\d+)d(\d+)([+-]\d+)?$/i);
  if (!match) {
    return {
      rolls: [0],
      total: 0,
      modifier: 0,
      natural: 0,
      isCritical: false,
      isFumble: false,
    };
  }

  const [, countStr, sidesStr, modStr] = match;
  const count = parseInt(countStr);
  const sides = parseInt(sidesStr);
  const modifier = modStr ? parseInt(modStr) : 0;

  // Handle advantage/disadvantage for d20 rolls
  if (sides === 20 && count === 1 && advantageType !== "normal") {
    return rollWithAdvantage(sides, modifier, advantageType);
  }

  const rolls: number[] = [];
  for (let i = 0; i < count; i++) {
    rolls.push(Math.floor(Math.random() * sides) + 1);
  }

  const natural = rolls.reduce((a, b) => a + b, 0);
  const total = natural + modifier;

  // Check for crit/fumble on d20
  const isCritical = sides === 20 && count === 1 && rolls[0] === 20;
  const isFumble = sides === 20 && count === 1 && rolls[0] === 1;

  return {
    rolls,
    total,
    modifier,
    natural,
    isCritical,
    isFumble,
  };
}

/**
 * Roll with advantage or disadvantage
 */
function rollWithAdvantage(
  sides: number,
  modifier: number,
  advantageType: AdvantageType
): RollResult {
  const roll1 = Math.floor(Math.random() * sides) + 1;
  const roll2 = Math.floor(Math.random() * sides) + 1;

  const useHigher = advantageType === "advantage";
  const chosen = useHigher ? Math.max(roll1, roll2) : Math.min(roll1, roll2);
  const discarded = useHigher ? Math.min(roll1, roll2) : Math.max(roll1, roll2);

  return {
    rolls: [chosen],
    total: chosen + modifier,
    modifier,
    natural: chosen,
    isCritical: chosen === 20,
    isFumble: chosen === 1,
    advantage: advantageType,
    discardedRoll: discarded,
  };
}

/**
 * Roll a single die
 */
export function rollDie(sides: number): number {
  return Math.floor(Math.random() * sides) + 1;
}

/**
 * Roll multiple dice and sum them
 */
export function rollDice(count: number, sides: number): number[] {
  const rolls: number[] = [];
  for (let i = 0; i < count; i++) {
    rolls.push(rollDie(sides));
  }
  return rolls;
}

/**
 * Roll for ability scores using 4d6 drop lowest
 */
export function rollAbilityScore(): { rolls: number[]; total: number; dropped: number } {
  const rolls = rollDice(4, 6);
  const sorted = [...rolls].sort((a, b) => b - a);
  const dropped = sorted.pop()!;
  const total = sorted.reduce((a, b) => a + b, 0);
  return { rolls, total, dropped };
}

/**
 * Roll initiative (d20 + dex modifier)
 */
export function rollInitiative(dexModifier: number): RollResult {
  return roll(`1d20+${dexModifier >= 0 ? dexModifier : dexModifier}`);
}

/**
 * Parse damage notation and roll
 * Supports multiple dice types: "2d6+3" or "1d8+1d6+4"
 */
export function rollDamage(notation: string, critical: boolean = false): RollResult {
  // Split on + but preserve the + for modifiers
  const parts = notation.split(/(?=[+-])/);

  let totalRolls: number[] = [];
  let totalModifier = 0;

  for (const part of parts) {
    const trimmed = part.trim();
    const diceMatch = trimmed.match(/^([+-])?(\d+)d(\d+)$/i);

    if (diceMatch) {
      const [, sign, countStr, sidesStr] = diceMatch;
      let count = parseInt(countStr);
      const sides = parseInt(sidesStr);
      const multiplier = sign === "-" ? -1 : 1;

      // Double dice on critical hit
      if (critical) {
        count *= 2;
      }

      const rolls = rollDice(count, sides);
      totalRolls.push(...rolls.map(r => r * multiplier));
    } else {
      // It's a flat modifier
      const num = parseInt(trimmed);
      if (!isNaN(num)) {
        totalModifier += num;
      }
    }
  }

  const natural = totalRolls.reduce((a, b) => a + b, 0);
  const total = natural + totalModifier;

  return {
    rolls: totalRolls,
    total: Math.max(0, total), // Damage can't be negative
    modifier: totalModifier,
    natural,
    isCritical: critical,
    isFumble: false,
  };
}

/**
 * Format a roll result for display
 */
export function formatRollResult(result: RollResult, label?: string): string {
  let str = "";

  if (label) {
    str += `${label}: `;
  }

  str += `[${result.rolls.join(", ")}]`;

  if (result.modifier !== 0) {
    str += result.modifier > 0 ? ` + ${result.modifier}` : ` - ${Math.abs(result.modifier)}`;
  }

  str += ` = ${result.total}`;

  if (result.isCritical) {
    str += " CRITICAL!";
  } else if (result.isFumble) {
    str += " FUMBLE!";
  }

  if (result.advantage && result.discardedRoll !== undefined) {
    str += ` (${result.advantage}, discarded ${result.discardedRoll})`;
  }

  return str;
}

/**
 * Check if a roll meets or exceeds a DC
 */
export function meetsAC(attackRoll: RollResult, targetAC: number): boolean {
  // Natural 20 always hits, natural 1 always misses
  if (attackRoll.isCritical) return true;
  if (attackRoll.isFumble) return false;
  return attackRoll.total >= targetAC;
}

/**
 * Check if a roll meets or exceeds a DC (for saving throws/ability checks)
 */
export function meetsDC(roll: RollResult, dc: number): boolean {
  return roll.total >= dc;
}
