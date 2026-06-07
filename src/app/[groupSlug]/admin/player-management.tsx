"use client";

import { useState } from "react";

interface PlayerData {
  id: string;
  name: string;
  email: string;
  inviteToken: string;
  createdAt: string;
}

interface Props {
  players: PlayerData[];
  groupSlug: string;
}

export function PlayerManagement({ players: initialPlayers, groupSlug }: Props) {
  const [players, setPlayers] = useState<PlayerData[]>(initialPlayers);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  function getInviteUrl(token: string) {
    const baseUrl = typeof window !== "undefined" ? window.location.origin : "";
    return `${baseUrl}/${groupSlug}/join/${token}`;
  }

  async function handleCopy(player: PlayerData) {
    const url = getInviteUrl(player.inviteToken);
    try {
      await navigator.clipboard.writeText(url);
      setCopiedId(player.id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      // Fallback for non-HTTPS or older browsers
      const textArea = document.createElement("textarea");
      textArea.value = url;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand("copy");
      document.body.removeChild(textArea);
      setCopiedId(player.id);
      setTimeout(() => setCopiedId(null), 2000);
    }
  }

  async function handleCreatePlayer(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);
    setError(null);
    setSuccess(null);

    try {
      const res = await fetch(`/api/${groupSlug}/admin/players`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to create player.");
        setCreating(false);
        return;
      }

      // Add new player to the list
      setPlayers((prev) => [
        ...prev,
        {
          id: data.id,
          name: data.name,
          email: data.email,
          inviteToken: data.inviteToken,
          createdAt: new Date().toISOString(),
        },
      ]);
      setName("");
      setEmail("");
      setSuccess(`Player "${data.name}" created. Share their invite link below.`);
    } catch {
      setError("Network error. Please try again.");
    }

    setCreating(false);
  }

  return (
    <div>
      {/* Create Player Form */}
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 mb-6">
        <h2 className="text-lg font-semibold mb-3 dark:text-white">Add New Player</h2>
        <form onSubmit={handleCreatePlayer} className="flex flex-col sm:flex-row gap-3">
          <input
            type="text"
            placeholder="Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded text-sm bg-white dark:bg-gray-700 dark:text-white flex-1"
          />
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded text-sm bg-white dark:bg-gray-700 dark:text-white flex-1"
          />
          <button
            type="submit"
            disabled={creating}
            className={`px-4 py-2 rounded text-sm font-medium ${
              creating
                ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                : "bg-blue-600 text-white hover:bg-blue-700"
            }`}
          >
            {creating ? "Creating..." : "Add Player"}
          </button>
        </form>
        {error && <p className="text-red-600 text-sm mt-2">{error}</p>}
        {success && <p className="text-green-600 text-sm mt-2">{success}</p>}
      </div>

      {/* Player List */}
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg">
        <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold dark:text-white">
            Players ({players.length})
          </h2>
        </div>

        {players.length === 0 ? (
          <p className="p-4 text-gray-500 dark:text-gray-400">
            No players yet. Add one above to get started.
          </p>
        ) : (
          <div className="divide-y divide-gray-100 dark:divide-gray-700">
            {players.map((player) => (
              <div
                key={player.id}
                className="px-4 py-3 flex items-center justify-between gap-3"
              >
                <div className="min-w-0 flex-1">
                  <div className="font-medium text-sm dark:text-white truncate">
                    {player.name}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 truncate">
                    {player.email}
                  </div>
                </div>
                <button
                  onClick={() => handleCopy(player)}
                  className={`px-3 py-1.5 rounded text-xs font-medium whitespace-nowrap transition-colors ${
                    copiedId === player.id
                      ? "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300"
                      : "bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
                  }`}
                >
                  {copiedId === player.id ? "✓ Copied" : "Copy Invite Link"}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Instructions */}
      <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
        <h3 className="text-sm font-semibold text-blue-800 dark:text-blue-300 mb-2">
          How invite links work
        </h3>
        <ul className="text-sm text-blue-700 dark:text-blue-400 space-y-1 list-disc list-inside">
          <li>Each player gets a unique invite link</li>
          <li>Clicking the link logs them in automatically — no password needed</li>
          <li>The session lasts 60 days (the whole tournament)</li>
          <li>Share links via WhatsApp, text, or email</li>
          <li>Links are single-use per device but can be re-used if they clear cookies</li>
        </ul>
      </div>
    </div>
  );
}
