import ActivityKit
import Foundation

struct StudyTimerAttributes: ActivityAttributes {
  struct ContentState: Codable, Hashable {
    let phase: String
    let accumulatedMs: Double
    let runningSinceMs: Double?

    var effectiveStart: Date {
      Date(timeIntervalSince1970: ((runningSinceMs ?? 0) - accumulatedMs) / 1_000)
    }

    var pauseDate: Date? {
      phase == "paused" ? Date(timeIntervalSince1970: 0) : nil
    }

    var timerRange: ClosedRange<Date> {
      effectiveStart...Date.distantFuture
    }
  }

  let sessionId: String
  let name: String
  let goalDurationMs: Double
}
