"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function Home() {
  const router = useRouter();
  const [joinCode, setJoinCode] = useState("");

  const create = () => {
    const code = Math.random().toString(36).slice(2, 8);
    router.push(`/room/${code}`);
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
      </div>
    </div>
  );
}
