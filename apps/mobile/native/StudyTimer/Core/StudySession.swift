import Foundation

struct StudySession: Codable, Equatable, Sendable {
  enum Phase: String, Codable, Sendable {
    case running
    case paused
  }

  let sessionId: String
  let name: String
  var phase: Phase
  var accumulatedMs: Double
  var runningSinceMs: Double?
  let goalDurationMs: Double

  static func start(name: String, nowMs: Double, sessionId: String = UUID().uuidString)
    -> StudySession
  {
    StudySession(
      sessionId: sessionId, name: name, phase: .running, accumulatedMs: 0,
      runningSinceMs: nowMs, goalDurationMs: 1_500_000)
  }

  func elapsed(at nowMs: Double) -> Double {
    accumulatedMs + (runningSinceMs.map { max(0, nowMs - $0) } ?? 0)
  }

  func paused(at nowMs: Double) -> StudySession {
    guard phase == .running else { return self }
    var result = self
    result.accumulatedMs = elapsed(at: nowMs)
    result.runningSinceMs = nil
    result.phase = .paused
    return result
  }

  func resumed(at nowMs: Double) -> StudySession {
    guard phase == .paused else { return self }
    var result = self
    result.runningSinceMs = nowMs
    result.phase = .running
    return result
  }
}
