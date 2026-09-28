import { useCallback, useEffect, useRef, useState } from "react";
import { AppState } from "react-native";

import { studyTimer } from "./study-timer";
import type { Capabilities, TimerResult } from "./study-timer.types";
import { performTimerCommand } from "./timer-command";

type PendingAction =
  "refresh" | "start" | "pause" | "resume" | "stop" | "retry";

export function useStudyTimer() {
  const [result, setResult] = useState<TimerResult | null>(null);
  const [capabilities, setCapabilities] = useState<Capabilities | null>(null);
  const [pending, setPending] = useState<PendingAction | null>("refresh");
  const [error, setError] = useState<string | null>(null);
  const [foreground, setForeground] = useState(
    AppState.currentState === "active",
  );
  const inFlight = useRef(false);
  const refreshQueued = useRef(false);
  const mounted = useRef(true);

  const run = useCallback(
    async (action: PendingAction, command?: () => Promise<TimerResult>) => {
      if (inFlight.current) {
        if (action === "refresh") refreshQueued.current = true;
        return;
      }
      inFlight.current = true;
      setPending(action);
      setError(null);
      try {
        do {
          refreshQueued.current = false;
          if (command) {
            const outcome = await performTimerCommand(
              command,
              () => studyTimer.getSession(),
              () => {
                if (mounted.current) setResult(null);
              },
            );
            if (mounted.current) {
              if (outcome.result) setResult(outcome.result);
              setError(outcome.error);
            }
            command = undefined;
          } else {
            if (mounted.current) setPending("refresh");
            try {
              const nextCapabilities = await studyTimer.getCapabilities();
              const nextResult = nextCapabilities.supported
                ? await studyTimer.getSession()
                : { session: null, warning: null };
              if (mounted.current) {
                setCapabilities(nextCapabilities);
                setResult(nextResult);
              }
            } catch {
              if (mounted.current) {
                setResult(null);
                setError(
                  "The current session could not be loaded. Try refreshing.",
                );
              }
            }
          }
        } while (
          refreshQueued.current &&
          mounted.current &&
          AppState.currentState === "active"
        );
      } finally {
        inFlight.current = false;
        if (mounted.current) setPending(null);
      }
    },
    [],
  );

  useEffect(() => {
    mounted.current = true;
    void run("refresh");
    const subscription = AppState.addEventListener("change", (state) => {
      setForeground(state === "active");
      if (state === "active") void run("refresh");
    });
    return () => {
      mounted.current = false;
      subscription.remove();
    };
  }, [run]);

  const session = result?.session;
  const canAct = capabilities?.supported && result !== null && foreground;

  return {
    result,
    capabilities,
    pending,
    error,
    foreground,
    refresh: () => run("refresh"),
    start: (name: string) => {
      if (!canAct || session) return;
      if (!name.trim()) {
        if (!inFlight.current) setError("Enter a session name.");
        return;
      }
      return run("start", () => studyTimer.start({ name }));
    },
    pause: () =>
      canAct &&
      session &&
      run("pause", () => studyTimer.pause(session.sessionId)),
    resume: () =>
      canAct &&
      session &&
      run("resume", () => studyTimer.resume(session.sessionId)),
    stop: () =>
      canAct &&
      session &&
      run("stop", () => studyTimer.stop(session.sessionId)),
    retry: () =>
      canAct &&
      session &&
      run("retry", () => studyTimer.retryActivity(session.sessionId)),
  };
}
