import Foundation
import Testing

@testable import StudyTimerCore

@Test func lifecycleCommitsSnapshotsAndRemovesActivity() async throws {
  let store = MemoryStore()
  let activities = FakeActivities()
  let timer = StudyTimerCoordinator(store: store, activities: activities, now: { 10_000 })
  let started = try await timer.execute(.start(name: "  Chapter 5  "))
  let id = try #require(started.session?.sessionId)
  #expect(started.session?.name == "Chapter 5")
  #expect(started.session?.runningSinceMs == 10_000)
  #expect(started.activityStatus == .active)
  let paused = try await timer.execute(.pause(sessionId: id))
  #expect(paused.session?.phase == .paused)
  #expect(paused.session?.runningSinceMs == nil)
  #expect(try await store.load() == .session(try #require(paused.session)))
  _ = try await timer.execute(.pause(sessionId: id))
  #expect(await store.writes == 2)
  let resumed = try await timer.execute(.resume(sessionId: id))
  #expect(resumed.session?.phase == .running)
  _ = try await timer.execute(.resume(sessionId: id))
  #expect(await store.writes == 3)
  await activities.configure(storeObservedAtEnd: store)
  let stopped = try await timer.execute(.stop(sessionId: id))
  #expect(stopped.session == nil)
  #expect(stopped.warning == nil)
  #expect(try await store.load() == .missing)
  #expect(await activities.liveIDs() == [])
  #expect(await activities.snapshotsAtEnd == [.missing])
  #expect(try await timer.execute(.stop(sessionId: id)).session == nil)
}

@Test func inputAndSessionErrorsLeaveBothSurfacesUnchanged() async throws {
  let session = testSession()
  let store = MemoryStore(.session(session))
  let activities = FakeActivities()
  await activities.seed(id: "original", session: session)
  let timer = StudyTimerCoordinator(store: store, activities: activities)
  await #expect(throws: StudyTimerError.invalidName) {
    try await timer.execute(.start(name: "  \n"))
  }
  await #expect(throws: StudyTimerError.invalidName) {
    try await timer.execute(.start(name: String(repeating: "👩🏽‍🚀", count: 81)))
  }
  await #expect(throws: StudyTimerError.sessionConflict) {
    try await timer.execute(.start(name: "Other"))
  }
  for command in [
    StudyTimerCommand.pause(sessionId: "stale"), .resume(sessionId: "stale"),
    .stop(sessionId: "stale"), .retryActivity(sessionId: "stale"),
  ] {
    await #expect(throws: StudyTimerError.staleSession) { try await timer.execute(command) }
  }
  #expect(try await store.load() == .session(session))
  #expect(await activities.liveIDs() == ["original"])
  #expect(await activities.content["original"] == session)
  #expect(await activities.updates == 0)
  #expect(await activities.endings == 0)
}

@Test func unicodeNamesUseUserPerceivedCharacters() async throws {
  let timer = StudyTimerCoordinator(store: MemoryStore(), activities: FakeActivities())
  let name = String(repeating: "👩🏽‍🚀", count: 80)
  #expect(try await timer.execute(.start(name: name)).session?.name == name)
}

@Test func pauseAndResumeAcrossRelaunchPreserveOnlyRunningTime() async throws {
  let store = try temporaryStore()
  defer { try? FileManager.default.removeItem(at: store.directory) }
  let session = testSession()
  try store.save(session)
  let activities = FakeActivities()
  await activities.seed(id: "surviving", session: session)
  let beforeQuit = StudyTimerCoordinator(store: store, activities: activities, now: { 6_000 })
  let paused = try await beforeQuit.execute(.pause(sessionId: session.sessionId))
  #expect(paused.session?.accumulatedMs == 5_000)
  let reopened = StudyTimerCoordinator(
    store: StudyTimerStore(directory: store.directory), activities: activities, now: { 100_000 })
  #expect(try await reopened.execute(.getSession).session?.elapsed(at: 100_000) == 5_000)
  let resumed = try await reopened.execute(.resume(sessionId: session.sessionId))
  #expect(resumed.session?.runningSinceMs == 100_000)
  #expect(resumed.session?.elapsed(at: 102_000) == 7_000)
  #expect(await activities.liveIDs() == ["surviving"])
}

@Test(arguments: ["not json", "{\"schemaVersion\":99,\"session\":{}}"])
func realInvalidFileIsRemovedByReconciliation(_ raw: String) async throws {
  let store = try temporaryStore()
  defer { try? FileManager.default.removeItem(at: store.directory) }
  try Data(raw.utf8).write(to: store.fileURL)
  let activities = FakeActivities()
  await activities.seed(id: "orphan", session: testSession())
  await activities.configure(storeObservedAtEnd: store)
  let timer = StudyTimerCoordinator(store: store, activities: activities)
  let result = try await timer.execute(.getSession)
  #expect(result.session == nil)
  #expect(result.warning == .sessionDiscarded)
  #expect(await activities.snapshotsAtEnd == [.invalid])
  #expect(await activities.liveIDs() == [])
  #expect(try store.load() == .missing)
}

@Test func failedRequestLeavesDurableRunningTimerAndRetryIsExplicit() async throws {
  let store = MemoryStore()
  let activities = FakeActivities()
  await activities.configure(failRequest: true)
  let timer = StudyTimerCoordinator(store: store, activities: activities, now: { 7_000 })
  let started = try await timer.execute(.start(name: "Read"))
  let id = try #require(started.session?.sessionId)
  #expect(started.session?.phase == .running)
  #expect(started.activityStatus == .unavailable)
  #expect(started.warning == .activityUnavailable)
  let restored = try await timer.execute(.getSession)
  #expect(restored.activityStatus == .missing)
  #expect(restored.session?.sessionId == id)
  await activities.configure()
  let retry = try await timer.execute(.retryActivity(sessionId: id))
  #expect(retry.activityStatus == .active)
  _ = try await timer.execute(.retryActivity(sessionId: id))
  #expect(await activities.requests == 1)
  #expect(await store.writes == 1)
}

@Test func disabledActivitiesKeepLocalTimerAvailable() async throws {
  let activities = FakeActivities()
  await activities.configure(enabled: false)
  let timer = StudyTimerCoordinator(store: MemoryStore(), activities: activities)
  let result = try await timer.execute(.start(name: "Read"))
  #expect(result.session?.phase == .running)
  #expect(result.activityStatus == .unavailable)
  #expect(result.warning == .activityUnavailable)
  #expect(await activities.requests == 0)
}

@Test func reconciliationAdoptsOneMatchAndRestoresCommittedContent() async throws {
  let running = testSession()
  let paused = running.paused(at: 6_000)
  let store = MemoryStore(.session(paused))
  let activities = FakeActivities()
  await activities.seed(id: "adopt", session: running)
  await activities.seed(id: "duplicate", session: running)
  await activities.seed(id: "orphan", session: testSession(id: UUID().uuidString))
  let timer = StudyTimerCoordinator(store: store, activities: activities)
  let result = try await timer.execute(.getSession)
  #expect(result.session?.accumulatedMs == 5_000)
  #expect(result.activityStatus == .active)
  #expect(await activities.liveIDs() == ["adopt"])
  #expect(await activities.content["adopt"]?.phase == .paused)
  #expect(await activities.content["adopt"]?.accumulatedMs == 5_000)
  #expect(await activities.requests == 0)
  #expect(await store.writes == 0)
}

@Test(arguments: [StudyActivity.State.ended, .dismissed])
func terminalActivitiesAreNeverAdopted(_ state: StudyActivity.State) async throws {
  let session = testSession()
  let activities = FakeActivities()
  await activities.seed(id: "terminal", session: session, state: state)
  let timer = StudyTimerCoordinator(store: MemoryStore(.session(session)), activities: activities)
  let result = try await timer.execute(.getSession)
  #expect(result.session?.sessionId == session.sessionId)
  #expect(result.activityStatus == .missing)
  #expect(result.warning == .activityMissing)
  #expect(await activities.requests == 0)
}

@Test func crashAfterStartCommitDoesNotAutomaticallyRecreateActivity() async throws {
  let store = try temporaryStore()
  defer { try? FileManager.default.removeItem(at: store.directory) }
  try store.save(testSession())
  let activities = FakeActivities()
  let restarted = StudyTimerCoordinator(
    store: StudyTimerStore(directory: store.directory), activities: activities)
  let result = try await restarted.execute(.getSession)
  #expect(result.session?.name == "Chapter 5")
  #expect(result.activityStatus == .missing)
  #expect(await activities.requests == 0)
}

@Test func crashAfterStopDeleteCleansOrphanOnRelaunch() async throws {
  let store = try temporaryStore()
  defer { try? FileManager.default.removeItem(at: store.directory) }
  try store.save(testSession())
  let activities = FakeActivities()
  await activities.seed(id: "orphan", session: testSession())
  try store.delete()
  let restarted = StudyTimerCoordinator(store: store, activities: activities)
  let result = try await restarted.execute(.getSession)
  #expect(result.session == nil)
  #expect(result.warning == nil)
  #expect(await activities.liveIDs() == [])
  let next = try await restarted.execute(.start(name: "New timer"))
  #expect(next.activityStatus == .active)
  #expect(await activities.liveIDs().count == 1)
}

@Test func corruptSnapshotIsDiscardedAfterCleanup() async throws {
  let store = MemoryStore(.invalid)
  let activities = FakeActivities()
  await activities.seed(id: "orphan", session: testSession())
  await activities.configure(storeObservedAtEnd: store)
  let timer = StudyTimerCoordinator(store: store, activities: activities)
  let result = try await timer.execute(.getSession)
  #expect(result.session == nil)
  #expect(result.warning == .sessionDiscarded)
  #expect(try await store.load() == .missing)
  #expect(await activities.liveIDs() == [])
  #expect(await store.deletes == 1)
  #expect(await activities.snapshotsAtEnd == [.invalid])
}

@Test(arguments: [StudyStoreRead.missing, .invalid])
func unconfirmedCleanupDoesNotCreateAnotherActivity(_ stored: StudyStoreRead) async throws {
  let activities = FakeActivities()
  await activities.seed(id: "straggler", session: testSession())
  await activities.configure(refuseEnd: true)
  let timer = StudyTimerCoordinator(store: MemoryStore(stored), activities: activities)
  let result = try await timer.execute(.start(name: "Fresh"))
  #expect(result.session?.phase == .running)
  #expect(result.warning == .cleanupUnconfirmed)
  #expect(await activities.liveIDs() == ["straggler"])
  #expect(await activities.requests == 0)
}

@Test func corruptSnapshotWithSurvivingActivityReportsCleanupFailure() async throws {
  let store = MemoryStore(.invalid)
  let activities = FakeActivities()
  await activities.seed(id: "straggler", session: testSession())
  await activities.configure(refuseEnd: true, storeObservedAtEnd: store)
  let timer = StudyTimerCoordinator(store: store, activities: activities)
  let result = try await timer.execute(.getSession)
  #expect(result.session == nil)
  #expect(result.warning == .cleanupUnconfirmed)
  #expect(try await store.load() == .missing)
  #expect(await activities.liveIDs() == ["straggler"])
  #expect(await activities.snapshotsAtEnd == [.invalid])
  await activities.configure()
  let recovered = try await timer.execute(.getSession)
  #expect(recovered.warning == nil)
  #expect(await activities.liveIDs() == [])
}

@Test func ioFailureNeverDeletesOrEndsExistingState() async throws {
  let session = testSession()
  let store = MemoryStore(.session(session))
  let activities = FakeActivities()
  await activities.seed(id: "original", session: session)
  await store.setFailure(read: true)
  let timer = StudyTimerCoordinator(store: store, activities: activities)
  await #expect(throws: StudyTimerError.persistenceFailed) { try await timer.execute(.getSession) }
  #expect(await store.value == .session(session))
  #expect(await store.deletes == 0)
  #expect(await activities.liveIDs() == ["original"])
  #expect(await activities.endings == 0)
}

@Test func failedTransitionWriteDoesNotPublishNewState() async throws {
  let session = testSession()
  let store = MemoryStore(.session(session))
  let activities = FakeActivities()
  await activities.seed(id: "original", session: session)
  await store.setFailure(write: true)
  let timer = StudyTimerCoordinator(store: store, activities: activities, now: { 6_000 })
  await #expect(throws: StudyTimerError.persistenceFailed) {
    try await timer.execute(.pause(sessionId: session.sessionId))
  }
  #expect(try await store.load() == .session(session))
  #expect(await activities.content["original"]?.phase == .running)
  await store.setFailure(delete: true)
  await #expect(throws: StudyTimerError.persistenceFailed) {
    try await timer.execute(.stop(sessionId: session.sessionId))
  }
  #expect(await activities.liveIDs() == ["original"])
}

@Test func disappearedUpdateAndIncompleteEndAreReportedHonestly() async throws {
  let session = testSession()
  let store = MemoryStore(.session(session))
  let activities = FakeActivities()
  await activities.seed(id: "original", session: session)
  await activities.configure(vanishOnUpdate: true)
  let timer = StudyTimerCoordinator(store: store, activities: activities)
  let paused = try await timer.execute(.pause(sessionId: session.sessionId))
  #expect(paused.session?.phase == .paused)
  #expect(paused.activityStatus == .missing)
  #expect(paused.warning == .activityMissing)
  await activities.seed(id: "straggler", session: session)
  await activities.configure(refuseEnd: true)
  let stopped = try await timer.execute(.stop(sessionId: session.sessionId))
  #expect(stopped.session == nil)
  #expect(stopped.warning == .cleanupUnconfirmed)
  #expect(try await store.load() == .missing)
  #expect(await activities.liveIDs() == ["straggler"])
  let idleStop = try await timer.execute(.stop(sessionId: session.sessionId))
  #expect(idleStop.warning == .cleanupUnconfirmed)
  await activities.configure()
  #expect(try await timer.execute(.getSession).warning == nil)
  #expect(await activities.liveIDs() == [])
}

@Test func startReconcilesOrphansBeforeRequesting() async throws {
  let activities = FakeActivities()
  await activities.seed(id: "orphan", session: testSession())
  let timer = StudyTimerCoordinator(store: MemoryStore(), activities: activities)
  let result = try await timer.execute(.start(name: "Fresh"))
  #expect(result.session?.name == "Fresh")
  #expect(await activities.liveIDs() == ["activity-1"])
}

@Test func suspendedRequestCannotLeaveActivityAfterConcurrentStop() async throws {
  let gate = OperationGate()
  let store = MemoryStore()
  let activities = FakeActivities()
  await activities.configure(requestGate: gate)
  let timer = StudyTimerCoordinator(store: store, activities: activities)
  let start = Task { try await timer.execute(.start(name: "FIFO")) }
  await gate.waitForEntry()
  guard case .session(let committed) = try await store.load() else {
    Issue.record("Start must persist before requesting")
    return
  }
  let stop = Task { try await timer.execute(.stop(sessionId: committed.sessionId)) }
  for _ in 0..<20 { await Task.yield() }
  #expect(try await store.load() == .session(committed))
  await gate.open()
  #expect(try await start.value.activityStatus == .active)
  #expect(try await stop.value.session == nil)
  #expect(try await store.load() == .missing)
  #expect(await activities.liveIDs() == [])
}

@Test func rapidConcurrentStartStopCommandsConvergeToIdle() async throws {
  let store = MemoryStore()
  let activities = FakeActivities()
  let timer = StudyTimerCoordinator(store: store, activities: activities)
  try await withThrowingTaskGroup(of: Void.self) { group in
    for index in 0..<30 {
      group.addTask {
        do {
          let started = try await timer.execute(.start(name: "Session \(index)"))
          let id = try #require(started.session?.sessionId)
          _ = try await timer.execute(.stop(sessionId: id))
        } catch StudyTimerError.sessionConflict {}
      }
    }
    try await group.waitForAll()
  }
  let final = try await timer.execute(.getSession)
  #expect(final.session == nil)
  #expect(final.warning == nil)
  #expect(await activities.requests > 0)
  #expect(await activities.liveIDs() == [])
  #expect(try await store.load() == .missing)
}
