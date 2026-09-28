import ActivityKit
internal import ExpoModulesCore
import Foundation

struct StartOptions: Record {
  @Field var name: String = ""
}

final class StudyTimerModule: Module {
  private let coordinator = StudyTimerCoordinator(
    store: StudyTimerStore.applicationStore, activities: StudyTimerActivityAdapter())

  func definition() -> ModuleDefinition {
    Name("StudyTimerModule")
    AsyncFunction("getCapabilities") { () -> [String: Bool] in
      ["supported": true, "activitiesEnabled": ActivityAuthorizationInfo().areActivitiesEnabled]
    }
    AsyncFunction("getSession") { () async throws -> [String: Any] in
      try await self.execute(.getSession)
    }
    AsyncFunction("start") { (options: StartOptions) async throws -> [String: Any] in
      try await self.execute(.start(name: options.name))
    }
    AsyncFunction("pause") { (sessionId: String) async throws -> [String: Any] in
      try await self.execute(.pause(sessionId: sessionId))
    }
    AsyncFunction("resume") { (sessionId: String) async throws -> [String: Any] in
      try await self.execute(.resume(sessionId: sessionId))
    }
    AsyncFunction("stop") { (sessionId: String) async throws -> [String: Any] in
      try await self.execute(.stop(sessionId: sessionId))
    }
    AsyncFunction("retryActivity") { (sessionId: String) async throws -> [String: Any] in
      try await self.execute(.retryActivity(sessionId: sessionId))
    }
  }

  private func execute(_ command: StudyTimerCommand) async throws -> [String: Any] {
    do { return try await coordinator.execute(command).dictionary } catch let error
      as StudyTimerError
    {
      throw Exception(name: error.rawValue, description: error.message, code: error.rawValue)
    }
  }
}

extension StudyTimerResult {
  fileprivate var dictionary: [String: Any] {
    let sessionValue: Any =
      session.map { session -> Any in
        [
          "sessionId": session.sessionId, "name": session.name, "phase": session.phase.rawValue,
          "accumulatedMs": session.accumulatedMs,
          "runningSinceMs": session.runningSinceMs.map { $0 as Any } ?? NSNull(),
          "goalDurationMs": session.goalDurationMs,
          "activityStatus": activityStatus?.rawValue ?? "missing",
        ] as [String: Any]
      } ?? NSNull()
    let warningValue: Any =
      warning.map { warning -> Any in ["code": warning.rawValue, "message": warning.message] }
      ?? NSNull()
    return ["session": sessionValue, "warning": warningValue]
  }
}
