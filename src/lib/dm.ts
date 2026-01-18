import { streamText, generateText, stepCountIs } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import { z } from "zod";
import { WORLD_LORE, CHARACTERS } from "./brains";
import {
  addToTranscript,
  setThinking,
  getGame,
  updateCharacter,
  updateGame,
} from "./game-state";
import { Character, Ability, Skill, DamageType, Spell, InventoryItem, Armor, calculateAC, getProficiencyBonus, getLevelFromXp, getModifier } from "./character";
import { skillCheck, abilityCheck, savingThrow, getSpellSaveDC } from "./rules/abilities";
import { createEnemyGroup } from "./rules/enemies";
import { CANTRIPS, SPELLS_LEVEL_1, SPELLS_LEVEL_2, canCastSpell, useSpellSlot, rollSpellDamage } from "./rules/spells";
import { CLASSES, getMaxHp, getSpellSlots, getFeaturesAtLevel, getSneakAttackDice } from "./rules/classes";
import { WEAPONS, ARMOR, GEAR, isFinesse, isRanged } from "./rules/equipment";
import { roll } from "./rules/dice";
import {
  createCombatState,
  rollInitiative,
  rollEnemyInitiative,
  makeAttack,
  applyDamage,
  applyDamageToEnemy,
  healCharacter,
  formatAttackResult,
  rollDeathSave,
} from "./rules/combat";

// Build character summary for DM context
function buildCharacterSummary(characters: Character[]): string {
  if (characters.length === 0) return "No characters yet.";

  return characters
    .map((c) => {
      const hp = `${c.currentHp}/${c.maxHp} HP`;
      const ac = `AC ${c.armorClass}`;
      const conditions = c.conditions.length > 0 ? `[${c.conditions.join(", ")}]` : "";
      return `- ${c.name} (Level ${c.level} ${c.race} ${c.class}): ${hp}, ${ac} ${conditions}`;
    })
    .join("\n");
}

// Build combat summary for DM context
function buildCombatSummary(game: Awaited<ReturnType<typeof getGame>>): string {
  if (!game?.combat) return "";

  const combat = game.combat;
  const order = combat.initiativeOrder
    .map((c, i) => {
      const marker = i === combat.turnIndex ? ">" : " ";
      const enemy = combat.enemies.find((e) => e.id === c.id);
      const hp = enemy ? ` (${enemy.currentHp}/${enemy.maxHp} HP)` : "";
      return `${marker} ${c.name}${hp}`;
    })
    .join(", ");

  return `\nCOMBAT - Round ${combat.round}\nInitiative: ${order}`;
}

const SYSTEM_BASE = `You are the Dungeon Master for a D&D 5e adventure.

VOICE:
- Second person ("You step forward...")
- Terse, evocative. Max 3-4 sentences per beat.
- No markdown. No **bold**. No headers. Plain text only.
- End with implicit prompt, not "What do you do?"

D&D RULES:
- Call for ability checks when outcomes are uncertain (DC 10 easy, 15 medium, 20 hard)
- Use attack rolls for combat (d20 + bonus vs AC)
- Damage reduces HP. At 0 HP, characters fall unconscious
- Critical hits (nat 20) double damage dice
- Natural 1 is always a miss

WORLD KNOWLEDGE:
${WORLD_LORE}

TOOLS:
- ability_check: For uncertain outcomes based on character abilities
- saving_throw: When characters resist effects
- attack: When attacking enemies
- cast_spell: When characters cast spells (cantrips or leveled)
- apply_damage: When dealing damage to characters
- heal: When healing characters
- death_save: Roll a death save for an unconscious character (at 0 HP)
- apply_condition: Apply a condition (blinded, poisoned, etc.) to a character
- remove_condition: Remove a condition from a character
- use_feature: Use a class feature (Second Wind, Action Surge, Arcane Recovery, Channel Divinity)
- level_up: When a character has enough XP to level up
- rest: When party takes a short or long rest
- speak_as_npc: When NPCs talk (use their voice!)
- start_combat: When combat begins
- end_combat: When combat ends

CLASS FEATURES:
- Second Wind (Fighter): Bonus action, regain 1d10 + level HP. Recharges on short/long rest.
- Action Surge (Fighter, L2+): Take an additional action this turn. Recharges on short/long rest.
- Arcane Recovery (Wizard): After short rest, recover spell slots totaling half wizard level (rounded up). Once per long rest.
- Channel Divinity (Cleric, L2+): Choose Turn Undead or Preserve Life. Recharges on short/long rest.
  - Turn Undead: Undead within 30ft make WIS save or flee.
  - Preserve Life: Distribute level*5 HP to creatures within 30ft (max half their HP).

EQUIPMENT & ITEMS:
- equip_item: Equip a weapon, armor, or shield from inventory
- unequip_item: Unequip a weapon, armor, or shield
- use_item: Use a consumable (healing potion heals 2d4+2, greater healing 4d4+4)
- give_item: Give a new item to a character (from loot, purchases, etc)
- give_gold: Give gold to a character

CONCENTRATION:
- Some spells require concentration (marked in spell data)
- Character can only concentrate on one spell at a time
- Casting a new concentration spell ends the previous one
- Taking damage requires CON save: DC = max(10, damage/2). Failure = lose concentration
- Being incapacitated, paralyzed, stunned, or unconscious breaks concentration
- end_concentration: Manually end concentration on a spell

CONDITIONS:
- blinded: Disadvantage on attacks, attacks against have advantage
- charmed: Can't attack charmer, charmer has advantage on social checks
- deafened: Can't hear, auto-fail hearing checks
- frightened: Disadvantage on checks/attacks while source visible
- grappled: Speed 0
- incapacitated: Can't take actions or reactions
- paralyzed: Incapacitated, auto-fail STR/DEX saves, attacks have advantage + auto-crit in melee
- petrified: Turned to stone, resistance to all damage
- poisoned: Disadvantage on attacks and ability checks
- prone: Disadvantage on attacks, melee attacks against have advantage, ranged have disadvantage
- restrained: Speed 0, disadvantage on attacks and DEX saves, attacks against have advantage
- stunned: Incapacitated, auto-fail STR/DEX saves, attacks against have advantage
- unconscious: Incapacitated, auto-fail STR/DEX, prone, attacks have advantage + auto-crit in melee

DEATH & DYING:
- At 0 HP, characters fall unconscious and must make death saves
- Death save: d20, no modifiers. 10+ = success, 9 or less = failure
- Natural 20: regain 1 HP and wake up
- Natural 1: counts as 2 failures
- 3 successes: stabilize (stop rolling)
- 3 failures: character dies
- Taking damage while unconscious: automatic death save failure

Keep it punchy. This is a terminal, not a novel.`;

// Tool schemas
const abilityCheckSchema = z.object({
  characterId: z.string().describe("ID of the character making the check"),
  ability: z.enum(["strength", "dexterity", "constitution", "intelligence", "wisdom", "charisma"]),
  skill: z.string().optional().describe("Optional skill for the check"),
  dc: z.number().describe("Difficulty class (10=easy, 15=medium, 20=hard)"),
  description: z.string().describe("What the check is for"),
});

const savingThrowSchema = z.object({
  characterId: z.string().describe("ID of the character making the save"),
  ability: z.enum(["strength", "dexterity", "constitution", "intelligence", "wisdom", "charisma"]),
  dc: z.number().describe("Difficulty class"),
  effect: z.string().describe("What happens on failure"),
});

const attackSchema = z.object({
  attackerId: z.string().describe("ID of the attacker"),
  targetId: z.string().describe("ID of the target"),
  weaponName: z.string().optional().describe("Name of weapon used"),
});

const damageSchema = z.object({
  characterId: z.string().describe("ID of the character taking damage"),
  amount: z.number().describe("Amount of damage"),
  damageType: z.enum([
    "slashing", "piercing", "bludgeoning", "fire", "cold", "lightning",
    "thunder", "poison", "acid", "necrotic", "radiant", "force", "psychic",
  ]),
  source: z.string().describe("What caused the damage"),
});

const healSchema = z.object({
  characterId: z.string().describe("ID of the character to heal"),
  amount: z.number().describe("Amount of healing"),
  source: z.string().describe("What caused the healing"),
});

const speakAsNpcSchema = z.object({
  characterId: z.enum(["mara", "vexis", "dren"]),
  situation: z.string(),
});

const startCombatSchema = z.object({
  enemyType: z.string().describe("Type of enemy (goblin, skeleton, orc, etc)"),
  count: z.number().describe("Number of enemies"),
  environment: z.string().describe("Combat environment description"),
});

const endCombatSchema = z.object({
  outcome: z.enum(["victory", "defeat", "fled"]),
  xpAwarded: z.number().optional().describe("XP to award to each character"),
});

const castSpellSchema = z.object({
  casterId: z.string().describe("ID of the character casting the spell"),
  spellId: z.string().describe("ID of the spell (fire_bolt, magic_missile, cure_wounds, etc)"),
  targetId: z.string().optional().describe("ID of the target (for targeted spells)"),
  spellLevel: z.number().optional().describe("Spell slot level to use (for leveled spells, not cantrips)"),
});

const levelUpSchema = z.object({
  characterId: z.string().describe("ID of the character to level up"),
});

const restSchema = z.object({
  restType: z.enum(["short", "long"]).describe("Type of rest"),
  hitDiceToSpend: z.number().optional().describe("Number of hit dice to spend during short rest (max = level)"),
});

const deathSaveSchema = z.object({
  characterId: z.string().describe("ID of the unconscious character to roll death save for"),
});

const applyConditionSchema = z.object({
  characterId: z.string().describe("ID of the character to apply condition to"),
  condition: z.enum([
    "blinded", "charmed", "deafened", "frightened", "grappled",
    "incapacitated", "invisible", "paralyzed", "petrified",
    "poisoned", "prone", "restrained", "stunned", "unconscious"
  ]).describe("The condition to apply"),
  source: z.string().describe("What caused the condition"),
  duration: z.string().optional().describe("Duration (e.g., '1 minute', 'until end of next turn')"),
});

const removeConditionSchema = z.object({
  characterId: z.string().describe("ID of the character to remove condition from"),
  condition: z.string().describe("The condition to remove"),
});

const useFeatureSchema = z.object({
  characterId: z.string().describe("ID of the character using the feature"),
  featureName: z.enum([
    "Second Wind",
    "Action Surge",
    "Arcane Recovery",
    "Channel Divinity: Turn Undead",
    "Channel Divinity: Preserve Life",
  ]).describe("Name of the class feature to use"),
  targetId: z.string().optional().describe("Target character ID (for healing features like Preserve Life)"),
  healingDistribution: z.record(z.string(), z.number()).optional().describe("For Preserve Life: map of characterId to HP to heal"),
});

const equipItemSchema = z.object({
  characterId: z.string().describe("ID of the character"),
  itemId: z.string().describe("ID of the item in inventory to equip"),
});

const unequipItemSchema = z.object({
  characterId: z.string().describe("ID of the character"),
  slot: z.enum(["weapon", "armor", "shield"]).describe("Equipment slot to unequip"),
});

const useItemSchema = z.object({
  characterId: z.string().describe("ID of the character using the item"),
  itemId: z.string().describe("ID of the item to use (potion, scroll, etc)"),
  targetId: z.string().optional().describe("Target character ID (for healing potions, etc)"),
});

const giveItemSchema = z.object({
  characterId: z.string().describe("ID of the character receiving the item"),
  itemName: z.string().describe("Name of the item to give"),
  itemType: z.enum(["weapon", "armor", "shield", "potion", "tool", "gear", "treasure"]).describe("Type of item"),
  quantity: z.number().optional().describe("Quantity (default 1)"),
  description: z.string().optional().describe("Item description"),
});

const giveGoldSchema = z.object({
  characterId: z.string().describe("ID of the character receiving gold"),
  amount: z.number().describe("Amount of gold to give"),
  source: z.string().describe("Where the gold came from"),
});

const endConcentrationSchema = z.object({
  characterId: z.string().describe("ID of the character to end concentration for"),
  reason: z.string().describe("Why concentration ended (voluntary, damage, new spell, etc)"),
});

export async function runDM(
  roomCode: string,
  playerAction: string,
  actingCharacter?: Character
) {
  const game = await getGame(roomCode);
  if (!game) throw new Error("Game not found");

  // Add player action to transcript
  await addToTranscript(roomCode, {
    type: "player",
    content: `> ${playerAction}`,
    characterId: actingCharacter?.id,
  });

  // Set thinking
  await setThinking(roomCode, "The Dungeon Master considers...");

  // Build context
  const recentTranscript = game.transcript
    .slice(-10)
    .map((e) => e.content)
    .join("\n\n");

  const partyInfo = buildCharacterSummary(game.characters);
  const combatInfo = buildCombatSummary(game);

  const characterContext = actingCharacter
    ? `\n\nACTING CHARACTER: ${actingCharacter.name} (Level ${actingCharacter.level} ${actingCharacter.race} ${actingCharacter.class})
HP: ${actingCharacter.currentHp}/${actingCharacter.maxHp}, AC: ${actingCharacter.armorClass}
STR ${actingCharacter.abilities.strength} DEX ${actingCharacter.abilities.dexterity} CON ${actingCharacter.abilities.constitution} INT ${actingCharacter.abilities.intelligence} WIS ${actingCharacter.abilities.wisdom} CHA ${actingCharacter.abilities.charisma}`
    : "";

  const systemPrompt = `${SYSTEM_BASE}

CURRENT PARTY:
${partyInfo}
${combatInfo}
${characterContext}`;

  const result = streamText({
    model: anthropic("claude-sonnet-4-5"),
    system: systemPrompt,
    prompt: `Recent transcript:\n${recentTranscript}\n\nPlayer action: ${playerAction}\n\nRespond as DM:`,
    tools: {
      ability_check: {
        description: "Make an ability check for a character",
        inputSchema: abilityCheckSchema,
        execute: async ({
          characterId,
          ability,
          skill,
          dc,
          description,
        }: z.infer<typeof abilityCheckSchema>) => {
          const char = game.characters.find((c) => c.id === characterId);
          if (!char) return { error: "Character not found" };

          await setThinking(roomCode, `${char.name} attempts ${description}...`);

          const checkResult = skill
            ? skillCheck(char, skill as Skill, dc)
            : abilityCheck(char, ability as Ability, dc);

          const modStr = checkResult.modifier >= 0 ? `+${checkResult.modifier}` : `${checkResult.modifier}`;
          const resultText = checkResult.success ? "SUCCESS" : "FAILURE";
          const critText = checkResult.roll.isCritical
            ? " (Natural 20!)"
            : checkResult.roll.isFumble
            ? " (Natural 1!)"
            : "";

          await addToTranscript(roomCode, {
            type: "dice",
            content: `${char.name} ${skill || ability} check: [${checkResult.roll.natural}]${modStr} = ${checkResult.total} vs DC ${dc} - ${resultText}${critText}`,
          });

          return checkResult;
        },
      },

      saving_throw: {
        description: "Make a saving throw for a character",
        inputSchema: savingThrowSchema,
        execute: async ({
          characterId,
          ability,
          dc,
          effect,
        }: z.infer<typeof savingThrowSchema>) => {
          const char = game.characters.find((c) => c.id === characterId);
          if (!char) return { error: "Character not found" };

          await setThinking(roomCode, `${char.name} resists ${effect}...`);

          const saveResult = savingThrow(char, ability as Ability, dc);
          const modStr = saveResult.modifier >= 0 ? `+${saveResult.modifier}` : `${saveResult.modifier}`;
          const resultText = saveResult.success ? "SUCCESS" : "FAILURE";

          await addToTranscript(roomCode, {
            type: "dice",
            content: `${char.name} ${ability.toUpperCase()} save: [${saveResult.roll.natural}]${modStr} = ${saveResult.total} vs DC ${dc} - ${resultText}`,
          });

          return saveResult;
        },
      },

      attack: {
        description: "Make an attack roll",
        inputSchema: attackSchema,
        execute: async ({
          attackerId,
          targetId,
        }: z.infer<typeof attackSchema>) => {
          const attacker = game.characters.find((c) => c.id === attackerId);
          const targetChar = game.characters.find((c) => c.id === targetId);
          const targetEnemy = game.combat?.enemies.find((e) => e.id === targetId);

          if (!attacker) return { error: "Attacker not found" };
          const target = targetChar || targetEnemy;
          if (!target) return { error: "Target not found" };

          await setThinking(roomCode, `${attacker.name} attacks ${target.name}...`);

          const weaponId = attacker.equippedWeapon || "dagger";
          const targetAC = targetChar?.armorClass ?? targetEnemy?.armorClass ?? 10;
          const attackResult = makeAttack(
            attacker,
            weaponId,
            targetAC
          );

          let totalDamage = attackResult.damage || 0;
          let sneakAttackDamage = 0;

          // Check for Sneak Attack (Rogues only)
          if (attackResult.hit && attacker.class === "rogue") {
            const weapon = WEAPONS[weaponId as keyof typeof WEAPONS];
            const weaponIsEligible = weapon && (isFinesse(weapon) || isRanged(weapon));
            const hasAllyAdjacent = game.characters.length > 1; // Simplified: assume ally is nearby in combat

            if (weaponIsEligible && hasAllyAdjacent) {
              const sneakDice = getSneakAttackDice(attacker.level);
              const sneakRoll = roll(sneakDice);
              sneakAttackDamage = sneakRoll.total;
              totalDamage += sneakAttackDamage;
            }
          }

          let resultText = formatAttackResult(attacker.name, target.name, attackResult);
          if (sneakAttackDamage > 0) {
            resultText += ` SNEAK ATTACK! +${sneakAttackDamage} damage!`;
          }

          await addToTranscript(roomCode, {
            type: "combat",
            content: resultText,
          });

          // Apply damage if hit
          if (attackResult.hit && totalDamage > 0 && targetEnemy) {
            const damageResult = applyDamageToEnemy(
              targetEnemy,
              totalDamage,
              attackResult.damageType || "slashing"
            );

            // Update enemy HP in game state
            if (game.combat) {
              const enemyIdx = game.combat.enemies.findIndex((e) => e.id === targetId);
              if (enemyIdx !== -1) {
                game.combat.enemies[enemyIdx].currentHp = damageResult.newHp;
                await updateGame(roomCode, { combat: game.combat });
              }
            }

            if (damageResult.dead) {
              await addToTranscript(roomCode, {
                type: "combat",
                content: `${target.name} is defeated!`,
              });
            }
          }

          return attackResult;
        },
      },

      cast_spell: {
        description: "Cast a spell",
        inputSchema: castSpellSchema,
        execute: async ({
          casterId,
          spellId,
          targetId,
          spellLevel,
        }: z.infer<typeof castSpellSchema>) => {
          const caster = game.characters.find((c) => c.id === casterId);
          if (!caster) return { error: "Caster not found" };

          // Find the spell
          const allSpells = { ...CANTRIPS, ...SPELLS_LEVEL_1, ...SPELLS_LEVEL_2 };
          const spell = allSpells[spellId as keyof typeof allSpells];
          if (!spell) return { error: `Unknown spell: ${spellId}` };

          // Check if caster can cast this spell
          if (!canCastSpell(caster, spell)) {
            await addToTranscript(roomCode, {
              type: "system",
              content: `${caster.name} cannot cast ${spell.name}: no available spell slots`,
            });
            return { error: "Cannot cast spell - no available spell slots" };
          }

          await setThinking(roomCode, `${caster.name} casts ${spell.name}...`);

          // Use spell slot if not a cantrip
          if (spell.level > 0) {
            const slotLevel = spellLevel || spell.level;
            const updatedCaster = useSpellSlot(caster, slotLevel);
            await updateCharacter(roomCode, casterId, {
              spellSlots: updatedCaster.spellSlots,
            });
          }

          let resultText = `${caster.name} casts ${spell.name}!`;
          let concentrationMsg = "";

          // Handle concentration
          if (spell.concentration) {
            // If already concentrating, end the previous spell
            if (caster.concentrating) {
              const prevSpell = [...Object.values(CANTRIPS), ...Object.values(SPELLS_LEVEL_1), ...Object.values(SPELLS_LEVEL_2)]
                .find((s) => s.id === caster.concentrating);
              concentrationMsg = ` (Ends concentration on ${prevSpell?.name || "previous spell"})`;
            }
            // Start concentrating on new spell
            await updateCharacter(roomCode, casterId, { concentrating: spellId });
            concentrationMsg += ` [Concentrating]`;
          }

          // Handle damage spells
          if (spell.damage && spell.damageType) {
            const target = targetId
              ? game.characters.find((c) => c.id === targetId) ||
                game.combat?.enemies.find((e) => e.id === targetId)
              : null;

            // Roll damage
            const damageRoll = rollSpellDamage(spell, spellLevel || spell.level, false);
            if (!damageRoll) {
              return { error: "Failed to roll spell damage" };
            }

            // Check for saving throw
            if (spell.savingThrow && target) {
              const dc = getSpellSaveDC(caster);
              const targetChar = game.characters.find((c) => c.id === targetId);

              if (targetChar) {
                const save = savingThrow(targetChar, spell.savingThrow, dc);
                resultText += ` ${target.name} ${spell.savingThrow.toUpperCase()} save: [${save.roll.natural}] = ${save.total} vs DC ${dc} - ${save.success ? "SUCCESS" : "FAILURE"}`;

                if (save.success) {
                  // Most save spells do half damage on success
                  resultText += ` (half damage)`;
                }
              }
            }

            resultText += ` Deals ${damageRoll.total} ${spell.damageType} damage.`;

            // Apply damage to enemy target
            if (target && targetId && game.combat?.enemies.find((e) => e.id === targetId)) {
              const enemy = game.combat.enemies.find((e) => e.id === targetId)!;
              const damageResult = applyDamageToEnemy(enemy, damageRoll.total, spell.damageType);

              const enemyIdx = game.combat.enemies.findIndex((e) => e.id === targetId);
              if (enemyIdx !== -1) {
                game.combat.enemies[enemyIdx].currentHp = damageResult.newHp;
                await updateGame(roomCode, { combat: game.combat });
              }

              if (damageResult.dead) {
                resultText += ` ${enemy.name} is defeated!`;
              }
            }
          }

          // Handle healing spells
          if (spellId === "cure_wounds" || spellId === "healing_word") {
            const target = targetId
              ? game.characters.find((c) => c.id === targetId)
              : caster;

            if (target) {
              const healAmount = spellId === "cure_wounds"
                ? Math.floor(Math.random() * 8) + 1 + (caster.spellcastingAbility ? Math.floor((caster.abilities[caster.spellcastingAbility] - 10) / 2) : 0)
                : Math.floor(Math.random() * 4) + 1 + (caster.spellcastingAbility ? Math.floor((caster.abilities[caster.spellcastingAbility] - 10) / 2) : 0);

              const healResult = healCharacter(target, healAmount);
              await updateCharacter(roomCode, target.id, { currentHp: healResult.newHp });

              resultText += ` ${target.name} heals ${healAmount} HP. (${healResult.newHp}/${target.maxHp} HP)`;
            }
          }

          await addToTranscript(roomCode, {
            type: "dice",
            content: resultText + concentrationMsg,
          });

          return { success: true, spell: spell.name, concentrating: spell.concentration ? spellId : null };
        },
      },

      apply_damage: {
        description: "Apply damage to a character",
        inputSchema: damageSchema,
        execute: async ({
          characterId,
          amount,
          damageType,
          source,
        }: z.infer<typeof damageSchema>) => {
          const char = game.characters.find((c) => c.id === characterId);
          if (!char) return { error: "Character not found" };

          // Check if character was already unconscious (0 HP)
          const wasUnconscious = char.currentHp <= 0;

          await setThinking(roomCode, `${char.name} takes damage...`);

          const result = applyDamage(char, amount, damageType as DamageType);

          const updates: Partial<Character> = {
            currentHp: result.newHp,
          };

          let statusText = "";

          // If already unconscious and takes damage, auto-fail death save
          if (wasUnconscious && amount > 0) {
            const newFailures = Math.min(3, char.deathSaves.failures + 1);
            updates.deathSaves = {
              successes: char.deathSaves.successes,
              failures: newFailures,
            };

            if (newFailures >= 3) {
              statusText = ` Taking damage while unconscious causes a death save failure! ${char.name} has DIED!`;
            } else {
              statusText = ` Taking damage while unconscious causes a death save failure! (${char.deathSaves.successes}/3 successes, ${newFailures}/3 failures)`;
            }
          } else if (result.dead) {
            statusText = ` ${char.name} has died!`;
            // End concentration on death
            if (char.concentrating) {
              updates.concentrating = null;
            }
          } else if (result.unconscious) {
            statusText = ` ${char.name} falls unconscious!`;
            // Reset death saves when first falling unconscious
            updates.deathSaves = { successes: 0, failures: 0 };
            // End concentration when falling unconscious
            if (char.concentrating) {
              updates.concentrating = null;
              statusText += ` Loses concentration!`;
            }
          } else if (char.concentrating && !wasUnconscious) {
            // Concentration save: DC = max(10, damage / 2)
            const concentrationDC = Math.max(10, Math.floor(amount / 2));
            const concSave = savingThrow(char, "constitution", concentrationDC);
            const modStr = concSave.modifier >= 0 ? `+${concSave.modifier}` : `${concSave.modifier}`;

            if (concSave.success) {
              statusText += ` CONCENTRATION SAVE: [${concSave.roll.natural}]${modStr} = ${concSave.total} vs DC ${concentrationDC} - Maintained!`;
            } else {
              const lostSpell = [...Object.values(CANTRIPS), ...Object.values(SPELLS_LEVEL_1), ...Object.values(SPELLS_LEVEL_2)]
                .find((s) => s.id === char.concentrating);
              updates.concentrating = null;
              statusText += ` CONCENTRATION SAVE: [${concSave.roll.natural}]${modStr} = ${concSave.total} vs DC ${concentrationDC} - FAILED! Loses ${lostSpell?.name || "spell"}!`;
            }
          }

          await updateCharacter(roomCode, characterId, updates);

          await addToTranscript(roomCode, {
            type: "combat",
            content: `${char.name} takes ${amount} ${damageType} damage from ${source}. (${result.newHp}/${char.maxHp} HP)${statusText}`,
          });

          return result;
        },
      },

      heal: {
        description: "Heal a character",
        inputSchema: healSchema,
        execute: async ({
          characterId,
          amount,
          source,
        }: z.infer<typeof healSchema>) => {
          const char = game.characters.find((c) => c.id === characterId);
          if (!char) return { error: "Character not found" };

          await setThinking(roomCode, `${char.name} is healed...`);

          const result = healCharacter(char, amount);

          await updateCharacter(roomCode, characterId, {
            currentHp: result.newHp,
          });

          await addToTranscript(roomCode, {
            type: "system",
            content: `${char.name} heals ${amount} HP from ${source}. (${result.newHp}/${char.maxHp} HP)`,
          });

          return result;
        },
      },

      death_save: {
        description: "Roll a death saving throw for an unconscious character",
        inputSchema: deathSaveSchema,
        execute: async ({
          characterId,
        }: z.infer<typeof deathSaveSchema>) => {
          const char = game.characters.find((c) => c.id === characterId);
          if (!char) return { error: "Character not found" };

          if (char.currentHp > 0) {
            return { error: `${char.name} is not unconscious (HP: ${char.currentHp})` };
          }

          // Check if already stabilized or dead
          if (char.deathSaves.successes >= 3) {
            return { error: `${char.name} is already stabilized` };
          }
          if (char.deathSaves.failures >= 3) {
            return { error: `${char.name} is already dead` };
          }

          await setThinking(roomCode, `${char.name} makes a death saving throw...`);

          const result = rollDeathSave(char);

          // Update death saves
          const updates: Partial<Character> = {
            deathSaves: {
              successes: result.totalSuccesses,
              failures: result.totalFailures,
            },
          };

          // Natural 20: regain 1 HP
          if (result.critical) {
            updates.currentHp = 1;
            updates.deathSaves = { successes: 0, failures: 0 }; // Reset on recovery
          }

          await updateCharacter(roomCode, characterId, updates);

          // Build result message
          let message = `${char.name} DEATH SAVE: [${result.roll.natural}]`;

          if (result.critical) {
            message += ` - NATURAL 20! ${char.name} regains 1 HP and wakes up!`;
          } else if (result.fumble) {
            message += ` - NATURAL 1! Two failures! (${result.totalSuccesses} successes, ${result.totalFailures} failures)`;
          } else if (result.success) {
            message += ` - Success! (${result.totalSuccesses}/3 successes, ${result.totalFailures}/3 failures)`;
          } else {
            message += ` - Failure! (${result.totalSuccesses}/3 successes, ${result.totalFailures}/3 failures)`;
          }

          if (result.stabilized && !result.critical) {
            message += ` ${char.name} is STABILIZED!`;
          } else if (result.dead) {
            message += ` ${char.name} has DIED!`;
          }

          await addToTranscript(roomCode, {
            type: "combat",
            content: message,
          });

          return result;
        },
      },

      apply_condition: {
        description: "Apply a condition to a character",
        inputSchema: applyConditionSchema,
        execute: async ({
          characterId,
          condition,
          source,
          duration,
        }: z.infer<typeof applyConditionSchema>) => {
          const char = game.characters.find((c) => c.id === characterId);
          if (!char) return { error: "Character not found" };

          // Check if already has this condition
          if (char.conditions.includes(condition)) {
            return { error: `${char.name} already has the ${condition} condition` };
          }

          await setThinking(roomCode, `${char.name} becomes ${condition}...`);

          const newConditions = [...char.conditions, condition];
          const updates: Partial<Character> = { conditions: newConditions };

          // Special handling for incapacitating conditions
          const incapacitatingConditions = ["incapacitated", "paralyzed", "petrified", "stunned", "unconscious"];
          let extraMessage = "";

          // Break concentration if incapacitated
          if (incapacitatingConditions.includes(condition) && char.concentrating) {
            updates.concentrating = null;
            extraMessage = ` ${char.name} loses concentration!`;
          }

          // Unconscious also makes you prone
          if (condition === "unconscious" && !char.conditions.includes("prone")) {
            updates.conditions = [...newConditions, "prone"];
          }

          await updateCharacter(roomCode, characterId, updates);

          const durationText = duration ? ` (${duration})` : "";
          await addToTranscript(roomCode, {
            type: "combat",
            content: `${char.name} is now ${condition.toUpperCase()}${durationText} from ${source}.${extraMessage}`,
          });

          return { applied: condition, character: char.name };
        },
      },

      remove_condition: {
        description: "Remove a condition from a character",
        inputSchema: removeConditionSchema,
        execute: async ({
          characterId,
          condition,
        }: z.infer<typeof removeConditionSchema>) => {
          const char = game.characters.find((c) => c.id === characterId);
          if (!char) return { error: "Character not found" };

          if (!char.conditions.includes(condition as any)) {
            return { error: `${char.name} does not have the ${condition} condition` };
          }

          await setThinking(roomCode, `${char.name} is no longer ${condition}...`);

          const newConditions = char.conditions.filter((c) => c !== condition);
          await updateCharacter(roomCode, characterId, { conditions: newConditions });

          await addToTranscript(roomCode, {
            type: "system",
            content: `${char.name} is no longer ${condition.toUpperCase()}.`,
          });

          return { removed: condition, character: char.name };
        },
      },

      use_feature: {
        description: "Use a class feature",
        inputSchema: useFeatureSchema,
        execute: async ({
          characterId,
          featureName,
          targetId,
          healingDistribution,
        }: z.infer<typeof useFeatureSchema>) => {
          const char = game.characters.find((c) => c.id === characterId);
          if (!char) return { error: "Character not found" };

          // Find the base feature (Channel Divinity variants share one feature)
          const baseFeatureName = featureName.startsWith("Channel Divinity") ? "Channel Divinity" : featureName;
          const feature = char.features.find((f) => f.name === baseFeatureName);

          if (!feature) {
            return { error: `${char.name} does not have the ${featureName} feature` };
          }

          if (feature.usesPerRest && feature.usesPerRest.current <= 0) {
            const restType = feature.usesPerRest.restType === "short" ? "short or long" : "long";
            return { error: `${featureName} has no uses remaining (recharges on ${restType} rest)` };
          }

          await setThinking(roomCode, `${char.name} uses ${featureName}...`);

          let resultMessage = "";
          const updates: Partial<Character> = {};

          switch (featureName) {
            case "Second Wind": {
              // Roll 1d10 + fighter level
              const healRoll = roll(`1d10+${char.level}`);
              const hpRestored = Math.min(healRoll.total, char.maxHp - char.currentHp);
              updates.currentHp = char.currentHp + hpRestored;
              resultMessage = `${char.name} uses SECOND WIND! Rolls [${healRoll.rolls[0]}]+${char.level} = ${healRoll.total} HP restored. (${updates.currentHp}/${char.maxHp} HP)`;
              break;
            }

            case "Action Surge": {
              resultMessage = `${char.name} uses ACTION SURGE! They can take an additional action this turn.`;
              break;
            }

            case "Arcane Recovery": {
              // Can recover spell slots with combined level equal to half wizard level (rounded up)
              const maxRecoveryLevel = Math.ceil(char.level / 2);
              const slotsRecovered: { level: number }[] = [];
              let remainingLevels = maxRecoveryLevel;

              const newSpellSlots = { ...char.spellSlots };

              for (let level = 1; level <= 5 && remainingLevels > 0; level++) {
                const slotKey = level as keyof typeof char.spellSlots;
                const slot = newSpellSlots[slotKey];

                if (slot && slot.current < slot.max && level <= remainingLevels) {
                  newSpellSlots[slotKey] = { ...slot, current: slot.current + 1 };
                  slotsRecovered.push({ level });
                  remainingLevels -= level;
                }
              }

              if (slotsRecovered.length === 0) {
                return { error: "No spell slots available to recover, or all slots are full" };
              }

              updates.spellSlots = newSpellSlots;
              const slotDesc = slotsRecovered.map((s) => `level ${s.level}`).join(", ");
              resultMessage = `${char.name} uses ARCANE RECOVERY! Recovered ${slotDesc} spell slot(s).`;
              break;
            }

            case "Channel Divinity: Turn Undead": {
              const spellSaveDC = 8 + char.proficiencyBonus + getModifier(char.abilities.wisdom);
              resultMessage = `${char.name} uses CHANNEL DIVINITY: TURN UNDEAD! All undead within 30 feet must make a DC ${spellSaveDC} Wisdom save or be turned for 1 minute.`;
              break;
            }

            case "Channel Divinity: Preserve Life": {
              const healingPool = char.level * 5;

              if (healingDistribution) {
                // Apply the specified healing
                let totalHealed = 0;
                const healResults: string[] = [];

                for (const [targetCharId, amount] of Object.entries(healingDistribution)) {
                  const target = game.characters.find((c) => c.id === targetCharId);
                  if (target && totalHealed + amount <= healingPool) {
                    const maxHeal = Math.floor(target.maxHp / 2) - target.currentHp;
                    const actualHeal = Math.min(amount, Math.max(0, maxHeal));
                    if (actualHeal > 0) {
                      await updateCharacter(roomCode, targetCharId, {
                        currentHp: target.currentHp + actualHeal,
                      });
                      totalHealed += actualHeal;
                      healResults.push(`${target.name}: +${actualHeal} HP`);
                    }
                  }
                }

                resultMessage = `${char.name} uses CHANNEL DIVINITY: PRESERVE LIFE! Healing distributed: ${healResults.join(", ")}.`;
              } else {
                // Just report the available pool
                resultMessage = `${char.name} uses CHANNEL DIVINITY: PRESERVE LIFE! Can distribute ${healingPool} HP of healing to creatures within 30 feet (no creature above half max HP).`;
              }
              break;
            }
          }

          // Consume the feature use
          const updatedFeatures = char.features.map((f) => {
            if (f.name === baseFeatureName && f.usesPerRest && f.usesPerRest.current > 0) {
              return {
                ...f,
                usesPerRest: { ...f.usesPerRest, current: f.usesPerRest.current - 1 },
              };
            }
            return f;
          });
          updates.features = updatedFeatures;

          await updateCharacter(roomCode, characterId, updates);

          await addToTranscript(roomCode, {
            type: "combat",
            content: resultMessage,
          });

          return { used: featureName, character: char.name };
        },
      },

      equip_item: {
        description: "Equip a weapon, armor, or shield from inventory",
        inputSchema: equipItemSchema,
        execute: async ({
          characterId,
          itemId,
        }: z.infer<typeof equipItemSchema>) => {
          const char = game.characters.find((c) => c.id === characterId);
          if (!char) return { error: "Character not found" };

          const item = char.inventory.find((i) => i.id === itemId);
          if (!item) return { error: "Item not found in inventory" };

          await setThinking(roomCode, `${char.name} equips ${item.name}...`);

          const updates: Partial<Character> = {};
          let resultMessage = "";

          if (item.type === "weapon") {
            updates.equippedWeapon = itemId;
            resultMessage = `${char.name} equips ${item.name}.`;
          } else if (item.type === "armor") {
            const armorItem = item as Armor;
            if (armorItem.armorType === "shield") {
              updates.equippedShield = itemId;
              resultMessage = `${char.name} equips ${item.name}.`;
            } else {
              updates.equippedArmor = itemId;
              // Recalculate AC
              const newAC = calculateAC(
                { ...char, equippedArmor: itemId },
                armorItem,
                !!char.equippedShield
              );
              updates.armorClass = newAC;
              resultMessage = `${char.name} equips ${item.name}. (AC: ${newAC})`;
            }
          } else {
            return { error: `Cannot equip ${item.name} - not a weapon or armor` };
          }

          await updateCharacter(roomCode, characterId, updates);

          await addToTranscript(roomCode, {
            type: "system",
            content: resultMessage,
          });

          return { equipped: item.name, character: char.name };
        },
      },

      unequip_item: {
        description: "Unequip a weapon, armor, or shield",
        inputSchema: unequipItemSchema,
        execute: async ({
          characterId,
          slot,
        }: z.infer<typeof unequipItemSchema>) => {
          const char = game.characters.find((c) => c.id === characterId);
          if (!char) return { error: "Character not found" };

          await setThinking(roomCode, `${char.name} unequips...`);

          const updates: Partial<Character> = {};
          let itemName = "";

          if (slot === "weapon") {
            if (!char.equippedWeapon) return { error: "No weapon equipped" };
            itemName = char.inventory.find((i) => i.id === char.equippedWeapon)?.name || "weapon";
            updates.equippedWeapon = null;
          } else if (slot === "armor") {
            if (!char.equippedArmor) return { error: "No armor equipped" };
            itemName = char.inventory.find((i) => i.id === char.equippedArmor)?.name || "armor";
            updates.equippedArmor = null;
            // Recalculate AC (unarmored)
            const newAC = calculateAC({ ...char, equippedArmor: null }, null, !!char.equippedShield);
            updates.armorClass = newAC;
          } else if (slot === "shield") {
            if (!char.equippedShield) return { error: "No shield equipped" };
            itemName = char.inventory.find((i) => i.id === char.equippedShield)?.name || "shield";
            updates.equippedShield = null;
            // Recalculate AC (without shield)
            const currentArmor = char.equippedArmor
              ? (char.inventory.find((i) => i.id === char.equippedArmor) as Armor | undefined)
              : null;
            const newAC = calculateAC({ ...char, equippedShield: null }, currentArmor || null, false);
            updates.armorClass = newAC;
          }

          await updateCharacter(roomCode, characterId, updates);

          await addToTranscript(roomCode, {
            type: "system",
            content: `${char.name} unequips ${itemName}.${updates.armorClass ? ` (AC: ${updates.armorClass})` : ""}`,
          });

          return { unequipped: itemName, character: char.name };
        },
      },

      use_item: {
        description: "Use a consumable item like a potion",
        inputSchema: useItemSchema,
        execute: async ({
          characterId,
          itemId,
          targetId,
        }: z.infer<typeof useItemSchema>) => {
          const char = game.characters.find((c) => c.id === characterId);
          if (!char) return { error: "Character not found" };

          const item = char.inventory.find((i) => i.id === itemId);
          if (!item) return { error: "Item not found in inventory" };

          if (item.type !== "potion") {
            return { error: `Cannot use ${item.name} - not a consumable` };
          }

          const target = targetId
            ? game.characters.find((c) => c.id === targetId)
            : char;
          if (!target) return { error: "Target not found" };

          await setThinking(roomCode, `${char.name} uses ${item.name}...`);

          let resultMessage = "";

          // Handle potions
          if (itemId === "potion_healing" || item.name.toLowerCase().includes("healing")) {
            // Healing potion: 2d4+2
            const healRoll = roll("2d4+2");
            const healResult = healCharacter(target, healRoll.total);
            await updateCharacter(roomCode, target.id, { currentHp: healResult.newHp });
            resultMessage = `${char.name} uses ${item.name}! ${target.name} heals ${healRoll.total} HP. (${healResult.newHp}/${target.maxHp} HP)`;
          } else if (itemId === "potion_greater_healing" || item.name.toLowerCase().includes("greater healing")) {
            // Greater Healing potion: 4d4+4
            const healRoll = roll("4d4+4");
            const healResult = healCharacter(target, healRoll.total);
            await updateCharacter(roomCode, target.id, { currentHp: healResult.newHp });
            resultMessage = `${char.name} uses ${item.name}! ${target.name} heals ${healRoll.total} HP. (${healResult.newHp}/${target.maxHp} HP)`;
          } else {
            resultMessage = `${char.name} uses ${item.name}.`;
          }

          // Remove item from inventory (or reduce quantity)
          const newInventory = char.inventory
            .map((i) => {
              if (i.id === itemId) {
                if (i.quantity > 1) {
                  return { ...i, quantity: i.quantity - 1 };
                }
                return null; // Remove item
              }
              return i;
            })
            .filter((i): i is InventoryItem => i !== null);

          await updateCharacter(roomCode, characterId, { inventory: newInventory });

          await addToTranscript(roomCode, {
            type: "system",
            content: resultMessage,
          });

          return { used: item.name, character: char.name };
        },
      },

      give_item: {
        description: "Give a new item to a character",
        inputSchema: giveItemSchema,
        execute: async ({
          characterId,
          itemName,
          itemType,
          quantity,
          description,
        }: z.infer<typeof giveItemSchema>) => {
          const char = game.characters.find((c) => c.id === characterId);
          if (!char) return { error: "Character not found" };

          await setThinking(roomCode, `${char.name} receives ${itemName}...`);

          // Create new item
          const newItem: InventoryItem = {
            id: `${itemType}_${Date.now()}`,
            name: itemName,
            type: itemType,
            quantity: quantity || 1,
            weight: 1, // Default weight
            description,
          };

          // Check if it's a known item from equipment database
          const knownWeapon = Object.values(WEAPONS).find(
            (w) => w.name.toLowerCase() === itemName.toLowerCase()
          );
          const knownArmor = Object.values(ARMOR).find(
            (a) => a.name.toLowerCase() === itemName.toLowerCase()
          );
          const knownGear = Object.values(GEAR).find(
            (g) => g.name.toLowerCase() === itemName.toLowerCase()
          );

          let itemToAdd: InventoryItem = newItem;
          if (knownWeapon) {
            itemToAdd = { ...knownWeapon, quantity: quantity || 1 };
          } else if (knownArmor) {
            itemToAdd = { ...knownArmor, quantity: quantity || 1 };
          } else if (knownGear) {
            itemToAdd = { ...knownGear, quantity: quantity || 1 };
          }

          const newInventory = [...char.inventory, itemToAdd];
          await updateCharacter(roomCode, characterId, { inventory: newInventory });

          const qtyText = (quantity || 1) > 1 ? `${quantity}x ` : "";
          await addToTranscript(roomCode, {
            type: "system",
            content: `${char.name} receives ${qtyText}${itemName}.`,
          });

          return { item: itemName, character: char.name };
        },
      },

      give_gold: {
        description: "Give gold to a character",
        inputSchema: giveGoldSchema,
        execute: async ({
          characterId,
          amount,
          source,
        }: z.infer<typeof giveGoldSchema>) => {
          const char = game.characters.find((c) => c.id === characterId);
          if (!char) return { error: "Character not found" };

          await setThinking(roomCode, `${char.name} receives gold...`);

          const newGold = char.gold + amount;
          await updateCharacter(roomCode, characterId, { gold: newGold });

          await addToTranscript(roomCode, {
            type: "system",
            content: `${char.name} receives ${amount} gold from ${source}. (Total: ${newGold} gp)`,
          });

          return { gold: amount, newTotal: newGold, character: char.name };
        },
      },

      end_concentration: {
        description: "End concentration on a spell",
        inputSchema: endConcentrationSchema,
        execute: async ({
          characterId,
          reason,
        }: z.infer<typeof endConcentrationSchema>) => {
          const char = game.characters.find((c) => c.id === characterId);
          if (!char) return { error: "Character not found" };

          if (!char.concentrating) {
            return { error: `${char.name} is not concentrating on any spell` };
          }

          const spell = [...Object.values(CANTRIPS), ...Object.values(SPELLS_LEVEL_1), ...Object.values(SPELLS_LEVEL_2)]
            .find((s) => s.id === char.concentrating);

          await setThinking(roomCode, `${char.name} loses concentration...`);

          await updateCharacter(roomCode, characterId, { concentrating: null });

          await addToTranscript(roomCode, {
            type: "system",
            content: `${char.name} ends concentration on ${spell?.name || "spell"} (${reason}).`,
          });

          return { ended: spell?.name || char.concentrating, character: char.name };
        },
      },

      level_up: {
        description: "Level up a character who has enough XP",
        inputSchema: levelUpSchema,
        execute: async ({
          characterId,
        }: z.infer<typeof levelUpSchema>) => {
          const char = game.characters.find((c) => c.id === characterId);
          if (!char) return { error: "Character not found" };

          // Check if character has enough XP for next level
          const currentLevel = char.level;
          const targetLevel = getLevelFromXp(char.xp);

          if (targetLevel <= currentLevel) {
            return { error: "Not enough XP to level up" };
          }

          await setThinking(roomCode, `${char.name} levels up!`);

          const newLevel = currentLevel + 1;
          const classData = CLASSES[char.class];

          // Calculate HP increase (average + con mod)
          const hitDieAverage = parseInt(classData.hitDie.replace("d", "")) / 2 + 1;
          const conMod = getModifier(char.abilities.constitution);
          const hpIncrease = Math.max(1, Math.floor(hitDieAverage) + conMod);
          const newMaxHp = char.maxHp + hpIncrease;

          // Get new proficiency bonus
          const newProfBonus = getProficiencyBonus(newLevel);

          // Get new spell slots for casters
          const newSpellSlots = getSpellSlots(char.class, newLevel);

          // Get new features
          const newFeatures = getFeaturesAtLevel(char.class, newLevel);
          const allFeatures = [...char.features, ...newFeatures];

          // Update hit dice
          const newHitDice = {
            ...char.hitDice,
            total: newLevel,
            current: char.hitDice.current + 1,
          };

          await updateCharacter(roomCode, characterId, {
            level: newLevel,
            maxHp: newMaxHp,
            currentHp: char.currentHp + hpIncrease, // Heal on level up
            proficiencyBonus: newProfBonus,
            spellSlots: newSpellSlots,
            features: allFeatures,
            hitDice: newHitDice,
          });

          let levelUpMessage = `LEVEL UP! ${char.name} is now level ${newLevel}!`;
          levelUpMessage += ` (+${hpIncrease} HP, now ${newMaxHp} max)`;

          if (newFeatures.length > 0) {
            levelUpMessage += ` New features: ${newFeatures.map((f) => f.name).join(", ")}`;
          }

          await addToTranscript(roomCode, {
            type: "system",
            content: levelUpMessage,
          });

          return { newLevel, hpIncrease, newFeatures: newFeatures.map((f) => f.name) };
        },
      },

      rest: {
        description: "Take a short or long rest to recover resources",
        inputSchema: restSchema,
        execute: async ({
          restType,
          hitDiceToSpend,
        }: z.infer<typeof restSchema>) => {
          await setThinking(roomCode, `The party takes a ${restType} rest...`);

          const results: string[] = [];

          for (const char of game.characters) {
            const classData = CLASSES[char.class];
            let healedAmount = 0;

            if (restType === "short") {
              // Short rest: spend hit dice to heal
              const diceToSpend = Math.min(hitDiceToSpend || 1, char.hitDice.current);
              if (diceToSpend > 0) {
                const hitDieSize = parseInt(classData.hitDie.replace("d", ""));
                const conMod = getModifier(char.abilities.constitution);

                for (let i = 0; i < diceToSpend; i++) {
                  const roll = Math.floor(Math.random() * hitDieSize) + 1;
                  healedAmount += Math.max(1, roll + conMod);
                }

                const newHp = Math.min(char.maxHp, char.currentHp + healedAmount);
                const newHitDice = { ...char.hitDice, current: char.hitDice.current - diceToSpend };

                await updateCharacter(roomCode, char.id, {
                  currentHp: newHp,
                  hitDice: newHitDice,
                });

                results.push(`${char.name} spends ${diceToSpend} hit dice, heals ${healedAmount} HP (${newHp}/${char.maxHp})`);
              }

              // Reset short rest features (Second Wind, Action Surge)
              const updatedFeatures = char.features.map((f) => {
                if (f.usesPerRest?.restType === "short" && f.usesPerRest.current < f.usesPerRest.max) {
                  return { ...f, usesPerRest: { ...f.usesPerRest, current: f.usesPerRest.max } };
                }
                return f;
              });
              await updateCharacter(roomCode, char.id, { features: updatedFeatures });

            } else {
              // Long rest: full HP, recover half hit dice, restore all spell slots and features
              const halfHitDice = Math.max(1, Math.floor(char.level / 2));
              const newHitDiceCurrent = Math.min(char.level, char.hitDice.current + halfHitDice);

              // Restore spell slots
              const newSpellSlots = getSpellSlots(char.class, char.level);

              // Reset all features
              const updatedFeatures = char.features.map((f) => {
                if (f.usesPerRest) {
                  return { ...f, usesPerRest: { ...f.usesPerRest, current: f.usesPerRest.max } };
                }
                return f;
              });

              await updateCharacter(roomCode, char.id, {
                currentHp: char.maxHp,
                hitDice: { ...char.hitDice, current: newHitDiceCurrent },
                spellSlots: newSpellSlots,
                features: updatedFeatures,
                conditions: [], // Clear most conditions
              });

              results.push(`${char.name} fully rests (${char.maxHp} HP, spell slots restored)`);
            }
          }

          const restMessage = `${restType.toUpperCase()} REST COMPLETE\n${results.join("\n")}`;

          await addToTranscript(roomCode, {
            type: "system",
            content: restMessage,
          });

          // Update phase
          await updateGame(roomCode, { phase: "exploration" });

          return { restType, results };
        },
      },

      speak_as_npc: {
        description: "Have an NPC speak",
        inputSchema: speakAsNpcSchema,
        execute: async ({
          characterId,
          situation,
        }: z.infer<typeof speakAsNpcSchema>) => {
          const char = CHARACTERS[characterId];
          await setThinking(roomCode, `Channeling ${char.name}...`);

          const { text } = await generateText({
            model: anthropic("claude-sonnet-4-5"),
            prompt: `You are ${char.name}. Voice: ${char.voice}. Secret (reveal only if dramatic): ${char.secret}\n\nSituation: ${situation}\n\nRespond in character, 1-2 sentences:`,
            maxOutputTokens: 100,
          });

          await addToTranscript(roomCode, {
            type: "npc",
            content: text,
            speaker: char.name,
          });

          return { spoke: true };
        },
      },

      start_combat: {
        description: "Start combat with enemies",
        inputSchema: startCombatSchema,
        execute: async ({
          enemyType,
          count,
          environment,
        }: z.infer<typeof startCombatSchema>) => {
          await setThinking(roomCode, "Combat begins...");

          const enemies = createEnemyGroup(enemyType, count);
          if (enemies.length === 0) {
            return { error: "Unknown enemy type" };
          }

          // Roll initiative for all
          const playerInits = game.characters.map((c) => ({
            character: c,
            initiative: rollInitiative(c).total,
          }));

          const enemyInits = enemies.map((e) => ({
            enemy: e,
            initiative: rollEnemyInitiative(e).total,
          }));

          const combat = createCombatState(playerInits, enemyInits, environment);

          await updateGame(roomCode, {
            combat,
            phase: "combat",
          });

          // Log initiative order
          const initOrder = combat.initiativeOrder
            .map((c) => `${c.name}: ${c.initiative}`)
            .join(", ");

          await addToTranscript(roomCode, {
            type: "combat",
            content: `COMBAT BEGINS! Initiative: ${initOrder}`,
          });

          return { combat };
        },
      },

      end_combat: {
        description: "End combat",
        inputSchema: endCombatSchema,
        execute: async ({
          outcome,
          xpAwarded,
        }: z.infer<typeof endCombatSchema>) => {
          await setThinking(roomCode, "Combat ends...");

          await updateGame(roomCode, {
            combat: null,
            phase: "exploration",
          });

          let message = `Combat ends: ${outcome.toUpperCase()}!`;

          if (outcome === "victory" && xpAwarded) {
            // Award XP to all characters
            for (const char of game.characters) {
              await updateCharacter(roomCode, char.id, {
                xp: char.xp + xpAwarded,
              });
            }
            message += ` Each character gains ${xpAwarded} XP.`;
          }

          await addToTranscript(roomCode, {
            type: "combat",
            content: message,
          });

          return { outcome, xpAwarded };
        },
      },
    },
    stopWhen: stepCountIs(6),
  });

  // Collect the final narration
  let narration = "";
  for await (const chunk of result.textStream) {
    narration += chunk;
  }

  // Clear thinking and add narration
  await setThinking(roomCode, null);
  if (narration.trim()) {
    await addToTranscript(roomCode, {
      type: "narration",
      content: narration.trim(),
    });
  }

  return narration;
}
