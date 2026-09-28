import Foundation

struct StudyTimerStore: StudyTimerStoring {
  private struct Envelope: Codable {
    let schemaVersion: Int
    let session: StudySession
  }

  let directory: URL
  var fileURL: URL { directory.appendingPathComponent("session.json") }

  static var applicationStore: StudyTimerStore {
    StudyTimerStore(
      directory: URL.applicationSupportDirectory.appendingPathComponent(
        "StudyTimer", isDirectory: true))
  }

  func load() throws -> StudyStoreRead {
    let data: Data
    do {
      data = try Data(contentsOf: fileURL)
    } catch let error as CocoaError
      where error.code == .fileReadNoSuchFile || error.code == .fileNoSuchFile
    {
      return .missing
    }
    guard let envelope = try? JSONDecoder().decode(Envelope.self, from: data),
      envelope.schemaVersion == 1, envelope.session.isValidSnapshot
    else { return .invalid }
    return .session(envelope.session)
  }

  func save(_ session: StudySession) throws {
    let data = try JSONEncoder().encode(Envelope(schemaVersion: 1, session: session))
    try FileManager.default.createDirectory(at: directory, withIntermediateDirectories: true)
    try data.write(to: fileURL, options: .atomic)
  }

  func delete() throws {
    do {
      try FileManager.default.removeItem(at: fileURL)
    } catch let error as CocoaError
      where error.code == .fileNoSuchFile || error.code == .fileReadNoSuchFile
    {
      return
    }
  }
}

extension StudySession {
  fileprivate var isValidSnapshot: Bool {
    let earliestMs = Date.distantPast.timeIntervalSince1970 * 1_000
    let latestMs = Date.distantFuture.timeIntervalSince1970 * 1_000
    let effectiveStartMs = (runningSinceMs ?? 0) - accumulatedMs
    return UUID(uuidString: sessionId) != nil && !name.isEmpty && name.count <= 80
      && name == name.trimmingCharacters(in: .whitespacesAndNewlines) && accumulatedMs.isFinite
      && accumulatedMs >= 0 && accumulatedMs <= -earliestMs && goalDurationMs == 1_500_000
      && effectiveStartMs >= earliestMs && effectiveStartMs <= latestMs - goalDurationMs
      && (phase == .paused
        ? runningSinceMs == nil
        : runningSinceMs.map {
          $0.isFinite && $0 >= 0 && $0 <= latestMs - goalDurationMs
        } == true)
  }
}
