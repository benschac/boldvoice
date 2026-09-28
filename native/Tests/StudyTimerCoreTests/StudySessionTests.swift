import Testing

@testable import StudyTimerCore

@Test func pauseAndResumeExcludePausedTime() {
  let running = StudySession.start(name: "Math", nowMs: 1_000)
  let paused = running.paused(at: 6_000)
  #expect(paused.elapsed(at: 100_000) == 5_000)
  #expect(paused.runningSinceMs == nil)
  let resumed = paused.resumed(at: 100_000)
  #expect(resumed.elapsed(at: 102_000) == 7_000)
}

@Test func negativeClockDeltaIsClamped() {
  let running = StudySession.start(name: "Math", nowMs: 10_000)
  #expect(running.elapsed(at: 5_000) == 0)
}

@Test func repeatedTransitionsAreIdempotent() {
  let running = StudySession.start(name: "Math", nowMs: 1_000)
  #expect(running.resumed(at: 9_000) == running)
  let paused = running.paused(at: 6_000)
  #expect(paused.paused(at: 9_000) == paused)
}
