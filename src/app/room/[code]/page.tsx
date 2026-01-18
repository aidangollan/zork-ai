"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useParams } from "next/navigation";
import CharacterCreation from "@/components/CharacterCreation";
import CharacterSheet from "@/components/CharacterSheet";
import { Character } from "@/lib/character";

interface Entry {
  id: string;
  type: "narration" | "player" | "dice" | "npc" | "combat" | "system";
  content: string;
  speaker?: string;
  characterId?: string;
  ts: number;
}

interface Player {
  id: string;
  name: string;
  characterId: string | null;
}

interface CombatState {
  active: boolean;
  round: number;
  turnIndex: number;
  initiativeOrder: { id: string; name: string; initiative: number }[];
  enemies: { id: string; name: string; currentHp: number; maxHp: number }[];
}

interface GameState {
  roomCode: string;
  players: Player[];
  characters: Character[];
  transcript: Entry[];
  phase: "character_creation" | "exploration" | "combat" | "social" | "rest";
  combat: CombatState | null;
  currentTurn: string | null;
  thinking: { active: boolean; phase: string } | null;
  lastUpdate: number;
}

type ViewState = "loading" | "join" | "intro" | "character_creation" | "how_to_play" | "game";

export default function Room() {
  const { code } = useParams<{ code: string }>();
  const [game, setGame] = useState<GameState | null>(null);
  const [viewState, setViewState] = useState<ViewState>("loading");
  const [playerId, setPlayerId] = useState<string | null>(null);
  const [playerName, setPlayerName] = useState("");
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [showSheet, setShowSheet] = useState(true);
  const [seenIntro, setSeenIntro] = useState(false);
  const [seenHowToPlay, setSeenHowToPlay] = useState(false);
  const termRef = useRef<HTMLDivElement>(null);
  const lastUpdate = useRef(0);

  // Get current player and character
  const currentPlayer = game?.players.find((p) => p.id === playerId);
  const currentCharacter = game?.characters.find(
    (c) => c.id === currentPlayer?.characterId
  );

  // Determine view state based on game state and player
  const determineViewState = useCallback(
    (gameData: GameState, pid: string | null, introSeen: boolean, howToPlaySeen: boolean): ViewState => {
      if (!pid) return "join";

      const player = gameData.players.find((p) => p.id === pid);
      if (!player) return "join";

      // Returning player with character - go straight to game
      if (player.characterId) {
        return "game";
      }

      // New player onboarding flow: intro → character creation → how to play
      if (!introSeen) return "intro";
      return "character_creation";
    },
    []
  );

  // Load player ID from localStorage
  useEffect(() => {
    const storedPlayerId = localStorage.getItem(`player_${code}`);
    if (storedPlayerId) {
      setPlayerId(storedPlayerId);
    }
  }, [code]);

  // Poll for updates
  useEffect(() => {
    const poll = async () => {
      try {
        const res = await fetch(`/api/game/${code}`);
        const data = await res.json();
        if (data.lastUpdate !== lastUpdate.current) {
          setGame(data);
          lastUpdate.current = data.lastUpdate;
          setViewState(determineViewState(data, playerId, seenIntro, seenHowToPlay));
        }
      } catch (e) {
        console.error(e);
      }
    };

    poll();
    const interval = setInterval(poll, 2000);
    return () => clearInterval(interval);
  }, [code, playerId, seenIntro, seenHowToPlay, determineViewState]);

  // Update view state when playerId or seen states change
  useEffect(() => {
    if (game) {
      setViewState(determineViewState(game, playerId, seenIntro, seenHowToPlay));
    }
  }, [game, playerId, seenIntro, seenHowToPlay, determineViewState]);

  // Auto-scroll transcript
  useEffect(() => {
    termRef.current?.scrollTo(0, termRef.current.scrollHeight);
  }, [game?.transcript, game?.thinking]);

  // Join game
  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!playerName.trim()) return;

    setLoading(true);
    try {
      const res = await fetch(`/api/game/${code}/player`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "join", playerName: playerName.trim() }),
      });
      const data = await res.json();

      if (data.success) {
        setPlayerId(data.playerId);
        localStorage.setItem(`player_${code}`, data.playerId);
        setGame(data.game);
        setViewState("intro"); // Show intro first, then character creation
      } else {
        alert(data.error || "Could not join game");
      }
    } catch (e) {
      console.error(e);
      alert("Error joining game");
    }
    setLoading(false);
  };

  // Create character
  const handleCharacterCreate = async (character: Character) => {
    if (!playerId) return;

    setLoading(true);
    try {
      const res = await fetch(`/api/game/${code}/player`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "createCharacter",
          playerId,
          character,
        }),
      });
      const data = await res.json();

      if (data.success) {
        setGame(data.game);
        setViewState("how_to_play"); // Show how-to-play before starting game
      } else {
        alert(data.error || "Could not create character");
      }
    } catch (e) {
      console.error(e);
      alert("Error creating character");
    }
    setLoading(false);
  };

  // Submit action
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    setLoading(true);
    const action = input.trim();
    setInput("");

    try {
      const res = await fetch(`/api/game/${code}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action,
          playerId,
          characterId: currentCharacter?.id,
        }),
      });
      const data = await res.json();
      setGame(data);
      lastUpdate.current = data.lastUpdate;
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  const thinking = game?.thinking?.active ? game.thinking.phase : null;

  // ============= RENDER STATES =============

  if (viewState === "loading") {
    return (
      <div className="h-screen bg-black text-green-400 font-mono flex items-center justify-center">
        <div className="animate-pulse">Loading...</div>
      </div>
    );
  }

  if (viewState === "join") {
    return (
      <div className="h-screen bg-black text-green-400 font-mono flex items-center justify-center p-4">
        <div className="max-w-md w-full space-y-6">
          <div className="text-center">
            <div className="text-2xl text-green-300">AI DND</div>
            <div className="text-green-600 text-sm">Room: {code}</div>
          </div>

          {game && game.players.length > 0 && (
            <div className="border border-green-800 p-3">
              <div className="text-green-600 text-sm mb-2">Current Players:</div>
              {game.players.map((p) => (
                <div key={p.id} className="text-green-400">
                  {p.name}
                  {p.characterId && (
                    <span className="text-green-600 ml-2">
                      ({game.characters.find((c) => c.id === p.characterId)?.name})
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}

          {game && game.players.length >= 4 ? (
            <div className="text-red-500 text-center">Room is full (4/4 players)</div>
          ) : (
            <form onSubmit={handleJoin} className="space-y-4">
              <div>
                <label className="text-green-600 text-sm">Your Name</label>
                <input
                  type="text"
                  value={playerName}
                  onChange={(e) => setPlayerName(e.target.value)}
                  placeholder="Enter your name..."
                  className="w-full bg-black border border-green-700 text-green-400 p-2 mt-1 outline-none focus:border-green-400"
                  autoFocus
                  disabled={loading}
                />
              </div>
              <button
                type="submit"
                disabled={!playerName.trim() || loading}
                className="w-full bg-green-900 hover:bg-green-800 disabled:opacity-50 disabled:cursor-not-allowed text-green-400 py-2 border border-green-700"
              >
                {loading ? "Joining..." : "Join Game"}
              </button>
            </form>
          )}
        </div>
      </div>
    );
  }

  if (viewState === "intro") {
    return (
      <div className="min-h-screen bg-black text-green-400 font-mono flex items-center justify-center p-4">
        <div className="max-w-2xl w-full space-y-6">
          <div className="text-center space-y-2">
            <div className="text-3xl text-green-300">Welcome to ZORK-DM</div>
            <div className="text-green-600">An AI-Powered D&D 5e Adventure</div>
          </div>

          <div className="border border-green-800 p-6 space-y-4">
            <div className="text-green-300 text-lg">What is this?</div>
            <p className="text-green-500 leading-relaxed">
              ZORK-DM is a text-based D&D 5th Edition game powered by AI. An AI Dungeon Master
              runs the adventure, controls NPCs, manages combat, and responds to your actions
              in real-time.
            </p>

            <div className="text-green-300 text-lg mt-4">How it works:</div>
            <ul className="text-green-500 space-y-2 list-disc list-inside">
              <li>Create a character (Fighter, Wizard, Rogue, or Cleric)</li>
              <li>Type what you want to do in natural language</li>
              <li>The AI DM narrates the story and handles all dice rolls</li>
              <li>Explore, fight monsters, cast spells, and roleplay!</li>
            </ul>

            <div className="text-green-300 text-lg mt-4">Combat & Rolls:</div>
            <ul className="text-green-500 space-y-2 list-disc list-inside">
              <li>Roll d20 + modifiers for attacks and ability checks</li>
              <li>Natural 20 = critical hit (double damage dice)</li>
              <li>Natural 1 = automatic miss</li>
            </ul>

            <div className="text-green-300 text-lg mt-4">Death & Recovery:</div>
            <ul className="text-green-500 space-y-2 list-disc list-inside">
              <li>At 0 HP, you fall unconscious and start making death saves</li>
              <li>Each turn: roll d20. 10+ = success, 9 or less = failure</li>
              <li>3 successes = stabilized. 3 failures = death</li>
              <li>Natural 1 = 2 failures. Natural 20 = wake up with 1 HP!</li>
              <li>Allies can heal you or use Medicine to stabilize you</li>
            </ul>

            <div className="text-green-300 text-lg mt-4">Resting:</div>
            <ul className="text-green-500 space-y-2 list-disc list-inside">
              <li><span className="text-green-300">Short Rest (1 hour):</span> Spend Hit Dice to heal</li>
              <li><span className="text-green-300">Long Rest (8 hours):</span> Restore all HP and spell slots</li>
              <li>Say &quot;take a short rest&quot; or &quot;long rest&quot; when safe</li>
            </ul>
          </div>

          <button
            onClick={() => setSeenIntro(true)}
            className="w-full py-3 border border-green-700 hover:bg-green-900/30 text-green-400"
          >
            [ CREATE YOUR CHARACTER ]
          </button>
        </div>
      </div>
    );
  }

  if (viewState === "character_creation") {
    return (
      <CharacterCreation playerId={playerId!} onComplete={handleCharacterCreate} />
    );
  }

  if (viewState === "how_to_play") {
    return (
      <div className="min-h-screen bg-black text-green-400 font-mono flex items-center justify-center p-4">
        <div className="max-w-2xl w-full space-y-6">
          <div className="text-center space-y-2">
            <div className="text-2xl text-green-300">How to Play</div>
            <div className="text-green-600">
              {currentCharacter?.name} the {currentCharacter?.race} {currentCharacter?.class}
            </div>
          </div>

          <div className="border border-green-800 p-6 space-y-4">
            <div className="text-green-300">Type commands in natural language:</div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div className="space-y-2">
                <div className="text-amber-400">Exploration:</div>
                <ul className="text-green-500 space-y-1">
                  <li>&quot;Look around&quot;</li>
                  <li>&quot;Search the room&quot;</li>
                  <li>&quot;Open the door&quot;</li>
                  <li>&quot;Talk to the innkeeper&quot;</li>
                </ul>
              </div>

              <div className="space-y-2">
                <div className="text-red-400">Combat:</div>
                <ul className="text-green-500 space-y-1">
                  <li>&quot;Attack the goblin with my sword&quot;</li>
                  <li>&quot;Cast fire bolt at the skeleton&quot;</li>
                  <li>&quot;Dodge&quot;</li>
                  <li>&quot;Use Second Wind&quot;</li>
                </ul>
              </div>

              <div className="space-y-2">
                <div className="text-cyan-400">Spellcasting:</div>
                <ul className="text-green-500 space-y-1">
                  <li>&quot;Cast cure wounds on myself&quot;</li>
                  <li>&quot;Cast magic missile&quot;</li>
                  <li>&quot;Use my cantrip fire bolt&quot;</li>
                </ul>
              </div>

              <div className="space-y-2">
                <div className="text-purple-400">Social:</div>
                <ul className="text-green-500 space-y-1">
                  <li>&quot;Persuade the guard to let us pass&quot;</li>
                  <li>&quot;Intimidate the bandit&quot;</li>
                  <li>&quot;Ask about the Crimson Citadel&quot;</li>
                </ul>
              </div>
            </div>

            <div className="border-t border-green-800 pt-4 mt-4">
              <div className="text-green-300 mb-2">Your Character Sheet:</div>
              <div className="text-green-500 text-sm">
                The right sidebar shows your HP, AC, abilities, spells, and inventory.
                The AI tracks everything automatically - just focus on roleplaying!
              </div>
            </div>

            <div className="border-t border-green-800 pt-4 mt-4">
              <div className="text-green-300 mb-2">Quick Tips:</div>
              <ul className="text-green-500 text-sm space-y-1 list-disc list-inside">
                <li>At 0 HP? The DM handles death saves - your allies can heal or stabilize you</li>
                <li>Low on HP? Say &quot;take a short rest&quot; to spend hit dice and heal</li>
                <li>Out of spell slots? A long rest restores everything</li>
                <li>In combat, you can move AND take an action each turn</li>
              </ul>
            </div>
          </div>

          <button
            onClick={() => setSeenHowToPlay(true)}
            className="w-full py-3 border border-green-700 hover:bg-green-900/30 text-green-400"
          >
            [ BEGIN ADVENTURE ]
          </button>
        </div>
      </div>
    );
  }

  // ============= GAME VIEW =============

  return (
    <div className="h-screen bg-black text-green-400 font-mono flex flex-col">
      {/* Header */}
      <div className="border-b border-green-900 p-2 flex justify-between items-center text-sm">
        <div className="flex items-center gap-4">
          <span className="text-green-300">AI DND</span>
          <span className="text-green-700">room: {code}</span>
          {game?.phase && (
            <span
              className={`px-2 py-0.5 text-xs ${
                game.phase === "combat"
                  ? "bg-red-900 text-red-400"
                  : game.phase === "exploration"
                  ? "bg-green-900 text-green-400"
                  : "bg-yellow-900 text-yellow-400"
              }`}
            >
              {game.phase.toUpperCase()}
            </span>
          )}
        </div>
        <div className="flex items-center gap-4">
          <span className="text-green-600">
            {game?.players.length}/4 players
          </span>
          <button
            onClick={() => setShowSheet(!showSheet)}
            className="text-green-600 hover:text-green-400 text-xs"
          >
            [{showSheet ? "Hide" : "Show"} Sheet]
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Transcript */}
        <div className="flex-1 flex flex-col">
          {/* Waiting for other players to create characters */}
          {game && game.players.length > 1 && (() => {
            const playersWithoutChars = game.players.filter(p => !p.characterId);
            if (playersWithoutChars.length > 0) {
              return (
                <div className="bg-yellow-900/30 border-b border-yellow-800 px-4 py-2 text-yellow-400 text-sm">
                  Waiting for {playersWithoutChars.map(p => p.name).join(", ")} to create {playersWithoutChars.length === 1 ? "a character" : "characters"}...
                </div>
              );
            }
            return null;
          })()}
          <div ref={termRef} className="flex-1 overflow-y-auto p-4 space-y-3">
            {game?.transcript.map((e) => {
              const time = new Date(e.ts);
              const timeStr = time.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
              return (
              <div
                key={e.id}
                className={`flex gap-2 ${
                  e.type === "player"
                    ? "text-amber-400"
                    : e.type === "dice"
                    ? "text-cyan-400"
                    : e.type === "npc"
                    ? "text-yellow-300"
                    : e.type === "combat"
                    ? "text-red-400"
                    : e.type === "system"
                    ? "text-purple-400"
                    : "text-green-400"
                }`}
              >
                <span className="text-green-800 text-xs shrink-0 pt-0.5">{timeStr}</span>
                <span className="flex-1">
                  {e.type === "npc" && e.speaker && (
                    <span className="text-yellow-500">{e.speaker}: </span>
                  )}
                  {e.type === "player" && e.characterId && (
                    <span className="text-amber-600">
                      [{game.characters.find((c) => c.id === e.characterId)?.name || "Player"}]:{" "}
                    </span>
                  )}
                  <span className="whitespace-pre-wrap">{e.content}</span>
                </span>
              </div>
              );
            })}

            {thinking && (
              <div className="text-green-600 animate-pulse">{thinking}</div>
            )}

            {loading && !thinking && (
              <div className="text-green-700 animate-pulse">...</div>
            )}
          </div>

          {/* Combat Tracker (when in combat) */}
          {game?.phase === "combat" && game.combat && (() => {
            const currentCombatant = game.combat.initiativeOrder?.[game.combat.turnIndex];
            const isMyTurn = game.currentTurn === currentCharacter?.id;
            const currentTurnChar = game.characters.find(c => c.id === currentCombatant?.id);
            const currentTurnPlayer = currentTurnChar
              ? game.players.find(p => p.characterId === currentTurnChar.id)
              : null;
            const isEnemyTurn = currentCombatant && !game.characters.some(c => c.id === currentCombatant.id);

            return (
            <div className="border-t border-red-900 p-3 bg-red-950/30 space-y-2">
              <div className="flex justify-between items-center">
                <div className="text-red-400 text-sm font-bold">⚔ COMBAT - Round {game.combat.round || 1}</div>
                {isMyTurn ? (
                  <span className="text-amber-400 text-sm animate-pulse font-bold">YOUR TURN!</span>
                ) : isEnemyTurn ? (
                  <span className="text-red-400 text-sm">{currentCombatant?.name}&apos;s turn</span>
                ) : currentTurnPlayer ? (
                  <span className="text-cyan-400 text-sm">
                    Waiting for {currentTurnPlayer.name} ({currentTurnChar?.name})
                  </span>
                ) : null}
              </div>

              {/* Initiative Order */}
              {game.combat.initiativeOrder && game.combat.initiativeOrder.length > 0 && (
                <div className="flex flex-wrap gap-1 text-xs">
                  {game.combat.initiativeOrder.map((combatant, idx) => {
                    const isCurrentTurn = idx === game.combat!.turnIndex;
                    const isNextTurn = idx === (game.combat!.turnIndex + 1) % game.combat!.initiativeOrder.length;
                    const isPlayer = game.characters.some((c) => c.id === combatant.id);
                    const isMe = combatant.id === currentCharacter?.id;
                    return (
                      <span
                        key={combatant.id}
                        className={`px-2 py-0.5 border ${
                          isCurrentTurn
                            ? "border-amber-400 bg-amber-900/50 text-amber-300"
                            : isNextTurn
                            ? "border-cyan-600 text-cyan-400"
                            : isPlayer
                            ? "border-green-700 text-green-500"
                            : "border-red-800 text-red-500"
                        } ${isMe ? "font-bold underline" : ""}`}
                      >
                        {isCurrentTurn && "▶ "}{combatant.name} ({combatant.initiative})
                      </span>
                    );
                  })}
                </div>
              )}

              {/* Enemies */}
              {game.combat.enemies && game.combat.enemies.length > 0 && (
                <div className="space-y-1">
                  <div className="text-red-600 text-xs">ENEMIES</div>
                  {game.combat.enemies.filter(e => e.currentHp > 0).map((enemy) => {
                    const hpPercent = (enemy.currentHp / enemy.maxHp) * 100;
                    return (
                      <div key={enemy.id} className="flex items-center gap-2 text-xs">
                        <span className="text-red-400 w-24 truncate">{enemy.name}</span>
                        <div className="flex-1 h-2 bg-red-950 border border-red-800">
                          <div
                            className={`h-full transition-all ${
                              hpPercent > 50
                                ? "bg-red-600"
                                : hpPercent > 25
                                ? "bg-orange-600"
                                : "bg-red-800"
                            }`}
                            style={{ width: `${Math.max(0, hpPercent)}%` }}
                          />
                        </div>
                        <span className="text-red-500 w-16 text-right">
                          {enemy.currentHp}/{enemy.maxHp}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Combat Tips - shown to everyone so they can plan */}
              <div className={`text-xs border-t border-red-900 pt-2 ${isMyTurn ? "text-amber-500" : "text-green-700"}`}>
                {isMyTurn ? "Your actions: " : "Actions: "}
                attack [target], cast [spell], dodge, dash, disengage, help, hide
              </div>
            </div>
            );
          })()}

          {/* Input */}
          <form
            onSubmit={handleSubmit}
            className="border-t border-green-900 p-4 flex"
          >
            <span className="text-green-600 mr-2">&gt;</span>
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              disabled={loading}
              className="flex-1 bg-transparent outline-none disabled:opacity-50"
              placeholder={
                loading
                  ? ""
                  : currentCharacter
                  ? `${currentCharacter.name}, what do you do?`
                  : "What do you do?"
              }
              autoFocus
            />
          </form>
        </div>

        {/* Character Sheet Sidebar */}
        {showSheet && currentCharacter && (
          <div className="w-64 border-l border-green-900 p-3 overflow-y-auto hidden md:block">
            <CharacterSheet
              character={currentCharacter}
              isCurrentTurn={game?.currentTurn === currentCharacter.id}
            />

            {/* Other party members */}
            {game && game.characters.length > 1 && (
              <div className="mt-4 space-y-2">
                <div className="text-green-700 text-xs">PARTY</div>
                {game.characters
                  .filter((c) => c.id !== currentCharacter.id)
                  .map((c) => (
                    <CharacterSheet
                      key={c.id}
                      character={c}
                      compact
                      isCurrentTurn={game.currentTurn === c.id}
                    />
                  ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
