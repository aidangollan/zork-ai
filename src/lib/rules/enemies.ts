// D&D 5e Enemy Stat Blocks

import { DamageType, Condition } from "../character";
import { Enemy, EnemyAttack } from "./combat";

export interface EnemyTemplate {
  name: string;
  maxHp: number;
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
  vulnerabilities?: DamageType[];
  resistances?: DamageType[];
  immunities?: DamageType[];
  conditionImmunities?: Condition[];
  traits?: EnemyTrait[];
  description: string;
}

export interface EnemyTrait {
  name: string;
  description: string;
}

// ============= ENEMY TEMPLATES =============

export const ENEMIES: Record<string, EnemyTemplate> = {
  // CR 1/8
  bandit: {
    name: "Bandit",
    maxHp: 11,
    armorClass: 12,
    speed: 30,
    abilities: {
      strength: 11,
      dexterity: 12,
      constitution: 12,
      intelligence: 10,
      wisdom: 10,
      charisma: 10,
    },
    attacks: [
      {
        name: "Scimitar",
        attackBonus: 3,
        damage: "1d6+1",
        damageType: "slashing",
      },
      {
        name: "Light Crossbow",
        attackBonus: 3,
        damage: "1d8+1",
        damageType: "piercing",
        range: { normal: 80, long: 320 },
      },
    ],
    challengeRating: 0.125,
    xpValue: 25,
    description: "A common thug or highway robber looking for easy prey.",
  },

  cultist: {
    name: "Cultist",
    maxHp: 9,
    armorClass: 12,
    speed: 30,
    abilities: {
      strength: 11,
      dexterity: 12,
      constitution: 10,
      intelligence: 10,
      wisdom: 11,
      charisma: 10,
    },
    attacks: [
      {
        name: "Scimitar",
        attackBonus: 3,
        damage: "1d6+1",
        damageType: "slashing",
      },
    ],
    challengeRating: 0.125,
    xpValue: 25,
    traits: [
      {
        name: "Dark Devotion",
        description: "The cultist has advantage on saving throws against being charmed or frightened.",
      },
    ],
    description: "A fanatical worshiper of dark powers.",
  },

  // CR 1/4
  goblin: {
    name: "Goblin",
    maxHp: 7,
    armorClass: 15,
    speed: 30,
    abilities: {
      strength: 8,
      dexterity: 14,
      constitution: 10,
      intelligence: 10,
      wisdom: 8,
      charisma: 8,
    },
    attacks: [
      {
        name: "Scimitar",
        attackBonus: 4,
        damage: "1d6+2",
        damageType: "slashing",
      },
      {
        name: "Shortbow",
        attackBonus: 4,
        damage: "1d6+2",
        damageType: "piercing",
        range: { normal: 80, long: 320 },
      },
    ],
    challengeRating: 0.25,
    xpValue: 50,
    traits: [
      {
        name: "Nimble Escape",
        description: "The goblin can take the Disengage or Hide action as a bonus action on each of its turns.",
      },
    ],
    description: "A small, black-hearted humanoid that lair in despoiled dungeons and other dismal settings.",
  },

  skeleton: {
    name: "Skeleton",
    maxHp: 13,
    armorClass: 13,
    speed: 30,
    abilities: {
      strength: 10,
      dexterity: 14,
      constitution: 15,
      intelligence: 6,
      wisdom: 8,
      charisma: 5,
    },
    attacks: [
      {
        name: "Shortsword",
        attackBonus: 4,
        damage: "1d6+2",
        damageType: "piercing",
      },
      {
        name: "Shortbow",
        attackBonus: 4,
        damage: "1d6+2",
        damageType: "piercing",
        range: { normal: 80, long: 320 },
      },
    ],
    challengeRating: 0.25,
    xpValue: 50,
    vulnerabilities: ["bludgeoning"],
    immunities: ["poison"],
    conditionImmunities: ["exhaustion", "poisoned"],
    description: "Animated bones held together by dark magic, a skeleton fights until destroyed.",
  },

  wolf: {
    name: "Wolf",
    maxHp: 11,
    armorClass: 13,
    speed: 40,
    abilities: {
      strength: 12,
      dexterity: 15,
      constitution: 12,
      intelligence: 3,
      wisdom: 12,
      charisma: 6,
    },
    attacks: [
      {
        name: "Bite",
        attackBonus: 4,
        damage: "2d4+2",
        damageType: "piercing",
        description: "If the target is a creature, it must succeed on a DC 11 Strength saving throw or be knocked prone.",
      },
    ],
    challengeRating: 0.25,
    xpValue: 50,
    traits: [
      {
        name: "Keen Hearing and Smell",
        description: "The wolf has advantage on Wisdom (Perception) checks that rely on hearing or smell.",
      },
      {
        name: "Pack Tactics",
        description: "The wolf has advantage on attack rolls against a creature if at least one of the wolf's allies is within 5 feet of the creature and the ally isn't incapacitated.",
      },
    ],
    description: "A fierce predator that hunts in packs.",
  },

  zombie: {
    name: "Zombie",
    maxHp: 22,
    armorClass: 8,
    speed: 20,
    abilities: {
      strength: 13,
      dexterity: 6,
      constitution: 16,
      intelligence: 3,
      wisdom: 6,
      charisma: 5,
    },
    attacks: [
      {
        name: "Slam",
        attackBonus: 3,
        damage: "1d6+1",
        damageType: "bludgeoning",
      },
    ],
    challengeRating: 0.25,
    xpValue: 50,
    immunities: ["poison"],
    conditionImmunities: ["poisoned"],
    traits: [
      {
        name: "Undead Fortitude",
        description: "If damage reduces the zombie to 0 hit points, it must make a Constitution saving throw with a DC of 5 + the damage taken, unless the damage is radiant or from a critical hit. On a success, the zombie drops to 1 hit point instead.",
      },
    ],
    description: "A shambling corpse animated by dark magic.",
  },

  // CR 1/2
  orc: {
    name: "Orc",
    maxHp: 15,
    armorClass: 13,
    speed: 30,
    abilities: {
      strength: 16,
      dexterity: 12,
      constitution: 16,
      intelligence: 7,
      wisdom: 11,
      charisma: 10,
    },
    attacks: [
      {
        name: "Greataxe",
        attackBonus: 5,
        damage: "1d12+3",
        damageType: "slashing",
      },
      {
        name: "Javelin",
        attackBonus: 5,
        damage: "1d6+3",
        damageType: "piercing",
        range: { normal: 30, long: 120 },
      },
    ],
    challengeRating: 0.5,
    xpValue: 100,
    traits: [
      {
        name: "Aggressive",
        description: "As a bonus action, the orc can move up to its speed toward a hostile creature it can see.",
      },
    ],
    description: "A savage raider with a love of battle.",
  },

  hobgoblin: {
    name: "Hobgoblin",
    maxHp: 11,
    armorClass: 18,
    speed: 30,
    abilities: {
      strength: 13,
      dexterity: 12,
      constitution: 12,
      intelligence: 10,
      wisdom: 10,
      charisma: 9,
    },
    attacks: [
      {
        name: "Longsword",
        attackBonus: 3,
        damage: "1d8+1",
        damageType: "slashing",
      },
      {
        name: "Longbow",
        attackBonus: 3,
        damage: "1d8+1",
        damageType: "piercing",
        range: { normal: 150, long: 600 },
      },
    ],
    challengeRating: 0.5,
    xpValue: 100,
    traits: [
      {
        name: "Martial Advantage",
        description: "Once per turn, the hobgoblin can deal an extra 2d6 damage to a creature it hits with a weapon attack if that creature is within 5 feet of an ally of the hobgoblin that isn't incapacitated.",
      },
    ],
    description: "A disciplined and organized goblinoid warrior.",
  },

  // CR 1
  bugbear: {
    name: "Bugbear",
    maxHp: 27,
    armorClass: 16,
    speed: 30,
    abilities: {
      strength: 15,
      dexterity: 14,
      constitution: 13,
      intelligence: 8,
      wisdom: 11,
      charisma: 9,
    },
    attacks: [
      {
        name: "Morningstar",
        attackBonus: 4,
        damage: "2d8+2",
        damageType: "piercing",
      },
      {
        name: "Javelin",
        attackBonus: 4,
        damage: "2d6+2",
        damageType: "piercing",
        range: { normal: 30, long: 120 },
      },
    ],
    challengeRating: 1,
    xpValue: 200,
    traits: [
      {
        name: "Brute",
        description: "A melee weapon deals one extra die of its damage when the bugbear hits with it (included in the attack).",
      },
      {
        name: "Surprise Attack",
        description: "If the bugbear surprises a creature and hits it with an attack during the first round of combat, the target takes an extra 2d6 damage from the attack.",
      },
    ],
    description: "A massive goblinoid that loves ambushes and sneak attacks.",
  },

  ghoul: {
    name: "Ghoul",
    maxHp: 22,
    armorClass: 12,
    speed: 30,
    abilities: {
      strength: 13,
      dexterity: 15,
      constitution: 10,
      intelligence: 7,
      wisdom: 10,
      charisma: 6,
    },
    attacks: [
      {
        name: "Bite",
        attackBonus: 2,
        damage: "2d6+2",
        damageType: "piercing",
      },
      {
        name: "Claws",
        attackBonus: 4,
        damage: "2d4+2",
        damageType: "slashing",
        description: "If the target is a creature other than an elf or undead, it must succeed on a DC 10 Constitution saving throw or be paralyzed for 1 minute.",
      },
    ],
    challengeRating: 1,
    xpValue: 200,
    immunities: ["poison"],
    conditionImmunities: ["charmed", "exhaustion", "poisoned"],
    description: "A undead creature that craves flesh and can paralyze with its touch.",
  },

  // CR 2
  ogre: {
    name: "Ogre",
    maxHp: 59,
    armorClass: 11,
    speed: 40,
    abilities: {
      strength: 19,
      dexterity: 8,
      constitution: 16,
      intelligence: 5,
      wisdom: 7,
      charisma: 7,
    },
    attacks: [
      {
        name: "Greatclub",
        attackBonus: 6,
        damage: "2d8+4",
        damageType: "bludgeoning",
      },
      {
        name: "Javelin",
        attackBonus: 6,
        damage: "2d6+4",
        damageType: "piercing",
        range: { normal: 30, long: 120 },
      },
    ],
    challengeRating: 2,
    xpValue: 450,
    description: "A hulking giant that uses brute force to overwhelm foes.",
  },

  // CR 3
  owlbear: {
    name: "Owlbear",
    maxHp: 59,
    armorClass: 13,
    speed: 40,
    abilities: {
      strength: 20,
      dexterity: 12,
      constitution: 17,
      intelligence: 3,
      wisdom: 12,
      charisma: 7,
    },
    attacks: [
      {
        name: "Beak",
        attackBonus: 7,
        damage: "1d10+5",
        damageType: "piercing",
      },
      {
        name: "Claws",
        attackBonus: 7,
        damage: "2d8+5",
        damageType: "slashing",
      },
    ],
    challengeRating: 3,
    xpValue: 700,
    traits: [
      {
        name: "Keen Sight and Smell",
        description: "The owlbear has advantage on Wisdom (Perception) checks that rely on sight or smell.",
      },
    ],
    description: "A monstrous cross between a giant owl and a bear, known for its ferocity.",
  },

  // Boss enemies with special abilities
  goblin_boss: {
    name: "Goblin Boss",
    maxHp: 21,
    armorClass: 17,
    speed: 30,
    abilities: {
      strength: 10,
      dexterity: 14,
      constitution: 10,
      intelligence: 10,
      wisdom: 8,
      charisma: 10,
    },
    attacks: [
      {
        name: "Scimitar",
        attackBonus: 4,
        damage: "1d6+2",
        damageType: "slashing",
      },
      {
        name: "Javelin",
        attackBonus: 2,
        damage: "1d6",
        damageType: "piercing",
        range: { normal: 30, long: 120 },
      },
    ],
    challengeRating: 1,
    xpValue: 200,
    traits: [
      {
        name: "Nimble Escape",
        description: "The goblin can take the Disengage or Hide action as a bonus action on each of its turns.",
      },
      {
        name: "Redirect Attack",
        description: "When a creature the goblin boss can see targets it with an attack, the goblin boss chooses another goblin within 5 feet of it. The two goblins swap places, and the chosen goblin becomes the target instead.",
      },
    ],
    description: "A cunning goblin leader who uses minions as shields.",
  },

  orc_war_chief: {
    name: "Orc War Chief",
    maxHp: 93,
    armorClass: 16,
    speed: 30,
    abilities: {
      strength: 18,
      dexterity: 12,
      constitution: 18,
      intelligence: 11,
      wisdom: 11,
      charisma: 16,
    },
    attacks: [
      {
        name: "Greataxe",
        attackBonus: 6,
        damage: "1d12+4",
        damageType: "slashing",
      },
      {
        name: "Spear",
        attackBonus: 6,
        damage: "1d6+4",
        damageType: "piercing",
        range: { normal: 20, long: 60 },
      },
    ],
    challengeRating: 4,
    xpValue: 1100,
    traits: [
      {
        name: "Aggressive",
        description: "As a bonus action, the orc can move up to its speed toward a hostile creature it can see.",
      },
      {
        name: "Gruumsh's Fury",
        description: "The orc deals an extra 1d8 damage when it hits with a weapon attack (included in the attack).",
      },
      {
        name: "Battle Cry",
        description: "Each creature of the war chief's choice that is within 30 feet of it and can hear it, gains advantage on attack rolls until the start of the war chief's next turn. The war chief can use this once per combat.",
      },
    ],
    description: "A fearsome orc leader who inspires fury in their warriors.",
  },
};

// ============= HELPER FUNCTIONS =============

let enemyIdCounter = 0;

/**
 * Create an enemy instance from a template
 */
export function createEnemy(templateId: string): Enemy | null {
  const template = ENEMIES[templateId];
  if (!template) return null;

  enemyIdCounter++;

  return {
    id: `enemy_${templateId}_${enemyIdCounter}`,
    name: template.name,
    maxHp: template.maxHp,
    currentHp: template.maxHp,
    armorClass: template.armorClass,
    speed: template.speed,
    abilities: { ...template.abilities },
    attacks: [...template.attacks],
    challengeRating: template.challengeRating,
    xpValue: template.xpValue,
    conditions: [],
    vulnerabilities: template.vulnerabilities ? [...template.vulnerabilities] : undefined,
    resistances: template.resistances ? [...template.resistances] : undefined,
    immunities: template.immunities ? [...template.immunities] : undefined,
  };
}

/**
 * Create multiple enemies from a template
 */
export function createEnemyGroup(templateId: string, count: number): Enemy[] {
  const enemies: Enemy[] = [];
  for (let i = 0; i < count; i++) {
    const enemy = createEnemy(templateId);
    if (enemy) {
      // Add a letter suffix to distinguish multiple enemies
      enemy.name = `${enemy.name} ${String.fromCharCode(65 + i)}`; // A, B, C, etc.
      enemies.push(enemy);
    }
  }
  return enemies;
}

/**
 * Get recommended encounter difficulty for party level
 */
export function getEncounterDifficulty(
  partyLevel: number,
  partySize: number,
  totalCR: number
): "trivial" | "easy" | "medium" | "hard" | "deadly" {
  // XP thresholds per character per level (simplified)
  const thresholds: Record<number, { easy: number; medium: number; hard: number; deadly: number }> = {
    1: { easy: 25, medium: 50, hard: 75, deadly: 100 },
    2: { easy: 50, medium: 100, hard: 150, deadly: 200 },
    3: { easy: 75, medium: 150, hard: 225, deadly: 400 },
    4: { easy: 125, medium: 250, hard: 375, deadly: 500 },
    5: { easy: 250, medium: 500, hard: 750, deadly: 1100 },
  };

  const level = Math.min(Math.max(partyLevel, 1), 5);
  const partyThresholds = thresholds[level];

  // Convert CR to XP (rough approximation)
  const crToXP: Record<number, number> = {
    0.125: 25,
    0.25: 50,
    0.5: 100,
    1: 200,
    2: 450,
    3: 700,
    4: 1100,
    5: 1800,
  };

  const encounterXP = crToXP[totalCR] || totalCR * 200;
  const adjustedXP = encounterXP / partySize;

  if (adjustedXP >= partyThresholds.deadly) return "deadly";
  if (adjustedXP >= partyThresholds.hard) return "hard";
  if (adjustedXP >= partyThresholds.medium) return "medium";
  if (adjustedXP >= partyThresholds.easy) return "easy";
  return "trivial";
}

/**
 * Get a random enemy suitable for party level
 */
export function getRandomEnemyForLevel(partyLevel: number): string {
  const suitableEnemies: Record<number, string[]> = {
    1: ["goblin", "skeleton", "bandit", "cultist", "zombie"],
    2: ["goblin", "skeleton", "orc", "hobgoblin", "wolf"],
    3: ["orc", "hobgoblin", "bugbear", "ghoul", "goblin_boss"],
    4: ["bugbear", "ghoul", "ogre", "orc_war_chief"],
    5: ["ogre", "owlbear", "orc_war_chief"],
  };

  const level = Math.min(Math.max(partyLevel, 1), 5);
  const options = suitableEnemies[level];
  return options[Math.floor(Math.random() * options.length)];
}

/**
 * Get all enemies sorted by CR
 */
export function getAllEnemiesByCR(): EnemyTemplate[] {
  return Object.values(ENEMIES).sort((a, b) => a.challengeRating - b.challengeRating);
}

/**
 * Format enemy stat block for display
 */
export function formatEnemyStatBlock(template: EnemyTemplate): string {
  let str = `**${template.name}** (CR ${template.challengeRating})\n`;
  str += `HP: ${template.maxHp} | AC: ${template.armorClass} | Speed: ${template.speed} ft.\n`;
  str += `STR ${template.abilities.strength} DEX ${template.abilities.dexterity} CON ${template.abilities.constitution} `;
  str += `INT ${template.abilities.intelligence} WIS ${template.abilities.wisdom} CHA ${template.abilities.charisma}\n`;

  if (template.vulnerabilities?.length) {
    str += `Vulnerabilities: ${template.vulnerabilities.join(", ")}\n`;
  }
  if (template.resistances?.length) {
    str += `Resistances: ${template.resistances.join(", ")}\n`;
  }
  if (template.immunities?.length) {
    str += `Immunities: ${template.immunities.join(", ")}\n`;
  }

  str += "\nAttacks:\n";
  for (const attack of template.attacks) {
    str += `  - ${attack.name}: +${attack.attackBonus} to hit, ${attack.damage} ${attack.damageType}`;
    if (attack.range) {
      str += ` (range ${attack.range.normal}/${attack.range.long} ft.)`;
    }
    str += "\n";
  }

  if (template.traits?.length) {
    str += "\nTraits:\n";
    for (const trait of template.traits) {
      str += `  - ${trait.name}: ${trait.description}\n`;
    }
  }

  return str;
}
