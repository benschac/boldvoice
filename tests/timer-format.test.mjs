import assert from "node:assert/strict";
import test from "node:test";

import {
  elapsedMilliseconds,
  formatElapsed,
  focusProgress,
} from "../src/features/study-timer/timer-format.ts";

test("elapsed display uses full hours and floors incomplete seconds", () => {
  assert.equal(formatElapsed(0), "00:00:00");
  assert.equal(formatElapsed(999), "00:00:00");
  assert.equal(formatElapsed(59_999), "00:00:59");
  assert.equal(formatElapsed(60_000), "00:01:00");
  assert.equal(formatElapsed(3_661_123), "01:01:01");
  assert.equal(formatElapsed(360_000_000), "100:00:00");
  assert.equal(formatElapsed(-1000), "00:00:00");
});

test("focus progress shares elapsed time, freezes while paused, and caps without stopping time", () => {
  const goal = 1_500_000;
  const paused = {
    phase: "paused",
    accumulatedMs: 750_000,
    runningSinceMs: null,
  };
  assert.equal(focusProgress(elapsedMilliseconds(paused, 1_000), goal), 0.5);
  assert.equal(focusProgress(elapsedMilliseconds(paused, 90_000), goal), 0.5);
  assert.equal(focusProgress(0, goal), 0);
  assert.equal(focusProgress(-1, goal), 0);
  assert.equal(focusProgress(goal, goal), 1);
  assert.equal(focusProgress(goal + 60_000, goal), 1);
  assert.equal(formatElapsed(goal + 60_000), "00:26:00");
});

const session = {
  sessionId: "example",
  name: "Chapter 5",
  accumulatedMs: 65_000,
  goalDurationMs: 1_500_000,
  activityStatus: "active",
};

test("running elapsed includes committed time and clamps backwards clock changes", () => {
  const running = { ...session, phase: "running", runningSinceMs: 1_000_000 };
  assert.equal(elapsedMilliseconds(running, 1_010_000), 75_000);
  assert.equal(elapsedMilliseconds(running, 900_000), 65_000);
});

test("paused elapsed stays frozen regardless of display clock", () => {
  const paused = { ...session, phase: "paused", runningSinceMs: null };
  assert.equal(elapsedMilliseconds(paused, 1_000_000), 65_000);
  assert.equal(elapsedMilliseconds(paused, 1_010_000), 65_000);
});

test("resuming excludes the paused interval", () => {
  const resumed = { ...session, phase: "running", runningSinceMs: 1_010_000 };
  assert.equal(
    formatElapsed(elapsedMilliseconds(resumed, 1_015_000)),
    "00:01:10",
  );
});
