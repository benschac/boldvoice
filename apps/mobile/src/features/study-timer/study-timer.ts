import type { StudyTimerModule, TimerResult } from "./study-timer.types";

const unsupported = async (): Promise<TimerResult> => {
  throw new Error(
    "Study Timer Live Activities require an iOS development build.",
  );
};

export const studyTimer: StudyTimerModule = {
  getCapabilities: async () => ({ supported: false, activitiesEnabled: false }),
  getSession: async () => ({ session: null, warning: null }),
  start: unsupported,
  pause: unsupported,
  resume: unsupported,
  stop: unsupported,
  retryActivity: unsupported,
};
