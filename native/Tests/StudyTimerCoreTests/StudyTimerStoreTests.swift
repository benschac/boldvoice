import Foundation
import Testing

@testable import StudyTimerCore

@Test func fileStoreRoundTripsAndDeletes() throws {
  let store = try temporaryStore()
  defer { try? FileManager.default.removeItem(at: store.directory) }
  #expect(try store.load() == .missing)
  let paused = testSession().paused(at: 6_000)
  try store.save(paused)
  #expect(try store.load() == .session(paused))
  let reopened = StudyTimerStore(directory: store.directory)
  #expect(try reopened.load() == .session(paused))
  try reopened.delete()
  try reopened.delete()
  #expect(try reopened.load() == .missing)
}

@Test(arguments: ["not json", "{\"schemaVersion\":2,\"session\":{}}", "{}"])
func malformedSnapshotsAreReportedWithoutDeletion(_ raw: String) throws {
  let store = try temporaryStore()
  defer { try? FileManager.default.removeItem(at: store.directory) }
  try Data(raw.utf8).write(to: store.fileURL)
  #expect(try store.load() == .invalid)
  #expect(try String(contentsOf: store.fileURL, encoding: .utf8) == raw)
}

@Test func validShapeWithUnsupportedSchemaIsInvalid() throws {
  let store = try temporaryStore()
  defer { try? FileManager.default.removeItem(at: store.directory) }
  try store.save(testSession())
  var json = try #require(
    JSONSerialization.jsonObject(with: Data(contentsOf: store.fileURL)) as? [String: Any])
  json["schemaVersion"] = 2
  try JSONSerialization.data(withJSONObject: json).write(to: store.fileURL)
  #expect(try store.load() == .invalid)
}

@Test(arguments: [
  "negative", "runningWithoutAnchor", "pausedWithAnchor", "blankName", "badId", "badGoal",
  "hugeAnchor", "hugeAccumulated", "hugePausedElapsed", "goalBeyondDateRange",
])
func semanticCorruptionIsRejected(_ violation: String) throws {
  let store = try temporaryStore()
  defer { try? FileManager.default.removeItem(at: store.directory) }
  try store.save(testSession())
  var envelope = try #require(
    JSONSerialization.jsonObject(with: Data(contentsOf: store.fileURL)) as? [String: Any])
  var session = try #require(envelope["session"] as? [String: Any])
  switch violation {
  case "negative": session["accumulatedMs"] = -1
  case "runningWithoutAnchor": session["runningSinceMs"] = NSNull()
  case "pausedWithAnchor": session["phase"] = "paused"
  case "blankName": session["name"] = "  "
  case "badId": session["sessionId"] = "not-a-uuid"
  case "hugeAnchor": session["runningSinceMs"] = 1e20
  case "hugeAccumulated": session["accumulatedMs"] = 1e20
  case "hugePausedElapsed":
    session["phase"] = "paused"
    session["runningSinceMs"] = NSNull()
    session["accumulatedMs"] = 1e20
  case "goalBeyondDateRange":
    session["runningSinceMs"] = Date.distantFuture.timeIntervalSince1970 * 1_000
  default: session["goalDurationMs"] = 0
  }
  envelope["session"] = session
  try JSONSerialization.data(withJSONObject: envelope).write(to: store.fileURL)
  #expect(try store.load() == .invalid)
}

@Test func plausibleClockChangeDoesNotDiscardRunningSession() throws {
  let store = try temporaryStore()
  defer { try? FileManager.default.removeItem(at: store.directory) }
  let now = Date().timeIntervalSince1970 * 1_000
  let session = StudySession.start(name: "Clock changed", nowMs: now + 86_400_000)
  try store.save(session)
  #expect(try store.load() == .session(session))
  #expect(session.elapsed(at: now) == 0)
}

@Test func realWriteFailurePreservesExistingData() throws {
  let store = try temporaryStore()
  defer { try? FileManager.default.removeItem(at: store.directory) }
  let blockedDirectory = store.directory.appendingPathComponent("blocked")
  try Data("existing data".utf8).write(to: blockedDirectory)
  let blockedStore = StudyTimerStore(directory: blockedDirectory)
  #expect(throws: (any Error).self) { try blockedStore.save(testSession()) }
  #expect(try String(contentsOf: blockedDirectory, encoding: .utf8) == "existing data")
}

@Test func realReadFailureIsNotCorruption() throws {
  let store = try temporaryStore()
  defer { try? FileManager.default.removeItem(at: store.directory) }
  try FileManager.default.createDirectory(at: store.fileURL, withIntermediateDirectories: false)
  #expect(throws: (any Error).self) { try store.load() }
  #expect(FileManager.default.fileExists(atPath: store.fileURL.path))
}
