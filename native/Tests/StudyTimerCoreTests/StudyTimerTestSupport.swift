import Foundation

@testable import StudyTimerCore

enum TestFailure: Error { case requested }

actor MemoryStore: StudyTimerStoring {
  var value: StudyStoreRead
  var failRead = false
  var failWrite = false
  var failDelete = false
  var writes = 0
  var deletes = 0

  init(_ value: StudyStoreRead = .missing) { self.value = value }
  func setFailure(read: Bool = false, write: Bool = false, delete: Bool = false) {
    failRead = read
    failWrite = write
    failDelete = delete
  }
  func load() throws -> StudyStoreRead {
    if failRead { throw TestFailure.requested }
    return value
  }
  func save(_ session: StudySession) throws {
    if failWrite { throw TestFailure.requested }
    value = .session(session)
    writes += 1
  }
  func delete() throws {
    if failDelete { throw TestFailure.requested }
    value = .missing
    deletes += 1
  }
}

actor OperationGate {
  private var entered = false
  private var entryWaiters: [CheckedContinuation<Void, Never>] = []
  private var release: CheckedContinuation<Void, Never>?

  func suspend() async {
    await withCheckedContinuation { continuation in
      entered = true
      release = continuation
      entryWaiters.forEach { $0.resume() }
      entryWaiters.removeAll()
    }
  }
  func waitForEntry() async {
    if !entered { await withCheckedContinuation { entryWaiters.append($0) } }
  }
  func open() {
    release?.resume()
    release = nil
  }
}

actor FakeActivities: StudyActivityManaging {
  var enabled = true
  var failRequest = false
  var refuseEnd = false
  var vanishOnUpdate = false
  var requestGate: OperationGate?
  var entries: [StudyActivity] = []
  var content: [String: StudySession] = [:]
  var requests = 0
  var updates = 0
  var endings = 0
  var storeObservedAtEnd: (any StudyTimerStoring)?
  var snapshotsAtEnd: [StudyStoreRead] = []

  func configure(
    enabled: Bool = true, failRequest: Bool = false, refuseEnd: Bool = false,
    vanishOnUpdate: Bool = false, requestGate: OperationGate? = nil,
    storeObservedAtEnd: (any StudyTimerStoring)? = nil
  ) {
    self.enabled = enabled
    self.failRequest = failRequest
    self.refuseEnd = refuseEnd
    self.vanishOnUpdate = vanishOnUpdate
    self.requestGate = requestGate
    self.storeObservedAtEnd = storeObservedAtEnd
  }
  func seed(id: String, session: StudySession, state: StudyActivity.State = .active) {
    entries.append(StudyActivity(id: id, sessionId: session.sessionId, state: state))
    content[id] = session
  }
  func activitiesEnabled() -> Bool { enabled }
  func activities() -> [StudyActivity] { entries }
  func request(_ session: StudySession) async throws {
    if let requestGate { await requestGate.suspend() }
    if failRequest { throw TestFailure.requested }
    requests += 1
    seed(id: "activity-\(requests)", session: session)
  }
  func update(id: String, session: StudySession) {
    updates += 1
    if vanishOnUpdate {
      entries.removeAll { $0.id == id }
      content[id] = nil
    } else {
      content[id] = session
    }
  }
  func end(id: String) async {
    endings += 1
    if let storeObservedAtEnd, let snapshot = try? await storeObservedAtEnd.load() {
      snapshotsAtEnd.append(snapshot)
    }
    if !refuseEnd {
      entries.removeAll { $0.id == id }
      content[id] = nil
    }
  }
  func liveIDs() -> [String] { entries.filter { $0.state.isNonterminal }.map(\.id).sorted() }
}

func testSession(name: String = "Chapter 5", id: String = "F3F573D0-1000-4000-8000-000000000001")
  -> StudySession
{
  StudySession.start(name: name, nowMs: 1_000, sessionId: id)
}

func temporaryStore() throws -> StudyTimerStore {
  let directory = FileManager.default.temporaryDirectory.appendingPathComponent(
    UUID().uuidString, isDirectory: true)
  try FileManager.default.createDirectory(at: directory, withIntermediateDirectories: true)
  return StudyTimerStore(directory: directory)
}
