"use client";

import { useEffect, useState } from "react";

export function TimeOverrideBar() {
  const [timeValue, setTimeValue] = useState("");
  const [active, setActive] = useState(false);

  useEffect(() => {
    // Check for existing time override cookie
    const match = document.cookie.match(/time_override=([^;]+)/);
    if (match) {
      setTimeValue(decodeURIComponent(match[1]));
      setActive(true);
    }

    // Check URL param
    const params = new URLSearchParams(window.location.search);
    const timeParam = params.get("time");
    if (timeParam) {
      setTimeValue(timeParam);
      setActive(true);
      // Store in cookie
      document.cookie = `time_override=${encodeURIComponent(timeParam)}; path=/; max-age=${7 * 24 * 60 * 60}`;
    }
  }, []);

  const handleSet = () => {
    if (timeValue) {
      document.cookie = `time_override=${encodeURIComponent(timeValue)}; path=/; max-age=${7 * 24 * 60 * 60}`;
      setActive(true);
      window.location.reload();
    }
  };

  const handleClear = () => {
    document.cookie = "time_override=; path=/; max-age=0";
    setTimeValue("");
    setActive(false);
    window.location.reload();
  };

  return (
    <div className="bg-yellow-100 border-b border-yellow-300 px-4 py-1 text-xs flex items-center gap-2">
      <span className="font-medium text-yellow-800">⏰ Time Override:</span>
      <input
        type="text"
        value={timeValue}
        onChange={(e) => setTimeValue(e.target.value)}
        placeholder="2026-06-15T12:00:00Z"
        className="px-2 py-0.5 border rounded text-xs w-52"
      />
      <button
        onClick={handleSet}
        className="px-2 py-0.5 bg-yellow-600 text-white rounded text-xs hover:bg-yellow-700"
      >
        Set
      </button>
      {active && (
        <button
          onClick={handleClear}
          className="px-2 py-0.5 bg-gray-500 text-white rounded text-xs hover:bg-gray-600"
        >
          Clear
        </button>
      )}
      {active && (
        <span className="text-yellow-800">Active: {timeValue}</span>
      )}
    </div>
  );
}
