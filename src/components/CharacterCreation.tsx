"use client";

import { useState } from "react";
import {
  Character,
  CharacterClass,
  Race,
  getModifier,
  calculateAC,
  Abilities,
  createEmptySpellSlots,
  Armor,
} from "@/lib/character";
import { CLASSES, getMaxHp, getSpellSlots } from "@/lib/rules/classes";
import { RACES, applyRacialBonuses } from "@/lib/rules/races";
import { getStartingEquipment } from "@/lib/rules/equipment";
import { getStartingCantrips, getStartingSpells } from "@/lib/rules/spells";

interface CharacterCreationProps {
  playerId: string;
  onComplete: (character: Character) => void;
}

type Step = "name" | "class" | "race" | "stats" | "confirm";

const CLASS_ICONS: Record<CharacterClass, string> = {
  fighter: "[ ]",
  wizard: "{*}",
  rogue: "</>",
  cleric: "(+)",
};

const RACE_ICONS: Record<Race, string> = {
  human: "[H]",
  elf: "[E]",
  dwarf: "[D]",
  halfling: "[h]",
};

export default function CharacterCreation({
  playerId,
  onComplete,
}: CharacterCreationProps) {
  const [step, setStep] = useState<Step>("name");
  const [name, setName] = useState("");
  const [selectedClass, setSelectedClass] = useState<CharacterClass | null>(null);
  const [selectedRace, setSelectedRace] = useState<Race | null>(null);
  const [swapStats, setSwapStats] = useState<[number, number] | null>(null);

  const classData = selectedClass ? CLASSES[selectedClass] : null;
  const raceData = selectedRace ? RACES[selectedRace] : null;

  // Get base abilities from class recommendation
  const getBaseAbilities = (): Abilities => {
    if (!classData) {
      return {
        strength: 10,
        dexterity: 10,
        constitution: 10,
        intelligence: 10,
        wisdom: 10,
        charisma: 10,
      };
    }
    return { ...classData.recommendedAbilities };
  };

  // Apply race bonuses to abilities
  const getFinalAbilities = (): Abilities => {
    let abilities = getBaseAbilities();

    // Apply stat swap if selected
    if (swapStats !== null) {
      const keys = Object.keys(abilities) as (keyof Abilities)[];
      const [i, j] = swapStats;
      const temp = abilities[keys[i]];
      abilities[keys[i]] = abilities[keys[j]];
      abilities[keys[j]] = temp;
    }

    // Apply racial bonuses
    if (selectedRace) {
      abilities = applyRacialBonuses(abilities, selectedRace);
    }

    return abilities;
  };

  const createCharacter = (): Character => {
    if (!selectedClass || !selectedRace || !classData || !raceData) {
      throw new Error("Invalid character configuration");
    }

    const abilities = getFinalAbilities();
    const startingEquipment = getStartingEquipment(classData.startingEquipment);

    const character: Character = {
      id: crypto.randomUUID(),
      playerId,
      name: name.trim(),
      race: selectedRace,
      class: selectedClass,
      level: 1,
      xp: 0,
      background: "",
      abilities,
      maxHp: getMaxHp(selectedClass, 1, abilities.constitution),
      currentHp: getMaxHp(selectedClass, 1, abilities.constitution),
      tempHp: 0,
      armorClass: 10 + getModifier(abilities.dexterity), // Will be recalculated with armor
      speed: raceData.speed,
      proficiencyBonus: 2,
      hitDice: { total: 1, current: 1, die: classData.hitDie },
      savingThrows: [...classData.savingThrows],
      skills: [...classData.defaultSkills],
      languages: ["Common", ...(raceData.languages || [])],
      armorProficiencies: classData.armorProficiencies ? [...classData.armorProficiencies] : [],
      weaponProficiencies: [...classData.weaponProficiencies],
      toolProficiencies: [...classData.toolProficiencies],
      inventory: startingEquipment,
      equippedArmor: null,
      equippedWeapon: null,
      equippedShield: null,
      gold: 15,
      spellcastingAbility: classData.spellcastingAbility || null,
      spellSlots: classData.spellcastingAbility ? getSpellSlots(selectedClass, 1) : createEmptySpellSlots(),
      knownSpells: (selectedClass === "wizard" || selectedClass === "cleric") ? getStartingSpells(selectedClass) : [],
      preparedSpells: [],
      cantripsKnown: (selectedClass === "wizard" || selectedClass === "cleric") ? getStartingCantrips(selectedClass) : [],
      features: classData.features.filter((f) => f.level <= 1),
      conditions: [],
      deathSaves: { successes: 0, failures: 0 },
      concentrating: null,
    };

    // Calculate AC based on equipment
    const armorItem = startingEquipment.find((i) => i.type === "armor" && i.id !== "shield") as Armor | undefined;
    const shield = startingEquipment.find((i) => i.id === "shield");

    if (armorItem) {
      character.equippedArmor = armorItem.id;
    }
    if (shield) {
      character.equippedShield = shield.id;
    }
    character.armorClass = calculateAC(character, armorItem || null, !!shield);

    // Set equipped weapon
    const weapon = startingEquipment.find((i) => i.type === "weapon");
    if (weapon) {
      character.equippedWeapon = weapon.id;
    }

    return character;
  };

  const handleSubmit = () => {
    const character = createCharacter();
    onComplete(character);
  };

  // ============= RENDER STEPS =============

  const renderNameStep = () => (
    <div className="space-y-4">
      <div className="text-green-400 text-lg">What is your name, adventurer?</div>
      <input
        type="text"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Enter character name..."
        className="w-full bg-black border border-green-700 text-green-400 p-2 outline-none focus:border-green-400"
        autoFocus
        onKeyDown={(e) => {
          if (e.key === "Enter" && name.trim()) {
            setStep("class");
          }
        }}
      />
      <button
        onClick={() => setStep("class")}
        disabled={!name.trim()}
        className="w-full bg-green-900 hover:bg-green-800 disabled:opacity-50 disabled:cursor-not-allowed text-green-400 py-2 border border-green-700"
      >
        Continue
      </button>
    </div>
  );

  const renderClassStep = () => (
    <div className="space-y-4">
      <div className="text-green-400 text-lg">Choose your class, {name}:</div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {(Object.keys(CLASSES) as CharacterClass[]).map((cls) => {
          const data = CLASSES[cls];
          const isSelected = selectedClass === cls;
          return (
            <button
              key={cls}
              onClick={() => setSelectedClass(cls)}
              className={`text-left p-3 border ${
                isSelected
                  ? "border-green-400 bg-green-900"
                  : "border-green-700 hover:border-green-500"
              }`}
            >
              <div className="flex items-center gap-2 text-green-300">
                <span className="text-green-600">{CLASS_ICONS[cls]}</span>
                <span className="font-bold">{data.displayName}</span>
              </div>
              <div className="text-green-600 text-sm mt-1">
                HP: d{data.hitDie} | {data.description.slice(0, 60)}...
              </div>
            </button>
          );
        })}
      </div>
      <div className="flex gap-2">
        <button
          onClick={() => setStep("name")}
          className="flex-1 bg-green-950 hover:bg-green-900 text-green-600 py-2 border border-green-800"
        >
          Back
        </button>
        <button
          onClick={() => setStep("race")}
          disabled={!selectedClass}
          className="flex-1 bg-green-900 hover:bg-green-800 disabled:opacity-50 disabled:cursor-not-allowed text-green-400 py-2 border border-green-700"
        >
          Continue
        </button>
      </div>
    </div>
  );

  const renderRaceStep = () => (
    <div className="space-y-4">
      <div className="text-green-400 text-lg">Choose your race:</div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {(Object.keys(RACES) as Race[]).map((race) => {
          const data = RACES[race];
          const isSelected = selectedRace === race;
          const bonuses = Object.entries(data.abilityScoreIncrease)
            .map(([key, val]) => `+${val} ${key.slice(0, 3).toUpperCase()}`)
            .join(", ");
          return (
            <button
              key={race}
              onClick={() => setSelectedRace(race)}
              className={`text-left p-3 border ${
                isSelected
                  ? "border-green-400 bg-green-900"
                  : "border-green-700 hover:border-green-500"
              }`}
            >
              <div className="flex items-center gap-2 text-green-300">
                <span className="text-green-600">{RACE_ICONS[race]}</span>
                <span className="font-bold">{data.displayName}</span>
              </div>
              <div className="text-green-600 text-sm mt-1">
                {bonuses} | Speed: {data.speed} ft.
              </div>
              <div className="text-green-700 text-xs mt-1">
                {data.traits.map((t) => t.name).join(", ")}
              </div>
            </button>
          );
        })}
      </div>
      <div className="flex gap-2">
        <button
          onClick={() => setStep("class")}
          className="flex-1 bg-green-950 hover:bg-green-900 text-green-600 py-2 border border-green-800"
        >
          Back
        </button>
        <button
          onClick={() => setStep("stats")}
          disabled={!selectedRace}
          className="flex-1 bg-green-900 hover:bg-green-800 disabled:opacity-50 disabled:cursor-not-allowed text-green-400 py-2 border border-green-700"
        >
          Continue
        </button>
      </div>
    </div>
  );

  const renderStatsStep = () => {
    const abilities = getFinalAbilities();
    const abilityKeys = Object.keys(abilities) as (keyof Abilities)[];

    return (
      <div className="space-y-4">
        <div className="text-green-400 text-lg">Your ability scores:</div>
        <div className="text-green-600 text-sm">
          Stats optimized for {classData?.displayName}. Click two stats to swap them.
        </div>
        <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
          {abilityKeys.map((ability, idx) => {
            const score = abilities[ability];
            const mod = getModifier(score);
            const modStr = mod >= 0 ? `+${mod}` : `${mod}`;
            const isSwapSelected = swapStats?.includes(idx);

            return (
              <button
                key={ability}
                onClick={() => {
                  if (swapStats === null) {
                    setSwapStats([idx, -1]);
                  } else if (swapStats[1] === -1) {
                    if (swapStats[0] !== idx) {
                      setSwapStats([swapStats[0], idx]);
                    } else {
                      setSwapStats(null);
                    }
                  } else {
                    setSwapStats([idx, -1]);
                  }
                }}
                className={`p-2 border text-center ${
                  isSwapSelected
                    ? "border-amber-400 bg-amber-900/30"
                    : "border-green-700 hover:border-green-500"
                }`}
              >
                <div className="text-green-600 text-xs uppercase">
                  {ability.slice(0, 3)}
                </div>
                <div className="text-green-300 text-xl">{score}</div>
                <div className="text-green-500 text-sm">({modStr})</div>
              </button>
            );
          })}
        </div>
        {swapStats && swapStats[1] !== -1 && (
          <button
            onClick={() => setSwapStats(null)}
            className="w-full text-amber-400 text-sm hover:text-amber-300"
          >
            Reset swap
          </button>
        )}
        <div className="flex gap-2">
          <button
            onClick={() => setStep("race")}
            className="flex-1 bg-green-950 hover:bg-green-900 text-green-600 py-2 border border-green-800"
          >
            Back
          </button>
          <button
            onClick={() => setStep("confirm")}
            className="flex-1 bg-green-900 hover:bg-green-800 text-green-400 py-2 border border-green-700"
          >
            Continue
          </button>
        </div>
      </div>
    );
  };

  const renderConfirmStep = () => {
    const abilities = getFinalAbilities();
    const hp = classData
      ? getMaxHp(selectedClass!, 1, abilities.constitution)
      : 0;
    const ac =
      10 +
      getModifier(abilities.dexterity) +
      (classData?.startingEquipment.includes("chain_mail") ? 6 : 0) +
      (classData?.startingEquipment.includes("shield") ? 2 : 0);

    return (
      <div className="space-y-4">
        <div className="text-green-400 text-lg">Confirm your character:</div>
        <div className="border border-green-700 p-4 space-y-3">
          <div className="text-center">
            <div className="text-green-300 text-2xl">{name}</div>
            <div className="text-green-500">
              {raceData?.displayName} {classData?.displayName}
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-green-600 text-xs">HP</div>
              <div className="text-green-300 text-xl">{hp}</div>
            </div>
            <div>
              <div className="text-green-600 text-xs">AC</div>
              <div className="text-green-300 text-xl">{ac}</div>
            </div>
            <div>
              <div className="text-green-600 text-xs">Speed</div>
              <div className="text-green-300 text-xl">{raceData?.speed}</div>
            </div>
          </div>
          <div className="grid grid-cols-6 gap-1 text-center">
            {(Object.keys(abilities) as (keyof Abilities)[]).map((ability) => {
              const score = abilities[ability];
              const mod = getModifier(score);
              return (
                <div key={ability}>
                  <div className="text-green-700 text-xs uppercase">
                    {ability.slice(0, 3)}
                  </div>
                  <div className="text-green-400">
                    {score}{" "}
                    <span className="text-green-600">
                      ({mod >= 0 ? `+${mod}` : mod})
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
          <div className="text-green-600 text-sm">
            <div>
              <span className="text-green-500">Saves:</span>{" "}
              {classData?.savingThrows.join(", ")}
            </div>
            <div>
              <span className="text-green-500">Skills:</span>{" "}
              {classData?.defaultSkills.join(", ")}
            </div>
            {raceData?.traits && (
              <div>
                <span className="text-green-500">Traits:</span>{" "}
                {raceData.traits.map((t) => t.name).join(", ")}
              </div>
            )}
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setStep("stats")}
            className="flex-1 bg-green-950 hover:bg-green-900 text-green-600 py-2 border border-green-800"
          >
            Back
          </button>
          <button
            onClick={handleSubmit}
            className="flex-1 bg-green-700 hover:bg-green-600 text-green-100 py-2 border border-green-500"
          >
            Begin Adventure
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-black text-green-400 font-mono p-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="text-green-600 text-sm">CHARACTER CREATION</div>
          <div className="text-green-800 text-xs mt-1">
            Step{" "}
            {step === "name"
              ? 1
              : step === "class"
              ? 2
              : step === "race"
              ? 3
              : step === "stats"
              ? 4
              : 5}{" "}
            of 5
          </div>
        </div>

        {/* Progress Bar */}
        <div className="flex gap-1 mb-8">
          {["name", "class", "race", "stats", "confirm"].map((s, i) => (
            <div
              key={s}
              className={`flex-1 h-1 ${
                ["name", "class", "race", "stats", "confirm"].indexOf(step) >= i
                  ? "bg-green-600"
                  : "bg-green-900"
              }`}
            />
          ))}
        </div>

        {/* Step Content */}
        {step === "name" && renderNameStep()}
        {step === "class" && renderClassStep()}
        {step === "race" && renderRaceStep()}
        {step === "stats" && renderStatsStep()}
        {step === "confirm" && renderConfirmStep()}
      </div>
    </div>
  );
}
