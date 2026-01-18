// Ability score calculations and skill checks

import {
  Character,
  Ability,
  Skill,
  Condition,
  getModifier,
  getSkillAbility,
} from "../character";
import { roll, RollResult, AdvantageType, meetsDC } from "./dice";

// ============= CONDITION EFFECTS ON CHECKS =============

/**
 * Get advantage/disadvantage for ability checks based on conditions
 */
export function getConditionCheckModifier(conditions: Condition[], ability: Ability): AdvantageType {
  // Poisoned: disadvantage on ability checks
  if (conditions.includes("poisoned")) {
    return "disadvantage";
  }

  // Frightened: disadvantage on ability checks while source of fear is visible
  // (We'll treat this as general disadvantage for simplicity)
  if (conditions.includes("frightened")) {
    return "disadvantage";
  }

  // Exhaustion would add disadvantage too, but we're not tracking exhaustion levels

  return "normal";
}

/**
 * Get advantage/disadvantage for saving throws based on conditions
 */
export function getConditionSaveModifier(conditions: Condition[], ability: Ability): AdvantageType {
  // Restrained: disadvantage on DEX saves
  if (conditions.includes("restrained") && ability === "dexterity") {
    return "disadvantage";
  }

  // Stunned/Paralyzed/Petrified: auto-fail STR and DEX saves
  // Note: We handle this as disadvantage since we don't have auto-fail mechanic
  if (
    (conditions.includes("stunned") ||
     conditions.includes("paralyzed") ||
     conditions.includes("petrified")) &&
    (ability === "strength" || ability === "dexterity")
  ) {
    return "disadvantage";
  }

  return "normal";
}

/**
 * Check if character auto-fails certain saves due to conditions
 */
export function autoFailsSave(conditions: Condition[], ability: Ability): boolean {
  // Paralyzed, Stunned, Petrified: auto-fail STR and DEX saves
  if (
    (conditions.includes("paralyzed") ||
     conditions.includes("stunned") ||
     conditions.includes("petrified")) &&
    (ability === "strength" || ability === "dexterity")
  ) {
    return true;
  }

  // Unconscious: auto-fail STR and DEX saves
  if (conditions.includes("unconscious") && (ability === "strength" || ability === "dexterity")) {
    return true;
  }

  return false;
}

/**
 * Combine advantage types (advantage + disadvantage = normal)
 */
export function combineAdvantage(base: AdvantageType, modifier: AdvantageType): AdvantageType {
  if (base === "normal") return modifier;
  if (modifier === "normal") return base;
  if (base === modifier) return base;
  // Advantage + Disadvantage cancel out
  return "normal";
}

export interface CheckResult {
  roll: RollResult;
  modifier: number;
  total: number;
  success: boolean;
  dc: number;
  ability: Ability;
  skill?: Skill;
  proficient: boolean;
}

/**
 * Make an ability check
 */
export function abilityCheck(
  character: Character,
  ability: Ability,
  dc: number,
  advantage: AdvantageType = "normal"
): CheckResult {
  // Apply condition modifiers
  const conditionMod = getConditionCheckModifier(character.conditions, ability);
  const finalAdvantage = combineAdvantage(advantage, conditionMod);

  const modifier = getModifier(character.abilities[ability]);
  const rollResult = roll(`1d20+${modifier}`, finalAdvantage);

  return {
    roll: rollResult,
    modifier,
    total: rollResult.total,
    success: meetsDC(rollResult, dc),
    dc,
    ability,
    proficient: false,
  };
}

/**
 * Make a skill check
 */
export function skillCheck(
  character: Character,
  skill: Skill,
  dc: number,
  advantage: AdvantageType = "normal"
): CheckResult {
  const ability = getSkillAbility(skill);

  // Apply condition modifiers
  const conditionMod = getConditionCheckModifier(character.conditions, ability);
  const finalAdvantage = combineAdvantage(advantage, conditionMod);

  const abilityMod = getModifier(character.abilities[ability]);
  const proficient = character.skills.includes(skill);
  const profBonus = proficient ? character.proficiencyBonus : 0;

  // Check for expertise (rogues can have double proficiency)
  const expertiseSkills = getExpertiseSkills(character);
  const hasExpertise = expertiseSkills.includes(skill);
  const totalProfBonus = hasExpertise ? profBonus * 2 : profBonus;

  const modifier = abilityMod + totalProfBonus;
  const rollResult = roll(`1d20+${modifier}`, finalAdvantage);

  return {
    roll: rollResult,
    modifier,
    total: rollResult.total,
    success: meetsDC(rollResult, dc),
    dc,
    ability,
    skill,
    proficient,
  };
}

/**
 * Make a saving throw
 */
export function savingThrow(
  character: Character,
  ability: Ability,
  dc: number,
  advantage: AdvantageType = "normal"
): CheckResult {
  // Check for auto-fail conditions (paralyzed, stunned, etc.)
  if (autoFailsSave(character.conditions, ability)) {
    return {
      roll: { total: 0, rolls: [0], modifier: 0, natural: 0, isCritical: false, isFumble: false },
      modifier: 0,
      total: 0,
      success: false,
      dc,
      ability,
      proficient: character.savingThrows.includes(ability),
    };
  }

  // Apply condition modifiers
  const conditionMod = getConditionSaveModifier(character.conditions, ability);
  const finalAdvantage = combineAdvantage(advantage, conditionMod);

  const abilityMod = getModifier(character.abilities[ability]);
  const proficient = character.savingThrows.includes(ability);
  const profBonus = proficient ? character.proficiencyBonus : 0;

  const modifier = abilityMod + profBonus;
  const rollResult = roll(`1d20+${modifier}`, finalAdvantage);

  return {
    roll: rollResult,
    modifier,
    total: rollResult.total,
    success: meetsDC(rollResult, dc),
    dc,
    ability,
    proficient,
  };
}

/**
 * Get expertise skills for a character (rogues get expertise)
 */
function getExpertiseSkills(character: Character): Skill[] {
  // Rogues get expertise in stealth and thieves' tools by default
  if (character.class === "rogue") {
    return ["stealth", "sleight_of_hand"];
  }
  return [];
}

/**
 * Calculate the spell save DC for a spellcaster
 */
export function getSpellSaveDC(character: Character): number {
  if (!character.spellcastingAbility) return 0;

  const abilityMod = getModifier(character.abilities[character.spellcastingAbility]);
  return 8 + character.proficiencyBonus + abilityMod;
}

/**
 * Calculate the spell attack bonus for a spellcaster
 */
export function getSpellAttackBonus(character: Character): number {
  if (!character.spellcastingAbility) return 0;

  const abilityMod = getModifier(character.abilities[character.spellcastingAbility]);
  return character.proficiencyBonus + abilityMod;
}

/**
 * Calculate the attack bonus for a weapon attack
 */
export function getAttackBonus(character: Character, weaponId: string): number {
  const weapon = character.inventory.find(i => i.id === weaponId);
  if (!weapon || weapon.type !== "weapon") return 0;

  // Use DEX for finesse/ranged weapons, STR otherwise
  const weaponItem = weapon as import("../character").Weapon;
  const usesDex = weaponItem.finesse || weaponItem.range !== undefined;
  const strMod = getModifier(character.abilities.strength);
  const dexMod = getModifier(character.abilities.dexterity);

  // Use the better modifier for finesse weapons
  let abilityMod: number;
  if (weaponItem.finesse) {
    abilityMod = Math.max(strMod, dexMod);
  } else if (usesDex) {
    abilityMod = dexMod;
  } else {
    abilityMod = strMod;
  }

  // Add proficiency if proficient with the weapon
  const profBonus = isWeaponProficient(character, weaponId) ? character.proficiencyBonus : 0;

  return abilityMod + profBonus;
}

/**
 * Check if character is proficient with a weapon
 */
function isWeaponProficient(character: Character, weaponId: string): boolean {
  // Check direct weapon proficiency
  if (character.weaponProficiencies.includes(weaponId)) return true;

  // Check category proficiency (simple, martial)
  const simpleWeapons = ["club", "dagger", "handaxe", "javelin", "mace", "quarterstaff", "spear", "light_crossbow", "shortbow"];
  const martialWeapons = ["battleaxe", "greatsword", "longsword", "rapier", "shortsword", "warhammer", "longbow", "hand_crossbow"];

  if (character.weaponProficiencies.includes("simple") && simpleWeapons.includes(weaponId)) {
    return true;
  }
  if (character.weaponProficiencies.includes("martial") && martialWeapons.includes(weaponId)) {
    return true;
  }

  return false;
}

/**
 * Calculate damage bonus for a weapon attack
 */
export function getDamageBonus(character: Character, weaponId: string): number {
  const weapon = character.inventory.find(i => i.id === weaponId);
  if (!weapon || weapon.type !== "weapon") return 0;

  const weaponItem = weapon as import("../character").Weapon;
  const usesDex = weaponItem.finesse || weaponItem.range !== undefined;
  const strMod = getModifier(character.abilities.strength);
  const dexMod = getModifier(character.abilities.dexterity);

  if (weaponItem.finesse) {
    return Math.max(strMod, dexMod);
  } else if (usesDex) {
    return dexMod;
  } else {
    return strMod;
  }
}

/**
 * Get the passive perception score
 */
export function getPassivePerception(character: Character): number {
  const wisMod = getModifier(character.abilities.wisdom);
  const profBonus = character.skills.includes("perception") ? character.proficiencyBonus : 0;
  return 10 + wisMod + profBonus;
}

/**
 * Get the passive investigation score
 */
export function getPassiveInvestigation(character: Character): number {
  const intMod = getModifier(character.abilities.intelligence);
  const profBonus = character.skills.includes("investigation") ? character.proficiencyBonus : 0;
  return 10 + intMod + profBonus;
}

/**
 * Get the passive insight score
 */
export function getPassiveInsight(character: Character): number {
  const wisMod = getModifier(character.abilities.wisdom);
  const profBonus = character.skills.includes("insight") ? character.proficiencyBonus : 0;
  return 10 + wisMod + profBonus;
}

/**
 * Format a check result for display
 */
export function formatCheckResult(result: CheckResult): string {
  const skillStr = result.skill ? ` (${result.skill.replace("_", " ")})` : "";
  const profStr = result.proficient ? " [proficient]" : "";
  const successStr = result.success ? "SUCCESS" : "FAILURE";

  let str = `${result.ability.charAt(0).toUpperCase() + result.ability.slice(1)}${skillStr} check${profStr}: `;
  str += `[${result.roll.rolls[0]}]`;

  if (result.modifier !== 0) {
    str += result.modifier > 0 ? ` + ${result.modifier}` : ` - ${Math.abs(result.modifier)}`;
  }

  str += ` = ${result.total} vs DC ${result.dc} - ${successStr}`;

  if (result.roll.isCritical) {
    str += " (Natural 20!)";
  } else if (result.roll.isFumble) {
    str += " (Natural 1!)";
  }

  return str;
}
