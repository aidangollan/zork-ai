// D&D 5e Spell System

import { Spell, SpellSchool, Character, Ability, DamageType, getModifier } from "../character";
import { roll, RollResult } from "./dice";

// ============= CANTRIPS =============

export const CANTRIPS: Record<string, Spell> = {
  // Wizard Cantrips
  fire_bolt: {
    id: "fire_bolt",
    name: "Fire Bolt",
    level: 0,
    school: "evocation",
    castingTime: "1 action",
    range: "120 feet",
    components: "V, S",
    duration: "Instantaneous",
    concentration: false,
    description: "You hurl a mote of fire at a creature or object within range. Make a ranged spell attack. On a hit, the target takes 1d10 fire damage.",
    damage: "1d10",
    damageType: "fire",
  },
  ray_of_frost: {
    id: "ray_of_frost",
    name: "Ray of Frost",
    level: 0,
    school: "evocation",
    castingTime: "1 action",
    range: "60 feet",
    components: "V, S",
    duration: "Instantaneous",
    concentration: false,
    description: "A frigid beam of blue-white light streaks toward a creature. Make a ranged spell attack. On a hit, it takes 1d8 cold damage, and its speed is reduced by 10 feet until the start of your next turn.",
    damage: "1d8",
    damageType: "cold",
  },
  light: {
    id: "light",
    name: "Light",
    level: 0,
    school: "evocation",
    castingTime: "1 action",
    range: "Touch",
    components: "V, M (a firefly or phosphorescent moss)",
    duration: "1 hour",
    concentration: false,
    description: "You touch one object that is no larger than 10 feet in any dimension. The object sheds bright light in a 20-foot radius and dim light for an additional 20 feet.",
  },
  mage_hand: {
    id: "mage_hand",
    name: "Mage Hand",
    level: 0,
    school: "conjuration",
    castingTime: "1 action",
    range: "30 feet",
    components: "V, S",
    duration: "1 minute",
    concentration: false,
    description: "A spectral, floating hand appears at a point you choose within range. You can use the hand to manipulate an object, open an unlocked door, or pour out the contents of a vial.",
  },
  prestidigitation: {
    id: "prestidigitation",
    name: "Prestidigitation",
    level: 0,
    school: "transmutation",
    castingTime: "1 action",
    range: "10 feet",
    components: "V, S",
    duration: "Up to 1 hour",
    concentration: false,
    description: "A minor magical trick. Create sensory effects, light/snuff flames, clean/soil objects, warm/cool/flavor items, make a small mark, or create a trinket that lasts until end of your next turn.",
  },
  shocking_grasp: {
    id: "shocking_grasp",
    name: "Shocking Grasp",
    level: 0,
    school: "evocation",
    castingTime: "1 action",
    range: "Touch",
    components: "V, S",
    duration: "Instantaneous",
    concentration: false,
    description: "Lightning springs from your hand. Make a melee spell attack (advantage if target wears metal armor). On hit, 1d8 lightning damage, and target can't take reactions until its next turn.",
    damage: "1d8",
    damageType: "lightning",
  },

  // Cleric Cantrips
  sacred_flame: {
    id: "sacred_flame",
    name: "Sacred Flame",
    level: 0,
    school: "evocation",
    castingTime: "1 action",
    range: "60 feet",
    components: "V, S",
    duration: "Instantaneous",
    concentration: false,
    description: "Flame-like radiance descends on a creature. Target must succeed on a Dexterity saving throw or take 1d8 radiant damage. No benefit from cover.",
    damage: "1d8",
    damageType: "radiant",
    savingThrow: "dexterity",
  },
  guidance: {
    id: "guidance",
    name: "Guidance",
    level: 0,
    school: "divination",
    castingTime: "1 action",
    range: "Touch",
    components: "V, S",
    duration: "Concentration, up to 1 minute",
    concentration: true,
    description: "You touch one willing creature. Once before the spell ends, the target can roll a d4 and add the number rolled to one ability check of its choice.",
  },
  spare_the_dying: {
    id: "spare_the_dying",
    name: "Spare the Dying",
    level: 0,
    school: "necromancy",
    castingTime: "1 action",
    range: "Touch",
    components: "V, S",
    duration: "Instantaneous",
    concentration: false,
    description: "You touch a living creature that has 0 hit points. The creature becomes stable.",
  },
};

// ============= 1ST LEVEL SPELLS =============

export const SPELLS_LEVEL_1: Record<string, Spell> = {
  // Wizard Spells
  magic_missile: {
    id: "magic_missile",
    name: "Magic Missile",
    level: 1,
    school: "evocation",
    castingTime: "1 action",
    range: "120 feet",
    components: "V, S",
    duration: "Instantaneous",
    concentration: false,
    description: "You create three glowing darts of magical force. Each dart hits a creature of your choice that you can see within range. A dart deals 1d4+1 force damage.",
    damage: "1d4+1",
    damageType: "force",
    higherLevels: "One additional dart for each slot level above 1st.",
  },
  shield: {
    id: "shield",
    name: "Shield",
    level: 1,
    school: "abjuration",
    castingTime: "1 reaction",
    range: "Self",
    components: "V, S",
    duration: "1 round",
    concentration: false,
    description: "An invisible barrier of magical force appears and protects you. Until the start of your next turn, you have a +5 bonus to AC, including against the triggering attack.",
  },
  mage_armor: {
    id: "mage_armor",
    name: "Mage Armor",
    level: 1,
    school: "abjuration",
    castingTime: "1 action",
    range: "Touch",
    components: "V, S, M (a piece of cured leather)",
    duration: "8 hours",
    concentration: false,
    description: "You touch a willing creature who isn't wearing armor. The target's base AC becomes 13 + its Dexterity modifier. The spell ends if the target dons armor.",
  },
  sleep: {
    id: "sleep",
    name: "Sleep",
    level: 1,
    school: "enchantment",
    castingTime: "1 action",
    range: "90 feet",
    components: "V, S, M (a pinch of sand)",
    duration: "1 minute",
    concentration: false,
    description: "Roll 5d8; the total is how many hit points of creatures this spell can affect. Starting with the lowest current HP, creatures fall unconscious.",
    higherLevels: "Roll an additional 2d8 for each slot level above 1st.",
  },
  burning_hands: {
    id: "burning_hands",
    name: "Burning Hands",
    level: 1,
    school: "evocation",
    castingTime: "1 action",
    range: "Self (15-foot cone)",
    components: "V, S",
    duration: "Instantaneous",
    concentration: false,
    description: "A thin sheet of flames shoots from your fingertips. Each creature in a 15-foot cone must make a Dexterity saving throw. Takes 3d6 fire damage on a failed save, half on success.",
    damage: "3d6",
    damageType: "fire",
    savingThrow: "dexterity",
    higherLevels: "Damage increases by 1d6 for each slot level above 1st.",
  },

  // Cleric Spells
  cure_wounds: {
    id: "cure_wounds",
    name: "Cure Wounds",
    level: 1,
    school: "evocation",
    castingTime: "1 action",
    range: "Touch",
    components: "V, S",
    duration: "Instantaneous",
    concentration: false,
    description: "A creature you touch regains hit points equal to 1d8 + your spellcasting ability modifier.",
    higherLevels: "Healing increases by 1d8 for each slot level above 1st.",
  },
  healing_word: {
    id: "healing_word",
    name: "Healing Word",
    level: 1,
    school: "evocation",
    castingTime: "1 bonus action",
    range: "60 feet",
    components: "V",
    duration: "Instantaneous",
    concentration: false,
    description: "A creature of your choice that you can see within range regains hit points equal to 1d4 + your spellcasting ability modifier.",
    higherLevels: "Healing increases by 1d4 for each slot level above 1st.",
  },
  bless: {
    id: "bless",
    name: "Bless",
    level: 1,
    school: "enchantment",
    castingTime: "1 action",
    range: "30 feet",
    components: "V, S, M (a sprinkling of holy water)",
    duration: "Concentration, up to 1 minute",
    concentration: true,
    description: "You bless up to three creatures of your choice within range. Whenever a target makes an attack roll or saving throw before the spell ends, the target can roll a d4 and add the number rolled.",
    higherLevels: "One additional creature for each slot level above 1st.",
  },
  guiding_bolt: {
    id: "guiding_bolt",
    name: "Guiding Bolt",
    level: 1,
    school: "evocation",
    castingTime: "1 action",
    range: "120 feet",
    components: "V, S",
    duration: "1 round",
    concentration: false,
    description: "A flash of light streaks toward a creature of your choice within range. Make a ranged spell attack. On hit, 4d6 radiant damage, and the next attack roll against this target before the end of your next turn has advantage.",
    damage: "4d6",
    damageType: "radiant",
    higherLevels: "Damage increases by 1d6 for each slot level above 1st.",
  },
  inflict_wounds: {
    id: "inflict_wounds",
    name: "Inflict Wounds",
    level: 1,
    school: "necromancy",
    castingTime: "1 action",
    range: "Touch",
    components: "V, S",
    duration: "Instantaneous",
    concentration: false,
    description: "Make a melee spell attack against a creature you can reach. On a hit, the target takes 3d10 necrotic damage.",
    damage: "3d10",
    damageType: "necrotic",
    higherLevels: "Damage increases by 1d10 for each slot level above 1st.",
  },
};

// ============= 2ND LEVEL SPELLS =============

export const SPELLS_LEVEL_2: Record<string, Spell> = {
  scorching_ray: {
    id: "scorching_ray",
    name: "Scorching Ray",
    level: 2,
    school: "evocation",
    castingTime: "1 action",
    range: "120 feet",
    components: "V, S",
    duration: "Instantaneous",
    concentration: false,
    description: "You create three rays of fire and hurl them at targets within range. Make a ranged spell attack for each ray. On a hit, the target takes 2d6 fire damage.",
    damage: "2d6",
    damageType: "fire",
    higherLevels: "One additional ray for each slot level above 2nd.",
  },
  misty_step: {
    id: "misty_step",
    name: "Misty Step",
    level: 2,
    school: "conjuration",
    castingTime: "1 bonus action",
    range: "Self",
    components: "V",
    duration: "Instantaneous",
    concentration: false,
    description: "Briefly surrounded by silvery mist, you teleport up to 30 feet to an unoccupied space that you can see.",
  },
  hold_person: {
    id: "hold_person",
    name: "Hold Person",
    level: 2,
    school: "enchantment",
    castingTime: "1 action",
    range: "60 feet",
    components: "V, S, M (a small, straight piece of iron)",
    duration: "Concentration, up to 1 minute",
    concentration: true,
    description: "Choose a humanoid that you can see within range. The target must succeed on a Wisdom saving throw or be paralyzed for the duration. The target can make a new save at the end of each of its turns.",
    savingThrow: "wisdom",
    higherLevels: "Target one additional humanoid for each slot level above 2nd.",
  },
  spiritual_weapon: {
    id: "spiritual_weapon",
    name: "Spiritual Weapon",
    level: 2,
    school: "evocation",
    castingTime: "1 bonus action",
    range: "60 feet",
    components: "V, S",
    duration: "1 minute",
    concentration: false,
    description: "You create a floating, spectral weapon within range. Make a melee spell attack. On hit, 1d8 + spellcasting modifier force damage. As a bonus action, you can move the weapon and attack again.",
    damage: "1d8",
    damageType: "force",
    higherLevels: "Damage increases by 1d8 for every two slot levels above 2nd.",
  },
  lesser_restoration: {
    id: "lesser_restoration",
    name: "Lesser Restoration",
    level: 2,
    school: "abjuration",
    castingTime: "1 action",
    range: "Touch",
    components: "V, S",
    duration: "Instantaneous",
    concentration: false,
    description: "You touch a creature and can end either one disease or one condition afflicting it. The condition can be blinded, deafened, paralyzed, or poisoned.",
  },
};

// ============= ALL SPELLS =============

export const ALL_SPELLS: Record<string, Spell> = {
  ...CANTRIPS,
  ...SPELLS_LEVEL_1,
  ...SPELLS_LEVEL_2,
};

// ============= SPELL HELPERS =============

/**
 * Get starting cantrips for a class
 */
export function getStartingCantrips(characterClass: "wizard" | "cleric"): Spell[] {
  if (characterClass === "wizard") {
    return [
      CANTRIPS.fire_bolt,
      CANTRIPS.light,
      CANTRIPS.mage_hand,
    ];
  }
  if (characterClass === "cleric") {
    return [
      CANTRIPS.sacred_flame,
      CANTRIPS.guidance,
      CANTRIPS.spare_the_dying,
    ];
  }
  return [];
}

/**
 * Get starting spells for a class
 */
export function getStartingSpells(characterClass: "wizard" | "cleric"): Spell[] {
  if (characterClass === "wizard") {
    return [
      SPELLS_LEVEL_1.magic_missile,
      SPELLS_LEVEL_1.shield,
      SPELLS_LEVEL_1.mage_armor,
      SPELLS_LEVEL_1.sleep,
      SPELLS_LEVEL_1.burning_hands,
    ];
  }
  if (characterClass === "cleric") {
    return [
      SPELLS_LEVEL_1.cure_wounds,
      SPELLS_LEVEL_1.healing_word,
      SPELLS_LEVEL_1.bless,
      SPELLS_LEVEL_1.guiding_bolt,
      SPELLS_LEVEL_1.inflict_wounds,
    ];
  }
  return [];
}

/**
 * Check if a character can cast a spell
 */
export function canCastSpell(character: Character, spell: Spell): boolean {
  // Cantrips can always be cast
  if (spell.level === 0) return true;

  // Check if character has spell slots of the required level
  const slotLevel = spell.level as keyof typeof character.spellSlots;
  const slots = character.spellSlots[slotLevel];

  return slots && slots.current > 0;
}

/**
 * Use a spell slot
 */
export function useSpellSlot(character: Character, level: number): Character {
  const slotLevel = level as keyof typeof character.spellSlots;
  const newSlots = { ...character.spellSlots };

  if (newSlots[slotLevel] && newSlots[slotLevel].current > 0) {
    newSlots[slotLevel] = {
      ...newSlots[slotLevel],
      current: newSlots[slotLevel].current - 1,
    };
  }

  return { ...character, spellSlots: newSlots };
}

/**
 * Roll spell damage
 */
export function rollSpellDamage(spell: Spell, slotLevel: number, critical: boolean = false): RollResult | null {
  if (!spell.damage) return null;

  // Calculate extra dice for upcasting
  let damage = spell.damage;
  if (slotLevel > spell.level && spell.higherLevels) {
    const extraLevels = slotLevel - spell.level;
    // Simple parsing for common patterns like "1d8" or "3d6"
    const match = spell.damage.match(/(\d+)d(\d+)/);
    if (match) {
      const [, count, die] = match;
      const newCount = parseInt(count) + extraLevels;
      damage = `${newCount}d${die}`;
    }
  }

  return roll(damage);
}

/**
 * Get spell save DC
 */
export function getSpellSaveDC(character: Character): number {
  if (!character.spellcastingAbility) return 10;
  const abilityMod = getModifier(character.abilities[character.spellcastingAbility]);
  return 8 + character.proficiencyBonus + abilityMod;
}

/**
 * Get spell attack bonus
 */
export function getSpellAttackBonus(character: Character): number {
  if (!character.spellcastingAbility) return 0;
  const abilityMod = getModifier(character.abilities[character.spellcastingAbility]);
  return character.proficiencyBonus + abilityMod;
}
