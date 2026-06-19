"use client";

import { useState } from "react";

interface MobileNavProps {
  groupSlug: string;
  showAdmin: boolean;
}

export function MobileNav({ groupSlug, showAdmin }: MobileNavProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      {/* Hamburger button (visible only on mobile) */}
      <button
        onClick={() => setOpen(!open)}
        className="sm:hidden w-8 h-8 flex items-center justify-center rounded border border-gray-200 dark:border-gray-600"
        aria-label="Toggle navigation menu"
        aria-expanded={open}
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          {open ? (
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          ) : (
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          )}
        </svg>
      </button>

      {/* Mobile menu dropdown */}
      {open && (
        <div className="sm:hidden absolute top-full left-0 right-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 shadow-md z-50">
          <div className="px-4 py-3 space-y-3">
            <a
              href={`/${groupSlug}/predict`}
              className="block text-sm text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white"
              onClick={() => setOpen(false)}
            >
              Predict
            </a>
            <a
              href={`/${groupSlug}/teams`}
              className="block text-sm text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white"
              onClick={() => setOpen(false)}
            >
              Teams
            </a>
            <a
              href={`/${groupSlug}/leaderboard`}
              className="block text-sm text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white"
              onClick={() => setOpen(false)}
            >
              Leaderboard
            </a>
            <a
              href={`/${groupSlug}/rules`}
              className="block text-sm text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white"
              onClick={() => setOpen(false)}
            >
              Rules
            </a>
            {showAdmin && (
              <a
                href={`/${groupSlug}/admin`}
                className="block text-sm text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300"
                onClick={() => setOpen(false)}
              >
                Admin
              </a>
            )}
          </div>
        </div>
      )}
    </>
  );
}
