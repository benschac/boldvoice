import { requireNativeModule } from "expo";

import type { StudyTimerModule } from "./study-timer.types";

export const studyTimer =
  requireNativeModule<StudyTimerModule>("StudyTimerModule");
