"use client";

import { useEffect, useState } from "react";

interface TestPlayer {
  id: string;
  name: string;
}

export function PlayerSwitcher({ groupSlug }: { groupSlug: string }) {
  const [players, setPlayers] = useState<TestPlayer[]>([]);
  const [currentId, setCurrentId] = useState<string>("");

  useEffect(() => {
    fetch(`/api/${groupSlug}/test/players`)
      .then((r) => r.json())
      .then((data) => {
        setPlayers(data.players || []);
        setCurrentId(data.currentPlayerId || "");
      })
      .catch(() => {});
  }, [groupSlug]);

  const handleSwitch = async (playerId: string) => {
    await fetch(`/api/${groupSlug}/test/switch-player`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ playerId }),
    });
    setCurrentId(playerId);
    window.location.reload();
  };

  if (players.length === 0) return null;

  return (
    <select
      value={currentId}
      onChange={(e) => handleSwitch(e.target.value)}
      className="text-xs px-2 py-1 border rounded bg-yellow-50 border-yellow-300"
      aria-label="Switch test player"
    >
      {players.map((p) => (
        <option key={p.id} value={p.id}>
          {p.name}
        </option>
      ))}
    </select>
  );
}
