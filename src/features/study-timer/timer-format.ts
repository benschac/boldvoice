import type { SessionSnapshot } from "./study-timer.types";

export function elapsedMilliseconds(
  session: SessionSnapshot,
  nowMs: number,
): number {
  return (
    session.accumulatedMs +
    (session.phase === "running"
      ? Math.max(0, nowMs - session.runningSinceMs)
      : 0)
  );
}

export function formatElapsed(milliseconds: number): string {
  const seconds = Math.floor(Math.max(0, milliseconds) / 1000);
  return [
    Math.floor(seconds / 3600),
    Math.floor(seconds / 60) % 60,
    seconds % 60,
  ]
    .map((part) => String(part).padStart(2, "0"))
    .join(":");
}
