// D&D 5e Equipment Database

import {
  InventoryItem,
  Weapon,
  Armor,
  WeaponProperty,
  DamageType,
} from "../character";

// ============= WEAPONS =============

export const WEAPONS: Record<string, Weapon> = {
  // Simple Melee Weapons
  club: {
    id: "club",
    name: "Club",
    type: "weapon",
    damage: "1d4",
    damageType: "bludgeoning",
    properties: ["light"],
    weight: 2,
    quantity: 1,
  },
  dagger: {
    id: "dagger",
    name: "Dagger",
    type: "weapon",
    damage: "1d4",
    damageType: "piercing",
    properties: ["finesse", "light", "thrown"],
    range: { normal: 20, long: 60 },
    finesse: true,
    weight: 1,
    quantity: 1,
  },
  handaxe: {
    id: "handaxe",
    name: "Handaxe",
    type: "weapon",
    damage: "1d6",
    damageType: "slashing",
    properties: ["light", "thrown"],
    range: { normal: 20, long: 60 },
    weight: 2,
    quantity: 1,
  },
  javelin: {
    id: "javelin",
    name: "Javelin",
    type: "weapon",
    damage: "1d6",
    damageType: "piercing",
    properties: ["thrown"],
    range: { normal: 30, long: 120 },
    weight: 2,
    quantity: 1,
  },
  mace: {
    id: "mace",
    name: "Mace",
    type: "weapon",
    damage: "1d6",
    damageType: "bludgeoning",
    properties: [],
    weight: 4,
    quantity: 1,
  },
  quarterstaff: {
    id: "quarterstaff",
    name: "Quarterstaff",
    type: "weapon",
    damage: "1d6",
    damageType: "bludgeoning",
    properties: ["versatile"],
    versatileDamage: "1d8",
    weight: 4,
    quantity: 1,
  },
  spear: {
    id: "spear",
    name: "Spear",
    type: "weapon",
    damage: "1d6",
    damageType: "piercing",
    properties: ["thrown", "versatile"],
    range: { normal: 20, long: 60 },
    versatileDamage: "1d8",
    weight: 3,
    quantity: 1,
  },

  // Simple Ranged Weapons
  light_crossbow: {
    id: "light_crossbow",
    name: "Light Crossbow",
    type: "weapon",
    damage: "1d8",
    damageType: "piercing",
    properties: ["ammunition", "loading", "two-handed"],
    range: { normal: 80, long: 320 },
    weight: 5,
    quantity: 1,
  },
  shortbow: {
    id: "shortbow",
    name: "Shortbow",
    type: "weapon",
    damage: "1d6",
    damageType: "piercing",
    properties: ["ammunition", "two-handed"],
    range: { normal: 80, long: 320 },
    weight: 2,
    quantity: 1,
  },

  // Martial Melee Weapons
  battleaxe: {
    id: "battleaxe",
    name: "Battleaxe",
    type: "weapon",
    damage: "1d8",
    damageType: "slashing",
    properties: ["versatile"],
    versatileDamage: "1d10",
    weight: 4,
    quantity: 1,
  },
  greatsword: {
    id: "greatsword",
    name: "Greatsword",
    type: "weapon",
    damage: "2d6",
    damageType: "slashing",
    properties: ["heavy", "two-handed"],
    weight: 6,
    quantity: 1,
  },
  longsword: {
    id: "longsword",
    name: "Longsword",
    type: "weapon",
    damage: "1d8",
    damageType: "slashing",
    properties: ["versatile"],
    versatileDamage: "1d10",
    weight: 3,
    quantity: 1,
  },
  rapier: {
    id: "rapier",
    name: "Rapier",
    type: "weapon",
    damage: "1d8",
    damageType: "piercing",
    properties: ["finesse"],
    finesse: true,
    weight: 2,
    quantity: 1,
  },
  shortsword: {
    id: "shortsword",
    name: "Shortsword",
    type: "weapon",
    damage: "1d6",
    damageType: "piercing",
    properties: ["finesse", "light"],
    finesse: true,
    weight: 2,
    quantity: 1,
  },
  warhammer: {
    id: "warhammer",
    name: "Warhammer",
    type: "weapon",
    damage: "1d8",
    damageType: "bludgeoning",
    properties: ["versatile"],
    versatileDamage: "1d10",
    weight: 2,
    quantity: 1,
  },

  // Martial Ranged Weapons
  longbow: {
    id: "longbow",
    name: "Longbow",
    type: "weapon",
    damage: "1d8",
    damageType: "piercing",
    properties: ["ammunition", "heavy", "two-handed"],
    range: { normal: 150, long: 600 },
    weight: 2,
    quantity: 1,
  },
  hand_crossbow: {
    id: "hand_crossbow",
    name: "Hand Crossbow",
    type: "weapon",
    damage: "1d6",
    damageType: "piercing",
    properties: ["ammunition", "light", "loading"],
    range: { normal: 30, long: 120 },
    weight: 3,
    quantity: 1,
  },
};

// ============= ARMOR =============

export const ARMOR: Record<string, Armor> = {
  // Light Armor
  padded: {
    id: "padded",
    name: "Padded Armor",
    type: "armor",
    armorType: "light",
    baseAC: 11,
    stealthDisadvantage: true,
    weight: 8,
    quantity: 1,
  },
  leather_armor: {
    id: "leather_armor",
    name: "Leather Armor",
    type: "armor",
    armorType: "light",
    baseAC: 11,
    stealthDisadvantage: false,
    weight: 10,
    quantity: 1,
  },
  studded_leather: {
    id: "studded_leather",
    name: "Studded Leather",
    type: "armor",
    armorType: "light",
    baseAC: 12,
    stealthDisadvantage: false,
    weight: 13,
    quantity: 1,
  },

  // Medium Armor
  hide_armor: {
    id: "hide_armor",
    name: "Hide Armor",
    type: "armor",
    armorType: "medium",
    baseAC: 12,
    maxDexBonus: 2,
    stealthDisadvantage: false,
    weight: 12,
    quantity: 1,
  },
  chain_shirt: {
    id: "chain_shirt",
    name: "Chain Shirt",
    type: "armor",
    armorType: "medium",
    baseAC: 13,
    maxDexBonus: 2,
    stealthDisadvantage: false,
    weight: 20,
    quantity: 1,
  },
  scale_mail: {
    id: "scale_mail",
    name: "Scale Mail",
    type: "armor",
    armorType: "medium",
    baseAC: 14,
    maxDexBonus: 2,
    stealthDisadvantage: true,
    weight: 45,
    quantity: 1,
  },
  breastplate: {
    id: "breastplate",
    name: "Breastplate",
    type: "armor",
    armorType: "medium",
    baseAC: 14,
    maxDexBonus: 2,
    stealthDisadvantage: false,
    weight: 20,
    quantity: 1,
  },
  half_plate: {
    id: "half_plate",
    name: "Half Plate",
    type: "armor",
    armorType: "medium",
    baseAC: 15,
    maxDexBonus: 2,
    stealthDisadvantage: true,
    weight: 40,
    quantity: 1,
  },

  // Heavy Armor
  ring_mail: {
    id: "ring_mail",
    name: "Ring Mail",
    type: "armor",
    armorType: "heavy",
    baseAC: 14,
    maxDexBonus: 0,
    stealthDisadvantage: true,
    weight: 40,
    quantity: 1,
  },
  chain_mail: {
    id: "chain_mail",
    name: "Chain Mail",
    type: "armor",
    armorType: "heavy",
    baseAC: 16,
    maxDexBonus: 0,
    stealthDisadvantage: true,
    strengthRequirement: 13,
    weight: 55,
    quantity: 1,
  },
  splint: {
    id: "splint",
    name: "Splint",
    type: "armor",
    armorType: "heavy",
    baseAC: 17,
    maxDexBonus: 0,
    stealthDisadvantage: true,
    strengthRequirement: 15,
    weight: 60,
    quantity: 1,
  },
  plate: {
    id: "plate",
    name: "Plate Armor",
    type: "armor",
    armorType: "heavy",
    baseAC: 18,
    maxDexBonus: 0,
    stealthDisadvantage: true,
    strengthRequirement: 15,
    weight: 65,
    quantity: 1,
  },

  // Shield
  shield: {
    id: "shield",
    name: "Shield",
    type: "armor",
    armorType: "shield",
    baseAC: 2,  // +2 to AC
    stealthDisadvantage: false,
    weight: 6,
    quantity: 1,
  },
};

// ============= GEAR =============

export const GEAR: Record<string, InventoryItem> = {
  // Packs
  explorers_pack: {
    id: "explorers_pack",
    name: "Explorer's Pack",
    type: "gear",
    weight: 59,
    quantity: 1,
    description: "Includes a backpack, bedroll, mess kit, tinderbox, 10 torches, 10 days of rations, and a waterskin.",
  },
  scholars_pack: {
    id: "scholars_pack",
    name: "Scholar's Pack",
    type: "gear",
    weight: 10,
    quantity: 1,
    description: "Includes a backpack, book of lore, ink and pen, 10 sheets of parchment, a bag of sand, and a small knife.",
  },
  burglars_pack: {
    id: "burglars_pack",
    name: "Burglar's Pack",
    type: "gear",
    weight: 44,
    quantity: 1,
    description: "Includes a backpack, ball bearings, string, bell, 5 candles, crowbar, hammer, 10 pitons, hooded lantern, 2 oil flasks, 5 days rations, tinderbox, and a waterskin.",
  },
  priests_pack: {
    id: "priests_pack",
    name: "Priest's Pack",
    type: "gear",
    weight: 25,
    quantity: 1,
    description: "Includes a backpack, blanket, 10 candles, tinderbox, alms box, 2 blocks of incense, censer, vestments, 2 days of rations, and a waterskin.",
  },

  // Tools
  thieves_tools: {
    id: "thieves_tools",
    name: "Thieves' Tools",
    type: "tool",
    weight: 1,
    quantity: 1,
    description: "This set of tools includes a small file, lock picks, a small mirror, narrow-bladed scissors, and pliers.",
  },

  // Misc Gear
  component_pouch: {
    id: "component_pouch",
    name: "Component Pouch",
    type: "gear",
    weight: 2,
    quantity: 1,
    description: "A small, watertight leather belt pouch with compartments for spell components.",
  },
  spellbook: {
    id: "spellbook",
    name: "Spellbook",
    type: "gear",
    weight: 3,
    quantity: 1,
    description: "Essential for wizards, this leather-bound book holds your spells.",
  },
  holy_symbol: {
    id: "holy_symbol",
    name: "Holy Symbol",
    type: "gear",
    weight: 1,
    quantity: 1,
    description: "A representation of a god or pantheon, used as a spellcasting focus for clerics.",
  },

  // Potions
  potion_healing: {
    id: "potion_healing",
    name: "Potion of Healing",
    type: "potion",
    weight: 0.5,
    quantity: 1,
    description: "Drink to regain 2d4+2 hit points.",
  },
  potion_greater_healing: {
    id: "potion_greater_healing",
    name: "Potion of Greater Healing",
    type: "potion",
    weight: 0.5,
    quantity: 1,
    description: "Drink to regain 4d4+4 hit points.",
  },

  // Ammunition
  arrows: {
    id: "arrows",
    name: "Arrows (20)",
    type: "gear",
    weight: 1,
    quantity: 20,
    description: "Ammunition for bows.",
  },
  crossbow_bolts: {
    id: "crossbow_bolts",
    name: "Crossbow Bolts (20)",
    type: "gear",
    weight: 1.5,
    quantity: 20,
    description: "Ammunition for crossbows.",
  },
};

// ============= HELPER FUNCTIONS =============

export function createWeapon(id: string): Weapon | null {
  return WEAPONS[id] ? { ...WEAPONS[id] } : null;
}

export function createArmor(id: string): Armor | null {
  return ARMOR[id] ? { ...ARMOR[id] } : null;
}

export function createGear(id: string): InventoryItem | null {
  return GEAR[id] ? { ...GEAR[id] } : null;
}

export function getItem(id: string): InventoryItem | null {
  return WEAPONS[id] || ARMOR[id] || GEAR[id] || null;
}

export function isWeapon(item: InventoryItem): item is Weapon {
  return item.type === "weapon";
}

export function isArmor(item: InventoryItem): item is Armor {
  return item.type === "armor";
}

export function isFinesse(weapon: Weapon): boolean {
  return weapon.properties.includes("finesse");
}

export function isTwoHanded(weapon: Weapon): boolean {
  return weapon.properties.includes("two-handed");
}

export function isRanged(weapon: Weapon): boolean {
  return weapon.range !== undefined;
}

export function isVersatile(weapon: Weapon): boolean {
  return weapon.properties.includes("versatile");
}

/**
 * Get the starting equipment for a class
 */
export function getStartingEquipment(equipmentIds: string[]): InventoryItem[] {
  return equipmentIds
    .map(id => getItem(id))
    .filter((item): item is InventoryItem => item !== null);
}
