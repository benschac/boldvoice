import assert from "node:assert/strict";
import test from "node:test";

import { performTimerCommand } from "../src/features/study-timer/timer-command.ts";

const idle = { session: null, warning: null };
const unexpected = () => {
  throw new Error("Unexpected refresh");
};

test("successful commands return only the native result", async () => {
  assert.deepEqual(
    await performTimerCommand(async () => idle, unexpected, unexpected),
    { result: idle, error: null },
  );
});

for (const [code, message] of [
  ["INVALID_NAME", "Enter a session name of 1–80 characters."],
  ["SESSION_CONFLICT", "Stop your current session before starting another."],
  [
    "STALE_SESSION",
    "This session has changed. Refresh to load the current session.",
  ],
]) {
  test(`${code} preserves the previous verified result`, async () => {
    const outcome = await performTimerCommand(
      async () => {
        throw {
          code,
          message:
            "FunctionCallException at /private/native/StudyTimer.swift:88",
        };
      },
      unexpected,
      unexpected,
    );
    assert.deepEqual(outcome, { error: message });
  });
}

for (const [rejection, message] of [
  [
    {
      code: "PERSISTENCE_FAILED",
      message: "FunctionCallException at /private/native/StudyTimer.swift:88",
    },
    "The session could not be saved. Please try again.",
  ],
  [
    new Error("Bridge disconnected at /private/native/StudyTimer.swift:88"),
    "The timer could not complete that action. Please try again.",
  ],
]) {
  test(`uncertain failure refreshes before returning authoritative state: ${rejection.message}`, async () => {
    const events = [];
    const outcome = await performTimerCommand(
      async () => {
        events.push("command");
        throw rejection;
      },
      async () => {
        events.push("refresh");
        return idle;
      },
      () => events.push("hide-state"),
    );
    assert.deepEqual(events, ["command", "hide-state", "refresh"]);
    assert.equal(outcome.result, idle);
    assert.equal(outcome.error, message);
  });
}

test("a failed recovery never supplies idle or the previous snapshot", async () => {
  let hidden = false;
  const outcome = await performTimerCommand(
    async () => {
      throw new Error("Write failed");
    },
    async () => {
      throw new Error("Read failed");
    },
    () => {
      hidden = true;
    },
  );
  assert.equal(hidden, true);
  assert.equal(outcome.result, undefined);
  assert.match(outcome.error, /current session could not be loaded/);
});
