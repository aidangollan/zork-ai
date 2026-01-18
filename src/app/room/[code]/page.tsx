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

type ViewState = "loading" | "join" | "character_creation" | "game";

export default function Room() {
  const { code } = useParams<{ code: string }>();
  const [game, setGame] = useState<GameState | null>(null);
  const [viewState, setViewState] = useState<ViewState>("loading");
  const [playerId, setPlayerId] = useState<string | null>(null);
  const [playerName, setPlayerName] = useState("");
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [showSheet, setShowSheet] = useState(true);
  const termRef = useRef<HTMLDivElement>(null);
  const lastUpdate = useRef(0);

  // Get current player and character
  const currentPlayer = game?.players.find((p) => p.id === playerId);
  const currentCharacter = game?.characters.find(
    (c) => c.id === currentPlayer?.characterId
  );

  // Determine view state based on game state and player
  const determineViewState = useCallback(
    (gameData: GameState, pid: string | null): ViewState => {
      if (!pid) return "join";

      const player = gameData.players.find((p) => p.id === pid);
      if (!player) return "join";

      if (!player.characterId) return "character_creation";

      return "game";
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
          setViewState(determineViewState(data, playerId));
        }
      } catch (e) {
        console.error(e);
      }
    };

    poll();
    const interval = setInterval(poll, 2000);
    return () => clearInterval(interval);
  }, [code, playerId, determineViewState]);

  // Update view state when playerId changes
  useEffect(() => {
    if (game) {
      setViewState(determineViewState(game, playerId));
    }
  }, [game, playerId, determineViewState]);

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
        setViewState("character_creation");
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
        setViewState("game");
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

  if (viewState === "character_creation") {
    return (
      <CharacterCreation playerId={playerId!} onComplete={handleCharacterCreate} />
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
          <div ref={termRef} className="flex-1 overflow-y-auto p-4 space-y-3">
            {game?.transcript.map((e) => (
              <div
                key={e.id}
                className={
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
                }
              >
                {e.type === "npc" && e.speaker && (
                  <span className="text-yellow-500">{e.speaker}: </span>
                )}
                {e.type === "player" && e.characterId && (
                  <span className="text-amber-600">
                    [{game.characters.find((c) => c.id === e.characterId)?.name || "Player"}]:{" "}
                  </span>
                )}
                <span className="whitespace-pre-wrap">{e.content}</span>
              </div>
            ))}

            {thinking && (
              <div className="text-green-600 animate-pulse">{thinking}</div>
            )}

            {loading && !thinking && (
              <div className="text-green-700 animate-pulse">...</div>
            )}
          </div>

          {/* Combat Tracker (when in combat) */}
          {game?.phase === "combat" && game.combat && (
            <div className="border-t border-red-900 p-3 bg-red-950/30 space-y-2">
              <div className="flex justify-between items-center">
                <div className="text-red-400 text-sm font-bold">⚔ COMBAT - Round {game.combat.round || 1}</div>
                {game.currentTurn === currentCharacter?.id && (
                  <span className="text-amber-400 text-xs animate-pulse">YOUR TURN</span>
                )}
              </div>

              {/* Initiative Order */}
              {game.combat.initiativeOrder && game.combat.initiativeOrder.length > 0 && (
                <div className="flex flex-wrap gap-1 text-xs">
                  {game.combat.initiativeOrder.map((combatant, idx) => {
                    const isCurrentTurn = idx === game.combat!.turnIndex;
                    const isPlayer = game.characters.some((c) => c.id === combatant.id);
                    const isMe = combatant.id === currentCharacter?.id;
                    return (
                      <span
                        key={combatant.id}
                        className={`px-2 py-0.5 border ${
                          isCurrentTurn
                            ? "border-amber-400 bg-amber-900/50 text-amber-300"
                            : isPlayer
                            ? "border-green-700 text-green-500"
                            : "border-red-800 text-red-500"
                        } ${isMe ? "font-bold" : ""}`}
                      >
                        {combatant.name} ({combatant.initiative})
                      </span>
                    );
                  })}
                </div>
              )}

              {/* Enemies */}
              {game.combat.enemies && game.combat.enemies.length > 0 && (
                <div className="space-y-1">
                  <div className="text-red-600 text-xs">ENEMIES</div>
                  {game.combat.enemies.map((enemy) => {
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

              {/* Combat Tips */}
              {game.currentTurn === currentCharacter?.id && (
                <div className="text-amber-600 text-xs border-t border-red-900 pt-2">
                  Actions: attack [target], cast [spell], move, dodge, dash, help, hide
                </div>
              )}
            </div>
          )}

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
