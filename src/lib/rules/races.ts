// D&D 5e Race Definitions

import { Race, Abilities, Ability, Skill } from "../character";

export interface RaceDefinition {
  name: Race;
  displayName: string;
  description: string;
  abilityScoreIncrease: Partial<Abilities>;
  speed: number;
  size: "small" | "medium";
  languages: string[];
  traits: RaceTrait[];
  skillProficiencies?: Skill[];
  darkvision?: number;  // Range in feet, undefined if none
}

export interface RaceTrait {
  name: string;
  description: string;
}

export const RACES: Record<Race, RaceDefinition> = {
  human: {
    name: "human",
    displayName: "Human",
    description: "Humans are the most adaptable and ambitious of the common races. They are known for their tenacity, creativity, and endless capacity for growth.",
    abilityScoreIncrease: {
      strength: 1,
      dexterity: 1,
      constitution: 1,
      intelligence: 1,
      wisdom: 1,
      charisma: 1,
    },
    speed: 30,
    size: "medium",
    languages: ["Common", "one additional language of your choice"],
    traits: [
      {
        name: "Versatile",
        description: "Humans gain +1 to all ability scores, reflecting their diverse nature and adaptability.",
      },
    ],
  },

  elf: {
    name: "elf",
    displayName: "Elf",
    description: "Elves are a magical people of otherworldly grace, living in places of ethereal beauty. They are known for their long lives, keen senses, and affinity for nature and magic.",
    abilityScoreIncrease: {
      dexterity: 2,
      intelligence: 1,  // High Elf variant
    },
    speed: 30,
    size: "medium",
    languages: ["Common", "Elvish"],
    darkvision: 60,
    skillProficiencies: ["perception"],
    traits: [
      {
        name: "Darkvision",
        description: "You can see in dim light within 60 feet as if it were bright light, and in darkness as if it were dim light.",
      },
      {
        name: "Keen Senses",
        description: "You have proficiency in the Perception skill.",
      },
      {
        name: "Fey Ancestry",
        description: "You have advantage on saving throws against being charmed, and magic can't put you to sleep.",
      },
      {
        name: "Trance",
        description: "Elves don't need to sleep. Instead, they meditate deeply for 4 hours a day, gaining the same benefit that a human does from 8 hours of sleep.",
      },
      {
        name: "Elf Weapon Training",
        description: "You have proficiency with longswords, shortswords, shortbows, and longbows.",
      },
      {
        name: "Cantrip",
        description: "You know one cantrip of your choice from the wizard spell list. Intelligence is your spellcasting ability for it.",
      },
    ],
  },

  dwarf: {
    name: "dwarf",
    displayName: "Dwarf",
    description: "Bold and hardy, dwarves are known as skilled warriors, miners, and workers of stone and metal. They stand around 4-5 feet tall but are broad and compact.",
    abilityScoreIncrease: {
      constitution: 2,
      strength: 2,  // Mountain Dwarf variant
    },
    speed: 25,
    size: "medium",
    languages: ["Common", "Dwarvish"],
    darkvision: 60,
    traits: [
      {
        name: "Darkvision",
        description: "You can see in dim light within 60 feet as if it were bright light, and in darkness as if it were dim light.",
      },
      {
        name: "Dwarven Resilience",
        description: "You have advantage on saving throws against poison, and you have resistance against poison damage.",
      },
      {
        name: "Dwarven Combat Training",
        description: "You have proficiency with the battleaxe, handaxe, light hammer, and warhammer.",
      },
      {
        name: "Tool Proficiency",
        description: "You gain proficiency with the artisan's tools of your choice: smith's tools, brewer's supplies, or mason's tools.",
      },
      {
        name: "Stonecunning",
        description: "Whenever you make an Intelligence (History) check related to the origin of stonework, you are considered proficient and add double your proficiency bonus.",
      },
      {
        name: "Dwarven Armor Training",
        description: "You have proficiency with light and medium armor.",
      },
    ],
  },

  halfling: {
    name: "halfling",
    displayName: "Halfling",
    description: "The diminutive halflings survive in a world full of larger creatures by avoiding notice or, failing that, avoiding offense. Standing about 3 feet tall, they are nimble and lucky.",
    abilityScoreIncrease: {
      dexterity: 2,
      charisma: 1,  // Lightfoot variant
    },
    speed: 25,
    size: "small",
    languages: ["Common", "Halfling"],
    traits: [
      {
        name: "Lucky",
        description: "When you roll a 1 on the d20 for an attack roll, ability check, or saving throw, you can reroll the die and must use the new roll.",
      },
      {
        name: "Brave",
        description: "You have advantage on saving throws against being frightened.",
      },
      {
        name: "Halfling Nimbleness",
        description: "You can move through the space of any creature that is of a size larger than yours.",
      },
      {
        name: "Naturally Stealthy",
        description: "You can attempt to hide even when you are obscured only by a creature that is at least one size larger than you.",
      },
    ],
  },
};

/**
 * Apply racial ability score bonuses to base abilities
 */
export function applyRacialBonuses(baseAbilities: Abilities, race: Race): Abilities {
  const raceData = RACES[race];
  const bonuses = raceData.abilityScoreIncrease;

  return {
    strength: baseAbilities.strength + (bonuses.strength || 0),
    dexterity: baseAbilities.dexterity + (bonuses.dexterity || 0),
    constitution: baseAbilities.constitution + (bonuses.constitution || 0),
    intelligence: baseAbilities.intelligence + (bonuses.intelligence || 0),
    wisdom: baseAbilities.wisdom + (bonuses.wisdom || 0),
    charisma: baseAbilities.charisma + (bonuses.charisma || 0),
  };
}

/**
 * Get the speed for a race
 */
export function getRaceSpeed(race: Race): number {
  return RACES[race].speed;
}

/**
 * Get languages for a race
 */
export function getRaceLanguages(race: Race): string[] {
  return [...RACES[race].languages];
}

/**
 * Get darkvision range for a race (0 if none)
 */
export function getDarkvision(race: Race): number {
  return RACES[race].darkvision || 0;
}

/**
 * Check if a race has a specific trait
 */
export function hasTrait(race: Race, traitName: string): boolean {
  return RACES[race].traits.some(t => t.name.toLowerCase() === traitName.toLowerCase());
}

/**
 * Get all traits for a race
 */
export function getRaceTraits(race: Race): RaceTrait[] {
  return [...RACES[race].traits];
}
