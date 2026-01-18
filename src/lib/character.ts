// Character System - Core types and helpers for D&D 5e characters

export type Race = "human" | "elf" | "dwarf" | "halfling";
export type CharacterClass = "fighter" | "wizard" | "rogue" | "cleric";
export type Ability = "strength" | "dexterity" | "constitution" | "intelligence" | "wisdom" | "charisma";
export type Skill =
  | "acrobatics" | "animal_handling" | "arcana" | "athletics"
  | "deception" | "history" | "insight" | "intimidation"
  | "investigation" | "medicine" | "nature" | "perception"
  | "performance" | "persuasion" | "religion" | "sleight_of_hand"
  | "stealth" | "survival";

export type Condition =
  | "blinded" | "charmed" | "deafened" | "frightened"
  | "grappled" | "incapacitated" | "invisible" | "paralyzed"
  | "petrified" | "poisoned" | "prone" | "restrained"
  | "stunned" | "unconscious" | "exhaustion";

export type DamageType =
  | "slashing" | "piercing" | "bludgeoning"
  | "fire" | "cold" | "lightning" | "thunder"
  | "poison" | "acid" | "necrotic" | "radiant"
  | "force" | "psychic";

export interface Abilities {
  strength: number;
  dexterity: number;
  constitution: number;
  intelligence: number;
  wisdom: number;
  charisma: number;
}

export interface InventoryItem {
  id: string;
  name: string;
  quantity: number;
  weight: number;
  description?: string;
  type: "weapon" | "armor" | "shield" | "potion" | "tool" | "gear" | "treasure";
}

export interface Weapon extends InventoryItem {
  type: "weapon";
  damage: string;           // e.g., "1d8"
  damageType: DamageType;
  properties: WeaponProperty[];
  range?: { normal: number; long: number };
  finesse?: boolean;
  versatileDamage?: string; // e.g., "1d10" for versatile weapons
}

export type WeaponProperty =
  | "ammunition" | "finesse" | "heavy" | "light" | "loading"
  | "range" | "reach" | "special" | "thrown" | "two-handed"
  | "versatile" | "silvered" | "magical";

export interface Armor extends InventoryItem {
  type: "armor";
  armorType: "light" | "medium" | "heavy" | "shield";
  baseAC: number;
  maxDexBonus?: number;     // undefined = no limit, 0 = no dex, 2 = medium armor
  stealthDisadvantage: boolean;
  strengthRequirement?: number;
}

export interface Spell {
  id: string;
  name: string;
  level: number;            // 0 = cantrip
  school: SpellSchool;
  castingTime: string;
  range: string;
  components: string;       // "V, S, M (a bit of fur)"
  duration: string;
  concentration: boolean;
  description: string;
  damage?: string;          // e.g., "1d10"
  damageType?: DamageType;
  savingThrow?: Ability;
  higherLevels?: string;
}

export type SpellSchool =
  | "abjuration" | "conjuration" | "divination" | "enchantment"
  | "evocation" | "illusion" | "necromancy" | "transmutation";

export interface SpellSlots {
  1: { max: number; current: number };
  2: { max: number; current: number };
  3: { max: number; current: number };
  4: { max: number; current: number };
  5: { max: number; current: number };
  6: { max: number; current: number };
  7: { max: number; current: number };
  8: { max: number; current: number };
  9: { max: number; current: number };
}

export interface Character {
  id: string;
  playerId: string;
  name: string;

  // Core Identity
  race: Race;
  class: CharacterClass;
  level: number;
  xp: number;
  background: string;

  // Ability Scores
  abilities: Abilities;

  // Derived Stats
  maxHp: number;
  currentHp: number;
  tempHp: number;
  armorClass: number;
  speed: number;
  proficiencyBonus: number;
  hitDice: { total: number; current: number; die: string };

  // Proficiencies
  savingThrows: Ability[];
  skills: Skill[];
  languages: string[];
  armorProficiencies: string[];
  weaponProficiencies: string[];
  toolProficiencies: string[];

  // Equipment
  inventory: InventoryItem[];
  equippedArmor: string | null;   // item ID
  equippedWeapon: string | null;  // item ID
  equippedShield: string | null;  // item ID
  gold: number;

  // Spellcasting (for Wizard/Cleric)
  spellcastingAbility: Ability | null;
  spellSlots: SpellSlots;
  knownSpells: Spell[];
  preparedSpells: string[];   // spell IDs
  cantripsKnown: Spell[];

  // Class Features
  features: ClassFeature[];

  // Combat State
  conditions: Condition[];
  deathSaves: { successes: number; failures: number };
  concentrating: string | null; // spell ID
}

export interface ClassFeature {
  name: string;
  description: string;
  level: number;
  usesPerRest?: { max: number; current: number; restType: "short" | "long" };
}

// Helper functions

export function getModifier(score: number): number {
  return Math.floor((score - 10) / 2);
}

export function getProficiencyBonus(level: number): number {
  return Math.ceil(level / 4) + 1;
}

export function getXpForLevel(level: number): number {
  const xpThresholds = [0, 300, 900, 2700, 6500, 14000, 23000, 34000, 48000, 64000,
                        85000, 100000, 120000, 140000, 165000, 195000, 225000,
                        265000, 305000, 355000];
  return xpThresholds[level - 1] || 0;
}

export function getLevelFromXp(xp: number): number {
  const xpThresholds = [0, 300, 900, 2700, 6500, 14000, 23000, 34000, 48000, 64000,
                        85000, 100000, 120000, 140000, 165000, 195000, 225000,
                        265000, 305000, 355000];
  for (let i = xpThresholds.length - 1; i >= 0; i--) {
    if (xp >= xpThresholds[i]) return i + 1;
  }
  return 1;
}

export function getSkillAbility(skill: Skill): Ability {
  const skillAbilities: Record<Skill, Ability> = {
    acrobatics: "dexterity",
    animal_handling: "wisdom",
    arcana: "intelligence",
    athletics: "strength",
    deception: "charisma",
    history: "intelligence",
    insight: "wisdom",
    intimidation: "charisma",
    investigation: "intelligence",
    medicine: "wisdom",
    nature: "intelligence",
    perception: "wisdom",
    performance: "charisma",
    persuasion: "charisma",
    religion: "intelligence",
    sleight_of_hand: "dexterity",
    stealth: "dexterity",
    survival: "wisdom",
  };
  return skillAbilities[skill];
}

export function calculateAC(character: Character, armor: Armor | null, hasShield: boolean): number {
  let ac = 10;
  const dexMod = getModifier(character.abilities.dexterity);

  if (armor) {
    ac = armor.baseAC;
    if (armor.maxDexBonus === undefined) {
      ac += dexMod; // Light armor - full dex
    } else if (armor.maxDexBonus > 0) {
      ac += Math.min(dexMod, armor.maxDexBonus); // Medium armor - capped dex
    }
    // Heavy armor - no dex bonus
  } else {
    ac += dexMod; // Unarmored
  }

  if (hasShield) {
    ac += 2;
  }

  return ac;
}

export function createEmptySpellSlots(): SpellSlots {
  return {
    1: { max: 0, current: 0 },
    2: { max: 0, current: 0 },
    3: { max: 0, current: 0 },
    4: { max: 0, current: 0 },
    5: { max: 0, current: 0 },
    6: { max: 0, current: 0 },
    7: { max: 0, current: 0 },
    8: { max: 0, current: 0 },
    9: { max: 0, current: 0 },
  };
}

export function formatModifier(mod: number): string {
  return mod >= 0 ? `+${mod}` : `${mod}`;
}

export function getPassivePerception(character: Character): number {
  const wisMod = getModifier(character.abilities.wisdom);
  const profBonus = character.skills.includes("perception") ? character.proficiencyBonus : 0;
  return 10 + wisMod + profBonus;
}
