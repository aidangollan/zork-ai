// D&D 5e Combat Rules Engine

import {
  Character,
  Condition,
  DamageType,
  getModifier,
  Weapon,
} from "../character";
import { roll, rollDamage, RollResult, AdvantageType, meetsAC } from "./dice";
import { getAttackBonus, getDamageBonus } from "./abilities";
import { WEAPONS, isFinesse, isRanged } from "./equipment";

// ============= COMBAT STATE =============

export interface CombatState {
  active: boolean;
  round: number;
  turnIndex: number;
  initiativeOrder: CombatantInit[];
  enemies: Enemy[];
  environment: string;
  log: CombatLogEntry[];
}

export interface CombatantInit {
  id: string;
  name: string;
  type: "player" | "enemy" | "npc";
  initiative: number;
  hasActed: boolean;
  characterId?: string;  // For player characters
}

export interface Enemy {
  id: string;
  name: string;
  maxHp: number;
  currentHp: number;
  armorClass: number;
  speed: number;
  abilities: {
    strength: number;
    dexterity: number;
    constitution: number;
    intelligence: number;
    wisdom: number;
    charisma: number;
  };
  attacks: EnemyAttack[];
  challengeRating: number;
  xpValue: number;
  conditions: Condition[];
  vulnerabilities?: DamageType[];
  resistances?: DamageType[];
  immunities?: DamageType[];
}

export interface EnemyAttack {
  name: string;
  attackBonus: number;
  damage: string;
  damageType: DamageType;
  range?: { normal: number; long: number };
  description?: string;
}

export interface CombatLogEntry {
  round: number;
  actor: string;
  action: string;
  result: string;
  timestamp: number;
}

// ============= ATTACK RESULTS =============

export interface AttackResult {
  hit: boolean;
  critical: boolean;
  fumble: boolean;
  attackRoll: RollResult;
  targetAC: number;
  damage?: number;
  damageRoll?: RollResult;
  damageType?: DamageType;
}

export interface DeathSaveResult {
  roll: RollResult;
  success: boolean;
  critical: boolean;  // Nat 20 = regain 1 HP
  fumble: boolean;    // Nat 1 = 2 failures
  totalSuccesses: number;
  totalFailures: number;
  stabilized: boolean;
  dead: boolean;
}

// ============= INITIATIVE =============

/**
 * Roll initiative for a character
 */
export function rollInitiative(character: Character): RollResult {
  const dexMod = getModifier(character.abilities.dexterity);
  return roll(`1d20+${dexMod}`);
}

/**
 * Roll initiative for an enemy
 */
export function rollEnemyInitiative(enemy: Enemy): RollResult {
  const dexMod = getModifier(enemy.abilities.dexterity);
  return roll(`1d20+${dexMod}`);
}

/**
 * Sort combatants by initiative (highest first, ties go to higher DEX)
 */
export function sortByInitiative(combatants: CombatantInit[]): CombatantInit[] {
  return [...combatants].sort((a, b) => {
    if (b.initiative !== a.initiative) {
      return b.initiative - a.initiative;
    }
    // Tie-breaker: could add DEX comparison here if we stored it
    return 0;
  });
}

/**
 * Create initial combat state
 */
export function createCombatState(
  players: { character: Character; initiative: number }[],
  enemies: { enemy: Enemy; initiative: number }[],
  environment: string = "unknown"
): CombatState {
  const combatants: CombatantInit[] = [
    ...players.map(p => ({
      id: p.character.id,
      name: p.character.name,
      type: "player" as const,
      initiative: p.initiative,
      hasActed: false,
      characterId: p.character.id,
    })),
    ...enemies.map(e => ({
      id: e.enemy.id,
      name: e.enemy.name,
      type: "enemy" as const,
      initiative: e.initiative,
      hasActed: false,
    })),
  ];

  return {
    active: true,
    round: 1,
    turnIndex: 0,
    initiativeOrder: sortByInitiative(combatants),
    enemies: enemies.map(e => e.enemy),
    environment,
    log: [],
  };
}

// ============= ATTACKS =============

/**
 * Make a weapon attack against a target
 */
export function makeAttack(
  attacker: Character,
  weaponId: string,
  targetAC: number,
  advantage: AdvantageType = "normal"
): AttackResult {
  const attackBonus = getAttackBonus(attacker, weaponId);
  const attackRoll = roll(`1d20+${attackBonus}`, advantage);

  const hit = meetsAC(attackRoll, targetAC);
  const critical = attackRoll.isCritical;
  const fumble = attackRoll.isFumble;

  const result: AttackResult = {
    hit,
    critical,
    fumble,
    attackRoll,
    targetAC,
  };

  // Roll damage if hit
  if (hit) {
    const weapon = attacker.inventory.find(i => i.id === weaponId) as Weapon | undefined;
    if (weapon) {
      const damageBonus = getDamageBonus(attacker, weaponId);
      const damageNotation = `${weapon.damage}+${damageBonus}`;
      result.damageRoll = rollDamage(damageNotation, critical);
      result.damage = result.damageRoll.total;
      result.damageType = weapon.damageType;
    }
  }

  return result;
}

/**
 * Make an enemy attack against a target
 */
export function makeEnemyAttack(
  enemy: Enemy,
  attack: EnemyAttack,
  targetAC: number,
  advantage: AdvantageType = "normal"
): AttackResult {
  const attackRoll = roll(`1d20+${attack.attackBonus}`, advantage);

  const hit = meetsAC(attackRoll, targetAC);
  const critical = attackRoll.isCritical;
  const fumble = attackRoll.isFumble;

  const result: AttackResult = {
    hit,
    critical,
    fumble,
    attackRoll,
    targetAC,
  };

  if (hit) {
    result.damageRoll = rollDamage(attack.damage, critical);
    result.damage = result.damageRoll.total;
    result.damageType = attack.damageType;
  }

  return result;
}

// ============= DAMAGE =============

/**
 * Apply damage to a character
 */
export function applyDamage(
  character: Character,
  amount: number,
  damageType: DamageType
): { newHp: number; unconscious: boolean; dead: boolean } {
  // TODO: Handle resistances, vulnerabilities, immunities

  let newHp = character.currentHp - amount;

  // Check for massive damage (instant death)
  const massiveDamage = newHp <= -character.maxHp;

  if (massiveDamage) {
    return { newHp: 0, unconscious: true, dead: true };
  }

  // At 0 or below, go unconscious
  if (newHp <= 0) {
    return { newHp: 0, unconscious: true, dead: false };
  }

  return { newHp, unconscious: false, dead: false };
}

/**
 * Apply damage to an enemy
 */
export function applyDamageToEnemy(
  enemy: Enemy,
  amount: number,
  damageType: DamageType
): { newHp: number; dead: boolean } {
  // Handle resistances
  if (enemy.resistances?.includes(damageType)) {
    amount = Math.floor(amount / 2);
  }

  // Handle vulnerabilities
  if (enemy.vulnerabilities?.includes(damageType)) {
    amount = amount * 2;
  }

  // Handle immunities
  if (enemy.immunities?.includes(damageType)) {
    amount = 0;
  }

  const newHp = Math.max(0, enemy.currentHp - amount);
  return { newHp, dead: newHp <= 0 };
}

/**
 * Heal a character
 */
export function healCharacter(
  character: Character,
  amount: number
): { newHp: number; overhealed: number } {
  const newHp = Math.min(character.currentHp + amount, character.maxHp);
  const overhealed = Math.max(0, (character.currentHp + amount) - character.maxHp);

  return { newHp, overhealed };
}

// ============= DEATH SAVES =============

/**
 * Roll a death saving throw
 */
export function rollDeathSave(character: Character): DeathSaveResult {
  const rollResult = roll("1d20");

  let successes = character.deathSaves.successes;
  let failures = character.deathSaves.failures;

  const critical = rollResult.natural === 20;
  const fumble = rollResult.natural === 1;
  const success = rollResult.total >= 10;

  if (critical) {
    // Nat 20: Regain 1 HP and wake up
    return {
      roll: rollResult,
      success: true,
      critical: true,
      fumble: false,
      totalSuccesses: 3,  // Effectively stabilized
      totalFailures: failures,
      stabilized: true,
      dead: false,
    };
  }

  if (fumble) {
    // Nat 1: Two failures
    failures += 2;
  } else if (success) {
    successes += 1;
  } else {
    failures += 1;
  }

  const stabilized = successes >= 3;
  const dead = failures >= 3;

  return {
    roll: rollResult,
    success,
    critical: false,
    fumble,
    totalSuccesses: successes,
    totalFailures: failures,
    stabilized,
    dead,
  };
}

// ============= CONDITIONS =============

/**
 * Check if a condition affects attack rolls
 */
export function getConditionAttackModifier(conditions: Condition[]): AdvantageType {
  // Disadvantage on attacks
  if (
    conditions.includes("blinded") ||
    conditions.includes("frightened") ||
    conditions.includes("poisoned") ||
    conditions.includes("prone") ||
    conditions.includes("restrained")
  ) {
    return "disadvantage";
  }

  // Advantage on attacks (invisible)
  if (conditions.includes("invisible")) {
    return "advantage";
  }

  return "normal";
}

/**
 * Check if attacks against this target have advantage/disadvantage
 */
export function getConditionDefenseModifier(conditions: Condition[]): AdvantageType {
  // Attacks have advantage against these conditions
  if (
    conditions.includes("blinded") ||
    conditions.includes("paralyzed") ||
    conditions.includes("petrified") ||
    conditions.includes("restrained") ||
    conditions.includes("stunned") ||
    conditions.includes("unconscious")
  ) {
    return "advantage";
  }

  // Attacks have disadvantage against invisible targets
  if (conditions.includes("invisible")) {
    return "disadvantage";
  }

  return "normal";
}

/**
 * Check if a condition prevents actions
 */
export function canTakeActions(conditions: Condition[]): boolean {
  return !conditions.some(c =>
    ["incapacitated", "paralyzed", "petrified", "stunned", "unconscious"].includes(c)
  );
}

// ============= COMBAT UTILITIES =============

/**
 * Get the current combatant
 */
export function getCurrentCombatant(combat: CombatState): CombatantInit | null {
  if (!combat.active || combat.initiativeOrder.length === 0) {
    return null;
  }
  return combat.initiativeOrder[combat.turnIndex];
}

/**
 * Advance to the next turn
 */
export function advanceTurn(combat: CombatState): CombatState {
  const newCombat = { ...combat };

  // Mark current combatant as having acted
  newCombat.initiativeOrder = combat.initiativeOrder.map((c, i) =>
    i === combat.turnIndex ? { ...c, hasActed: true } : c
  );

  // Move to next combatant
  newCombat.turnIndex = (combat.turnIndex + 1) % combat.initiativeOrder.length;

  // Check if we've completed a round
  if (newCombat.turnIndex === 0) {
    newCombat.round += 1;
    // Reset hasActed for all combatants
    newCombat.initiativeOrder = newCombat.initiativeOrder.map(c => ({
      ...c,
      hasActed: false,
    }));
  }

  return newCombat;
}

/**
 * Remove a combatant from initiative order (when they die or flee)
 */
export function removeCombatant(combat: CombatState, combatantId: string): CombatState {
  const index = combat.initiativeOrder.findIndex(c => c.id === combatantId);
  if (index === -1) return combat;

  const newCombat = { ...combat };
  newCombat.initiativeOrder = combat.initiativeOrder.filter(c => c.id !== combatantId);

  // Adjust turn index if necessary
  if (index < combat.turnIndex) {
    newCombat.turnIndex = Math.max(0, combat.turnIndex - 1);
  } else if (newCombat.turnIndex >= newCombat.initiativeOrder.length) {
    newCombat.turnIndex = 0;
  }

  return newCombat;
}

/**
 * Check if combat should end
 */
export function shouldCombatEnd(combat: CombatState): { end: boolean; reason: "victory" | "defeat" | "flee" | null } {
  const players = combat.initiativeOrder.filter(c => c.type === "player");
  const enemies = combat.initiativeOrder.filter(c => c.type === "enemy");

  if (enemies.length === 0) {
    return { end: true, reason: "victory" };
  }

  if (players.length === 0) {
    return { end: true, reason: "defeat" };
  }

  return { end: false, reason: null };
}

/**
 * Calculate total XP from defeated enemies
 */
export function calculateCombatXP(defeatedEnemies: Enemy[]): number {
  return defeatedEnemies.reduce((total, enemy) => total + enemy.xpValue, 0);
}

/**
 * Format attack result for display
 */
export function formatAttackResult(
  attackerName: string,
  targetName: string,
  result: AttackResult
): string {
  let str = `${attackerName} attacks ${targetName}: `;
  str += `[${result.attackRoll.rolls[0]}]`;

  if (result.attackRoll.modifier !== 0) {
    str += result.attackRoll.modifier > 0
      ? ` + ${result.attackRoll.modifier}`
      : ` - ${Math.abs(result.attackRoll.modifier)}`;
  }

  str += ` = ${result.attackRoll.total} vs AC ${result.targetAC}`;

  if (result.critical) {
    str += " - CRITICAL HIT!";
  } else if (result.fumble) {
    str += " - MISS! (Natural 1)";
  } else if (result.hit) {
    str += " - HIT!";
  } else {
    str += " - MISS!";
  }

  if (result.hit && result.damage !== undefined) {
    str += ` Damage: ${result.damage} ${result.damageType}`;
  }

  return str;
}
