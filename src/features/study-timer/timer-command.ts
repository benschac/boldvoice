import type { TimerResult } from "./study-timer.types";

function errorCode(error: unknown): unknown {
  return typeof error === "object" && error !== null && "code" in error
    ? error.code
    : undefined;
}

function errorMessage(code: unknown): string {
  switch (code) {
    case "INVALID_NAME":
      return "Enter a session name of 1–80 characters.";
    case "SESSION_CONFLICT":
      return "Stop your current session before starting another.";
    case "STALE_SESSION":
      return "This session has changed. Refresh to load the current session.";
    case "PERSISTENCE_FAILED":
      return "The session could not be saved. Please try again.";
    default:
      return "The timer could not complete that action. Please try again.";
  }
}

export async function performTimerCommand(
  command: () => Promise<TimerResult>,
  refresh: () => Promise<TimerResult>,
  onUncertain: () => void,
): Promise<{ result?: TimerResult; error: string | null }> {
  try {
    return { result: await command(), error: null };
  } catch (error) {
    const code = errorCode(error);
    const message = errorMessage(code);
    if (
      code === "INVALID_NAME" ||
      code === "SESSION_CONFLICT" ||
      code === "STALE_SESSION"
    ) {
      return { error: message };
    }

    onUncertain();
    try {
      return { result: await refresh(), error: message };
    } catch {
      return {
        error: `${message} The current session could not be loaded. Try refreshing.`,
      };
    }
  }
}
