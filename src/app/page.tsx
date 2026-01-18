"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function Home() {
  const router = useRouter();
  const [joinCode, setJoinCode] = useState("");
  const [createdCode, setCreatedCode] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const create = () => {
    const code = Math.random().toString(36).slice(2, 8);
    setCreatedCode(code);
  };

  const copyCode = async () => {
    if (createdCode) {
      await navigator.clipboard.writeText(createdCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const startGame = () => {
    if (createdCode) {
      router.push(`/room/${createdCode}`);
    }
  };

  const join = (e: React.FormEvent) => {
    e.preventDefault();
    if (joinCode.trim()) router.push(`/room/${joinCode.trim()}`);
  };

  return (
    <div className="min-h-screen bg-black text-green-400 font-mono flex items-center justify-center p-4">
      <div className="max-w-md w-full space-y-8">
        <pre className="text-green-600 text-xs text-center">
{`
███████╗ ██████╗ ██████╗ ██╗  ██╗
╚══███╔╝██╔═══██╗██╔══██╗██║ ██╔╝
  ███╔╝ ██║   ██║██████╔╝█████╔╝
 ███╔╝  ██║   ██║██╔══██╗██╔═██╗
███████╗╚██████╔╝██║  ██║██║  ██╗
╚══════╝ ╚═════╝ ╚═╝  ╚═╝╚═╝  ╚═╝
        D U N G E O N   M A S T E R
`}
        </pre>

        <div className="text-center text-green-500 text-sm mb-4">
          AI-Powered D&D 5e • 1-4 Players • Text-Based Adventure
        </div>

        {createdCode ? (
          <div className="border border-green-700 p-6 space-y-4">
            <div className="text-center text-green-500 text-sm">
              Share this code with your party:
            </div>
            <div className="text-center">
              <span className="text-3xl tracking-widest text-green-400 font-bold">
                {createdCode.toUpperCase()}
              </span>
            </div>
            <div className="flex gap-3">
              <button
                onClick={copyCode}
                className="flex-1 py-2 border border-green-700 hover:bg-green-900/30"
              >
                {copied ? "[ COPIED! ]" : "[ COPY CODE ]"}
              </button>
              <button
                onClick={startGame}
                className="flex-1 py-2 border border-green-700 hover:bg-green-900/30 bg-green-900/20"
              >
                [ START ]
              </button>
            </div>
            <button
              onClick={() => setCreatedCode(null)}
              className="w-full py-1 text-green-800 hover:text-green-600 text-sm"
            >
              cancel
            </button>
          </div>
        ) : (
          <div className="border border-green-900 p-6 space-y-6">
            <button
              onClick={create}
              className="w-full py-3 border border-green-700 hover:bg-green-900/30"
            >
              [ NEW GAME ]
            </button>

            <div className="text-center text-green-800">or</div>

            <form onSubmit={join} className="space-y-3">
              <input
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value)}
                placeholder="room code"
                className="w-full bg-black border border-green-900 px-4 py-2 outline-none focus:border-green-700"
              />
              <button className="w-full py-2 border border-green-900 hover:bg-green-900/30">
                [ JOIN ]
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
