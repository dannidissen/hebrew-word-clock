"use client";

import { useEffect, useState } from "react";

// Shape returned by the nudgeBot Worker's read-only `GET /widget` endpoint.
// Kept deliberately lean — no memory notes, no history — mirroring the server.
export interface NudgeTask {
  id: number;
  name: string;
  deadline: string;
  needs_proof: boolean;
}

export interface NudgeSnapshot {
  tasks: NudgeTask[];
  streakMisses: number;
  nextCheck: string | null;
  paused: boolean;
  persona: string;
}

// "off"     — disabled (toggle off, e-ink, or missing url/token)
// "loading" — first fetch in flight, nothing shown yet
// "ok"      — have a snapshot
// "error"   — enabled but the last fetch failed (network / 403 / bad url)
export type NudgeStatus = "off" | "loading" | "ok" | "error";

export interface NudgeResult {
  data: NudgeSnapshot | null;
  status: NudgeStatus;
}

const REFRESH_MS = 60 * 1000; // once a minute — nudge state is coarse

/**
 * Polls the nudgeBot `/widget` endpoint for the current open tasks and the
 * next scheduled check, for display on a secondary colour screen. The token
 * lives only in the caller's localStorage (never committed), and is sent as a
 * Bearer header. Only fetches while `enabled` is true and both url+token are set.
 */
export function useNudge(
  baseUrl: string,
  token: string,
  enabled: boolean
): NudgeResult {
  const [data, setData] = useState<NudgeSnapshot | null>(null);
  const [status, setStatus] = useState<NudgeStatus>("off");

  const url = baseUrl.trim().replace(/\/+$/, "");
  const tok = token.trim();

  useEffect(() => {
    if (!enabled || !url || !tok) {
      setStatus("off");
      setData(null);
      return;
    }

    let cancelled = false;
    let firstLoad = true;

    const fetchNudge = async () => {
      if (firstLoad) setStatus("loading");
      try {
        const res = await fetch(`${url}/widget`, {
          headers: { Authorization: `Bearer ${tok}` },
        });
        if (cancelled) return;
        if (!res.ok) {
          // Keep the last-known snapshot but flag the failure.
          setStatus("error");
          return;
        }
        const json = await res.json();
        if (cancelled) return;
        setData({
          tasks: Array.isArray(json.tasks) ? json.tasks : [],
          streakMisses: Number(json.streak_misses) || 0,
          nextCheck: json.next_check ?? null,
          paused: Boolean(json.paused),
          persona: String(json.persona ?? ""),
        });
        setStatus("ok");
      } catch {
        // Offline or blocked — surface as error, keep last-known data.
        if (!cancelled) setStatus("error");
      } finally {
        firstLoad = false;
      }
    };

    fetchNudge();
    const interval = setInterval(fetchNudge, REFRESH_MS);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [url, tok, enabled]);

  return { data, status };
}
