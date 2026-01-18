"use client";

import { Character, getModifier, Abilities } from "@/lib/character";
import { CLASSES } from "@/lib/rules/classes";

interface CharacterSheetProps {
  character: Character;
  isCurrentTurn?: boolean;
  compact?: boolean;
}

export default function CharacterSheet({
  character,
  isCurrentTurn = false,
  compact = false,
}: CharacterSheetProps) {
  const classData = CLASSES[character.class];
  const hpPercent = (character.currentHp / character.maxHp) * 100;
  const hpColor =
    hpPercent > 50
      ? "bg-green-600"
      : hpPercent > 25
      ? "bg-yellow-600"
      : "bg-red-600";

  const formatMod = (score: number) => {
    const mod = getModifier(score);
    return mod >= 0 ? `+${mod}` : `${mod}`;
  };

  if (compact) {
    return (
      <div
        className={`border p-2 ${
          isCurrentTurn ? "border-amber-400 bg-amber-900/20" : "border-green-800"
        }`}
      >
        <div className="flex justify-between items-center">
          <div>
            <span className="text-green-300">{character.name}</span>
            <span className="text-green-600 text-sm ml-2">
              L{character.level} {character.race} {character.class}
            </span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <span className="text-green-500">HP</span>
            <span
              className={
                character.currentHp <= character.maxHp / 4
                  ? "text-red-400"
                  : character.currentHp <= character.maxHp / 2
                  ? "text-yellow-400"
                  : "text-green-400"
              }
            >
              {character.currentHp}/{character.maxHp}
            </span>
            <span className="text-green-700">|</span>
            <span className="text-green-500">AC</span>
            <span className="text-green-400">{character.armorClass}</span>
          </div>
        </div>
        {isCurrentTurn && (
          <div className="text-amber-400 text-xs mt-1">Your turn!</div>
        )}
      </div>
    );
  }

  return (
    <div
      className={`border p-3 space-y-3 ${
        isCurrentTurn ? "border-amber-400" : "border-green-800"
      }`}
    >
      {/* Header */}
      <div className="text-center border-b border-green-900 pb-2">
        <div className="text-green-300 text-lg">{character.name}</div>
        <div className="text-green-600 text-sm">
          Level {character.level} {character.race.charAt(0).toUpperCase() + character.race.slice(1)}{" "}
          {classData.displayName}
        </div>
        {isCurrentTurn && (
          <div className="text-amber-400 text-sm mt-1">-- YOUR TURN --</div>
        )}
      </div>

      {/* HP Bar */}
      <div>
        <div className="flex justify-between text-sm mb-1">
          <span className="text-green-600">Hit Points</span>
          <span className="text-green-400">
            {character.currentHp} / {character.maxHp}
            {character.tempHp > 0 && (
              <span className="text-cyan-400"> (+{character.tempHp})</span>
            )}
          </span>
        </div>
        <div className="h-2 bg-green-950 border border-green-800">
          <div
            className={`h-full ${hpColor} transition-all duration-300`}
            style={{ width: `${Math.min(100, hpPercent)}%` }}
          />
        </div>
      </div>

      {/* Combat Stats */}
      <div className="grid grid-cols-3 gap-2 text-center">
        <div className="border border-green-800 p-2">
          <div className="text-green-700 text-xs">AC</div>
          <div className="text-green-300 text-xl">{character.armorClass}</div>
        </div>
        <div className="border border-green-800 p-2">
          <div className="text-green-700 text-xs">Speed</div>
          <div className="text-green-300 text-xl">{character.speed}</div>
        </div>
        <div className="border border-green-800 p-2">
          <div className="text-green-700 text-xs">Prof</div>
          <div className="text-green-300 text-xl">+{character.proficiencyBonus}</div>
        </div>
      </div>

      {/* Ability Scores */}
      <div className="grid grid-cols-6 gap-1 text-center text-sm">
        {(Object.keys(character.abilities) as (keyof Abilities)[]).map((ability) => {
          const score = character.abilities[ability];
          const isSave = character.savingThrows.includes(ability);
          return (
            <div
              key={ability}
              className={`border p-1 ${
                isSave ? "border-green-600" : "border-green-900"
              }`}
            >
              <div className="text-green-700 text-xs uppercase">
                {ability.slice(0, 3)}
              </div>
              <div className="text-green-400">{score}</div>
              <div className="text-green-600 text-xs">{formatMod(score)}</div>
            </div>
          );
        })}
      </div>

      {/* Conditions */}
      {character.conditions.length > 0 && (
        <div className="border-t border-green-900 pt-2">
          <div className="text-red-500 text-sm">
            Conditions:{" "}
            {character.conditions.map((c) => (
              <span key={c} className="text-red-400">
                {c}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Death Saves (only show when at 0 HP) */}
      {character.currentHp === 0 && (
        <div className="border-t border-red-900 pt-2">
          <div className="text-red-500 text-sm text-center">DEATH SAVES</div>
          <div className="flex justify-center gap-4 mt-1">
            <div className="text-green-500">
              Successes: {character.deathSaves.successes}/3
            </div>
            <div className="text-red-500">
              Failures: {character.deathSaves.failures}/3
            </div>
          </div>
        </div>
      )}

      {/* Equipped Items */}
      <div className="border-t border-green-900 pt-2 text-sm">
        <div className="text-green-700 text-xs mb-1">EQUIPPED</div>
        <div className="text-green-500">
          {character.equippedWeapon && (
            <div>
              Weapon:{" "}
              <span className="text-green-400">
                {character.inventory.find((i) => i.id === character.equippedWeapon)?.name || character.equippedWeapon}
              </span>
            </div>
          )}
          {character.equippedArmor && (
            <div>
              Armor:{" "}
              <span className="text-green-400">
                {character.inventory.find((i) => i.id === character.equippedArmor)?.name || character.equippedArmor}
              </span>
            </div>
          )}
          {character.equippedShield && (
            <div>
              Shield:{" "}
              <span className="text-green-400">
                {character.inventory.find((i) => i.id === character.equippedShield)?.name || "Shield"}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Gold */}
      <div className="flex justify-between text-sm">
        <span className="text-green-700">Gold</span>
        <span className="text-yellow-500">{character.gold} gp</span>
      </div>

      {/* XP */}
      <div className="flex justify-between text-sm">
        <span className="text-green-700">Experience</span>
        <span className="text-green-500">{character.xp} XP</span>
      </div>
    </div>
  );
}
