import ActivityKit
import Foundation

struct StudyTimerActivityAdapter: StudyActivityManaging {
  func activitiesEnabled() async -> Bool { ActivityAuthorizationInfo().areActivitiesEnabled }

  func activities() async -> [StudyActivity] {
    Activity<StudyTimerAttributes>.activities.map {
      let state: StudyActivity.State =
        switch $0.activityState {
        case .active: .active
        case .stale: .stale
        case .ended: .ended
        case .dismissed: .dismissed
        // Pending and future states still require reconciliation and cleanup.
        default: .stale
        }
      return StudyActivity(id: $0.id, sessionId: $0.attributes.sessionId, state: state)
    }
  }

  func request(_ session: StudySession) async throws {
    _ = try Activity.request(
      attributes: StudyTimerAttributes(
        sessionId: session.sessionId, name: session.name, goalDurationMs: session.goalDurationMs),
      content: content(session), pushType: nil
    )
  }

  func update(id: String, session: StudySession) async {
    guard let activity = Activity<StudyTimerAttributes>.activities.first(where: { $0.id == id })
    else { return }
    await activity.update(content(session))
  }

  func end(id: String) async {
    guard let activity = Activity<StudyTimerAttributes>.activities.first(where: { $0.id == id })
    else { return }
    await activity.end(nil, dismissalPolicy: .immediate)
  }

  private func content(_ session: StudySession) -> ActivityContent<
    StudyTimerAttributes.ContentState
  > {
    ActivityContent(
      state: .init(
        phase: session.phase.rawValue, accumulatedMs: session.accumulatedMs,
        runningSinceMs: session.runningSinceMs), staleDate: nil)
  }
}
