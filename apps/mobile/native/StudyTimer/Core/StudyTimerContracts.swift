import Foundation

enum StudyTimerError: String, Error, Sendable {
  case invalidName = "INVALID_NAME"
  case sessionConflict = "SESSION_CONFLICT"
  case staleSession = "STALE_SESSION"
  case persistenceFailed = "PERSISTENCE_FAILED"

  var message: String {
    switch self {
    case .invalidName: "Enter a name of 1–80 characters."
    case .sessionConflict: "Stop the current session first."
    case .staleSession: "The session has changed. Refresh and try again."
    case .persistenceFailed: "Could not save or read your timer. Please try again."
    }
  }
}

enum StudyTimerWarning: String, Sendable {
  case activityUnavailable = "ACTIVITY_UNAVAILABLE"
  case activityMissing = "ACTIVITY_MISSING"
  case cleanupUnconfirmed = "ACTIVITY_CLEANUP_UNCONFIRMED"
  case sessionDiscarded = "SESSION_DISCARDED"

  var message: String {
    switch self {
    case .activityUnavailable: "Live Activity unavailable. Your timer still works in the app."
    case .activityMissing: "Live Activity is missing. Retry to show it again."
    case .cleanupUnconfirmed:
      "Live Activity cleanup could not be confirmed. Reopen the app to try again."
    case .sessionDiscarded: "The saved timer was invalid and has been discarded."
    }
  }
}

enum StudyActivityStatus: String, Sendable {
  case active, unavailable, missing
}

struct StudyTimerResult: Sendable {
  let session: StudySession?
  let activityStatus: StudyActivityStatus?
  let warning: StudyTimerWarning?
}

enum StudyTimerCommand: Sendable {
  case getSession
  case start(name: String)
  case pause(sessionId: String)
  case resume(sessionId: String)
  case stop(sessionId: String)
  case retryActivity(sessionId: String)
}

enum StudyStoreRead: Equatable, Sendable {
  case missing
  case session(StudySession)
  case invalid
}

protocol StudyTimerStoring: Sendable {
  func load() async throws -> StudyStoreRead
  func save(_ session: StudySession) async throws
  func delete() async throws
}

struct StudyActivity: Sendable {
  enum State: Sendable {
    case active, stale, ended, dismissed
    var isNonterminal: Bool { self == .active || self == .stale }
  }

  let id: String
  let sessionId: String
  let state: State
}

protocol StudyActivityManaging: Sendable {
  func activitiesEnabled() async -> Bool
  func activities() async -> [StudyActivity]
  func request(_ session: StudySession) async throws
  func update(id: String, session: StudySession) async
  func end(id: String) async
}
