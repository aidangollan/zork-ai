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
import { Character, Ability, Skill, DamageType, Spell, getProficiencyBonus, getLevelFromXp, getModifier } from "./character";
import { skillCheck, abilityCheck, savingThrow, getSpellSaveDC } from "./rules/abilities";
import { createEnemyGroup } from "./rules/enemies";
import { CANTRIPS, SPELLS_LEVEL_1, SPELLS_LEVEL_2, canCastSpell, useSpellSlot, rollSpellDamage } from "./rules/spells";
import { CLASSES, getMaxHp, getSpellSlots, getFeaturesAtLevel, getSneakAttackDice } from "./rules/classes";
import { WEAPONS, isFinesse, isRanged } from "./rules/equipment";
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
- level_up: When a character has enough XP to level up
- rest: When party takes a short or long rest
- speak_as_npc: When NPCs talk (use their voice!)
- start_combat: When combat begins
- end_combat: When combat ends

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
            content: resultText,
          });

          return { success: true, spell: spell.name };
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

          await setThinking(roomCode, `${char.name} takes damage...`);

          const result = applyDamage(char, amount, damageType as DamageType);

          await updateCharacter(roomCode, characterId, {
            currentHp: result.newHp,
          });

          let statusText = "";
          if (result.dead) {
            statusText = ` ${char.name} has died!`;
          } else if (result.unconscious) {
            statusText = ` ${char.name} falls unconscious!`;
          }

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
