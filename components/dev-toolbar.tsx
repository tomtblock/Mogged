"use client";

import { useEffect, useState } from "react";
import {
  type TestMode,
  getTestModeClient,
  setTestModeClient,
  resetFreeVotes,
  isTestModeEnabled,
} from "@/lib/test-mode";

/**
 * Floating dev toolbar shown at the bottom of the viewport.
 * Lets developers toggle between Normal mode (3 free votes)
 * and Pro mode (full subscriber experience) for testing.
 *
 * Only renders when test mode is enabled (development or
 * NEXT_PUBLIC_ENABLE_TEST_MODE=true).
 */
export function DevToolbar() {
  const [mode, setMode] = useState<TestMode>("normal");
  const [visible, setVisible] = useState(false);
  const [minimized, setMinimized] = useState(false);

  useEffect(() => {
    if (!isTestModeEnabled()) return;
    setVisible(true);
    setMode(getTestModeClient());
  }, []);

  if (!visible) return null;

  const toggle = (newMode: TestMode) => {
    setTestModeClient(newMode);
    setMode(newMode);
    // Reset free votes when switching so you get a clean slate
    resetFreeVotes();
    // Reload the page so server components re-evaluate with the new cookie
    window.location.reload();
  };

  if (minimized) {
    return (
      <button
        onClick={() => setMinimized(false)}
        className="fixed bottom-4 right-4 z-[9999] flex h-8 w-8 items-center justify-center rounded-full border border-neon-purple/40 bg-bg/95 text-xs font-bold text-neon-purple shadow-lg backdrop-blur-sm transition-all hover:scale-110 hover:border-neon-purple"
        title="Open dev toolbar"
      >
        <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      </button>
    );
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 z-[9999] border-t border-neon-purple/20 bg-bg/95 backdrop-blur-sm">
      <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-2">
        {/* Left — label */}
        <div className="flex items-center gap-2">
          <span className="rounded bg-neon-purple/20 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-neon-purple">
            DEV
          </span>
          <span className="text-xs text-text-dim">Test Mode</span>
        </div>

        {/* Center — mode toggle */}
        <div className="flex items-center gap-1 rounded-lg border border-border bg-surface p-0.5">
          <button
            onClick={() => toggle("normal")}
            className={`rounded-md px-3 py-1 text-xs font-medium transition-all ${
              mode === "normal"
                ? "bg-neon-cyan/20 text-neon-cyan shadow-[0_0_10px_rgba(6,182,212,0.2)]"
                : "text-text-dim hover:text-text"
            }`}
          >
            Normal
            <span className="ml-1 text-[10px] opacity-60">(3 free)</span>
          </button>
          <button
            onClick={() => toggle("pro")}
            className={`rounded-md px-3 py-1 text-xs font-medium transition-all ${
              mode === "pro"
                ? "bg-neon-purple/20 text-neon-purple shadow-[0_0_10px_rgba(168,85,247,0.2)]"
                : "text-text-dim hover:text-text"
            }`}
          >
            Pro
            <span className="ml-1 text-[10px] opacity-60">(all features)</span>
          </button>
        </div>

        {/* Right — status + minimize */}
        <div className="flex items-center gap-2">
          <span
            className={`flex items-center gap-1 text-[11px] font-medium ${
              mode === "pro" ? "text-neon-purple" : "text-neon-cyan"
            }`}
          >
            <span
              className={`inline-block h-1.5 w-1.5 rounded-full ${
                mode === "pro" ? "bg-neon-purple animate-pulse" : "bg-neon-cyan"
              }`}
            />
            {mode === "pro" ? "Pro Testnet" : "Normal"}
          </span>
          <button
            onClick={() => setMinimized(true)}
            className="ml-1 rounded p-1 text-text-dim transition-colors hover:bg-surface-light hover:text-text"
            title="Minimize toolbar"
          >
            <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
