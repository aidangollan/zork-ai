// D&D 5e Class Definitions - Simplified for quick character creation

import {
  CharacterClass,
  Abilities,
  Ability,
  Skill,
  ClassFeature,
  SpellSlots,
  Spell,
  createEmptySpellSlots,
} from "../character";
import { WEAPONS, ARMOR, createWeapon, createArmor } from "./equipment";

export interface ClassDefinition {
  name: CharacterClass;
  displayName: string;
  description: string;
  hitDie: string;
  primaryAbility: Ability;
  savingThrows: Ability[];
  skillChoices: Skill[];
  numSkillChoices: number;
  defaultSkills: Skill[];  // Pre-selected for quick start
  armorProficiencies: string[];
  weaponProficiencies: string[];
  toolProficiencies: string[];
  startingEquipment: string[];  // Item IDs
  startingGold: number;
  spellcastingAbility: Ability | null;
  features: ClassFeature[];
  // Optimized ability score array for this class
  recommendedAbilities: Abilities;
}

// Standard array: 15, 14, 13, 12, 10, 8 - distributed per class

export const CLASSES: Record<CharacterClass, ClassDefinition> = {
  fighter: {
    name: "fighter",
    displayName: "Fighter",
    description: "A master of martial combat, skilled with a variety of weapons and armor. Fighters excel at dealing and taking damage in the thick of battle.",
    hitDie: "d10",
    primaryAbility: "strength",
    savingThrows: ["strength", "constitution"],
    skillChoices: ["acrobatics", "animal_handling", "athletics", "history", "insight", "intimidation", "perception", "survival"],
    numSkillChoices: 2,
    defaultSkills: ["athletics", "intimidation"],
    armorProficiencies: ["light", "medium", "heavy", "shields"],
    weaponProficiencies: ["simple", "martial"],
    toolProficiencies: [],
    startingEquipment: ["chain_mail", "longsword", "shield", "light_crossbow", "explorers_pack"],
    startingGold: 10,
    spellcastingAbility: null,
    features: [
      {
        name: "Fighting Style: Defense",
        description: "While wearing armor, you gain a +1 bonus to AC.",
        level: 1,
      },
      {
        name: "Second Wind",
        description: "On your turn, you can use a bonus action to regain hit points equal to 1d10 + your fighter level. Once you use this feature, you must finish a short or long rest before you can use it again.",
        level: 1,
        usesPerRest: { max: 1, current: 1, restType: "short" },
      },
      {
        name: "Action Surge",
        description: "On your turn, you can take one additional action. Once you use this feature, you must finish a short or long rest before you can use it again.",
        level: 2,
        usesPerRest: { max: 1, current: 1, restType: "short" },
      },
    ],
    recommendedAbilities: {
      strength: 15,
      constitution: 14,
      dexterity: 13,
      wisdom: 12,
      intelligence: 10,
      charisma: 8,
    },
  },

  wizard: {
    name: "wizard",
    displayName: "Wizard",
    description: "A scholarly magic-user capable of manipulating the structures of reality through careful study and powerful spells.",
    hitDie: "d6",
    primaryAbility: "intelligence",
    savingThrows: ["intelligence", "wisdom"],
    skillChoices: ["arcana", "history", "insight", "investigation", "medicine", "religion"],
    numSkillChoices: 2,
    defaultSkills: ["arcana", "investigation"],
    armorProficiencies: [],
    weaponProficiencies: ["daggers", "darts", "slings", "quarterstaffs", "light_crossbows"],
    toolProficiencies: [],
    startingEquipment: ["quarterstaff", "component_pouch", "scholars_pack", "spellbook"],
    startingGold: 10,
    spellcastingAbility: "intelligence",
    features: [
      {
        name: "Spellcasting",
        description: "You can cast wizard spells using Intelligence as your spellcasting ability. You know 3 cantrips and have a spellbook with 6 1st-level spells.",
        level: 1,
      },
      {
        name: "Arcane Recovery",
        description: "Once per day when you finish a short rest, you can choose expended spell slots to recover. The spell slots can have a combined level equal to or less than half your wizard level (rounded up).",
        level: 1,
        usesPerRest: { max: 1, current: 1, restType: "long" },
      },
    ],
    recommendedAbilities: {
      intelligence: 15,
      dexterity: 14,
      constitution: 13,
      wisdom: 12,
      strength: 10,
      charisma: 8,
    },
  },

  rogue: {
    name: "rogue",
    displayName: "Rogue",
    description: "A scoundrel who uses stealth and trickery to overcome obstacles and enemies. Rogues excel at finding and disabling traps, picking locks, and striking from the shadows.",
    hitDie: "d8",
    primaryAbility: "dexterity",
    savingThrows: ["dexterity", "intelligence"],
    skillChoices: ["acrobatics", "athletics", "deception", "insight", "intimidation", "investigation", "perception", "performance", "persuasion", "sleight_of_hand", "stealth"],
    numSkillChoices: 4,
    defaultSkills: ["stealth", "perception", "sleight_of_hand", "investigation"],
    armorProficiencies: ["light"],
    weaponProficiencies: ["simple", "hand_crossbows", "longswords", "rapiers", "shortswords"],
    toolProficiencies: ["thieves_tools"],
    startingEquipment: ["rapier", "shortbow", "leather_armor", "thieves_tools", "burglars_pack"],
    startingGold: 10,
    spellcastingAbility: null,
    features: [
      {
        name: "Expertise",
        description: "Choose two of your skill proficiencies. Your proficiency bonus is doubled for any ability check you make that uses either of the chosen proficiencies. (Stealth, Thieves' Tools)",
        level: 1,
      },
      {
        name: "Sneak Attack",
        description: "Once per turn, you can deal an extra 1d6 damage to one creature you hit with an attack if you have advantage on the attack roll, or if another enemy of the target is within 5 feet of it. The attack must use a finesse or ranged weapon.",
        level: 1,
      },
      {
        name: "Thieves' Cant",
        description: "You have learned thieves' cant, a secret mix of dialect, jargon, and code that allows you to hide messages in seemingly normal conversation.",
        level: 1,
      },
      {
        name: "Cunning Action",
        description: "You can take a bonus action on each of your turns to take the Dash, Disengage, or Hide action.",
        level: 2,
      },
    ],
    recommendedAbilities: {
      dexterity: 15,
      intelligence: 14,
      constitution: 13,
      wisdom: 12,
      charisma: 10,
      strength: 8,
    },
  },

  cleric: {
    name: "cleric",
    displayName: "Cleric",
    description: "A priestly champion who wields divine magic in service of a higher power. Clerics can heal allies, harm foes, and turn the undead.",
    hitDie: "d8",
    primaryAbility: "wisdom",
    savingThrows: ["wisdom", "charisma"],
    skillChoices: ["history", "insight", "medicine", "persuasion", "religion"],
    numSkillChoices: 2,
    defaultSkills: ["medicine", "religion"],
    armorProficiencies: ["light", "medium", "shields"],
    weaponProficiencies: ["simple"],
    toolProficiencies: [],
    startingEquipment: ["mace", "scale_mail", "shield", "light_crossbow", "priests_pack", "holy_symbol"],
    startingGold: 10,
    spellcastingAbility: "wisdom",
    features: [
      {
        name: "Spellcasting",
        description: "You can cast cleric spells using Wisdom as your spellcasting ability. You know 3 cantrips and can prepare a number of spells equal to your Wisdom modifier + your cleric level.",
        level: 1,
      },
      {
        name: "Divine Domain: Life",
        description: "You have chosen the Life domain, granting you bonus proficiency with heavy armor and the Disciple of Life feature.",
        level: 1,
      },
      {
        name: "Disciple of Life",
        description: "Your healing spells are more effective. Whenever you use a spell of 1st level or higher to restore hit points, the creature regains additional hit points equal to 2 + the spell's level.",
        level: 1,
      },
      {
        name: "Channel Divinity",
        description: "You can channel divine energy to fuel magical effects. You start with Turn Undead and Preserve Life. You can use this feature once between rests.",
        level: 2,
        usesPerRest: { max: 1, current: 1, restType: "short" },
      },
    ],
    recommendedAbilities: {
      wisdom: 15,
      constitution: 14,
      strength: 13,
      dexterity: 12,
      intelligence: 10,
      charisma: 8,
    },
  },
};

// Spell slots by class and level
export function getSpellSlots(characterClass: CharacterClass, level: number): SpellSlots {
  const slots = createEmptySpellSlots();

  if (characterClass !== "wizard" && characterClass !== "cleric") {
    return slots; // Non-casters have no spell slots
  }

  // Full caster spell slot progression (Wizard and Cleric) - D&D 5e PHB
  const slotProgression: Record<number, number[]> = {
    1: [2],
    2: [3],
    3: [4, 2],
    4: [4, 3],
    5: [4, 3, 2],
    6: [4, 3, 3],
    7: [4, 3, 3, 1],
    8: [4, 3, 3, 2],
    9: [4, 3, 3, 3, 1],
    10: [4, 3, 3, 3, 2],
    11: [4, 3, 3, 3, 2, 1],
    12: [4, 3, 3, 3, 2, 1],
    13: [4, 3, 3, 3, 2, 1, 1],
    14: [4, 3, 3, 3, 2, 1, 1],
    15: [4, 3, 3, 3, 2, 1, 1, 1],
    16: [4, 3, 3, 3, 2, 1, 1, 1],
    17: [4, 3, 3, 3, 2, 1, 1, 1, 1],
    18: [4, 3, 3, 3, 3, 1, 1, 1, 1],
    19: [4, 3, 3, 3, 3, 2, 1, 1, 1],
    20: [4, 3, 3, 3, 3, 2, 2, 1, 1],
  };

  const levelSlots = slotProgression[Math.min(level, 20)] || [2];

  levelSlots.forEach((count, index) => {
    const slotLevel = (index + 1) as keyof SpellSlots;
    slots[slotLevel] = { max: count, current: count };
  });

  return slots;
}

// Calculate max HP at a given level
export function getMaxHp(characterClass: CharacterClass, level: number, conModifier: number): number {
  const hitDice: Record<CharacterClass, number> = {
    fighter: 10,
    wizard: 6,
    rogue: 8,
    cleric: 8,
  };

  const die = hitDice[characterClass];

  // Level 1: Max hit die + CON modifier
  let hp = die + conModifier;

  // Levels 2+: Average hit die roll (rounded up) + CON modifier per level
  const avgRoll = Math.ceil(die / 2) + 1;
  hp += (level - 1) * (avgRoll + conModifier);

  return Math.max(hp, 1); // Minimum 1 HP
}

// Get sneak attack dice for rogues
export function getSneakAttackDice(level: number): string {
  const dice = Math.ceil(level / 2);
  return `${dice}d6`;
}

// Check if a class has a specific feature at a given level
export function hasFeature(characterClass: CharacterClass, featureName: string, level: number): boolean {
  const classData = CLASSES[characterClass];
  return classData.features.some(f => f.name === featureName && f.level <= level);
}

// Get all features available at a given level
export function getFeaturesAtLevel(characterClass: CharacterClass, level: number): ClassFeature[] {
  return CLASSES[characterClass].features.filter(f => f.level <= level);
}
