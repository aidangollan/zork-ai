"use client";

import { useEffect, useState, useRef } from "react";
import { useParams } from "next/navigation";

interface Entry {
  id: string;
  type: "narration" | "player" | "dice" | "npc";
  content: string;
  speaker?: string;
}

interface GameState {
  transcript: Entry[];
  thinking: { active: boolean; phase: string } | null;
  lastUpdate: number;
}

export default function Room() {
  const { code } = useParams<{ code: string }>();
  const [game, setGame] = useState<GameState | null>(null);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const termRef = useRef<HTMLDivElement>(null);
  const lastUpdate = useRef(0);

  // Poll for updates
  useEffect(() => {
    const poll = async () => {
      try {
        const res = await fetch(`/api/game/${code}`);
        const data = await res.json();
        if (data.lastUpdate !== lastUpdate.current) {
          setGame(data);
          lastUpdate.current = data.lastUpdate;
        }
      } catch (e) {
        console.error(e);
      }
    };

    poll();
    const interval = setInterval(poll, 2000);
    return () => clearInterval(interval);
  }, [code]);

  // Auto-scroll
  useEffect(() => {
    termRef.current?.scrollTo(0, termRef.current.scrollHeight);
  }, [game?.transcript, game?.thinking]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    setLoading(true);
    const action = input.trim();
    setInput("");

    try {
      const res = await fetch(`/api/game/${code}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
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

  return (
    <div className="h-screen bg-black text-green-400 font-mono flex flex-col p-4">
      {/* Header */}
      <div className="border-b border-green-900 pb-2 mb-4 flex justify-between text-sm">
        <span className="text-green-600">ZORK-DM</span>
        <span className="text-green-700">room: {code}</span>
      </div>

      {/* Transcript */}
      <div ref={termRef} className="flex-1 overflow-y-auto space-y-3 mb-4">
        {game?.transcript.map((e) => (
          <div key={e.id} className={
            e.type === "player" ? "text-amber-400" :
            e.type === "dice" ? "text-cyan-400" :
            e.type === "npc" ? "text-yellow-300" :
            "text-green-400"
          }>
            {e.type === "npc" && e.speaker && (
              <span className="text-yellow-500">{e.speaker}: </span>
            )}
            <span className="whitespace-pre-wrap">{e.content}</span>
          </div>
        ))}

        {thinking && (
          <div className="text-green-600 animate-pulse">
            {thinking}
          </div>
        )}

        {loading && !thinking && (
          <div className="text-green-700 animate-pulse">...</div>
        )}
      </div>

      {/* Input */}
      <form onSubmit={submit} className="flex border-t border-green-900 pt-4">
        <span className="text-green-600 mr-2">&gt;</span>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          disabled={loading}
          className="flex-1 bg-transparent outline-none disabled:opacity-50"
          placeholder={loading ? "" : "What do you do?"}
          autoFocus
        />
      </form>
    </div>
  );
}
