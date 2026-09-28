export type ActivityStatus = "active" | "unavailable" | "missing";

type SessionFields = {
  sessionId: string;
  name: string;
  accumulatedMs: number;
  goalDurationMs: number;
  activityStatus: ActivityStatus;
};

export type SessionSnapshot = SessionFields &
  (
    | { phase: "running"; runningSinceMs: number }
    | { phase: "paused"; runningSinceMs: null }
  );

export type TimerWarning = {
  code:
    | "ACTIVITY_UNAVAILABLE"
    | "ACTIVITY_MISSING"
    | "ACTIVITY_CLEANUP_UNCONFIRMED"
    | "SESSION_DISCARDED";
  message: string;
};

export type TimerResult = {
  session: SessionSnapshot | null;
  warning: TimerWarning | null;
};
export type Capabilities = { supported: boolean; activitiesEnabled: boolean };

export interface StudyTimerModule {
  getCapabilities(): Promise<Capabilities>;
  getSession(): Promise<TimerResult>;
  start(options: { name: string }): Promise<TimerResult>;
  pause(sessionId: string): Promise<TimerResult>;
  resume(sessionId: string): Promise<TimerResult>;
  stop(sessionId: string): Promise<TimerResult>;
  retryActivity(sessionId: string): Promise<TimerResult>;
}
