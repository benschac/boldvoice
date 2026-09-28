import ActivityKit
import SwiftUI

@main
struct CompanionApp: App {
  var body: some Scene {
    WindowGroup { CompanionControls() }
  }
}

private struct CompanionControls: View {
  @State private var status = "No companion activity requested."
  @State private var working = false

  var body: some View {
    VStack(spacing: 24) {
      Text("Activity Companion").font(.largeTitle.bold())
      Text("Temporary acceptance fixture").font(.headline)
      Text(
        "Start the study timer first, then start this activity. Return to the Home Screen to inspect both Live Activities."
      )
      Button("Start companion activity") {
        Task { await start() }
      }
      .buttonStyle(.borderedProminent)
      .accessibilityIdentifier("start-companion")
      Button("Stop companion activity") {
        Task { await stop() }
      }
      .buttonStyle(.bordered)
      .accessibilityIdentifier("stop-companion")
      Text(status).font(.callout).accessibilityIdentifier("companion-status")
    }
    .padding(24)
    .disabled(working)
  }

  @MainActor
  private func start() async {
    guard !working else { return }
    working = true
    defer { working = false }
    for activity in Activity<CompanionAttributes>.activities {
      await activity.end(nil, dismissalPolicy: .immediate)
    }
    guard ActivityAuthorizationInfo().areActivitiesEnabled else {
      status = "Live Activities are disabled for this fixture."
      return
    }
    do {
      let activity = try Activity.request(
        attributes: CompanionAttributes(name: "Companion"),
        content: ActivityContent(
          state: CompanionAttributes.ContentState(startedAt: Date()),
          staleDate: nil, relevanceScore: 100),
        pushType: nil
      )
      status = "Companion active. ID: \(activity.id). Return Home to inspect the Island."
    } catch {
      status = "Request failed: \(error.localizedDescription)"
    }
  }

  @MainActor
  private func stop() async {
    guard !working else { return }
    working = true
    defer { working = false }
    for activity in Activity<CompanionAttributes>.activities {
      await activity.end(nil, dismissalPolicy: .immediate)
    }
    let remaining = Activity<CompanionAttributes>.activities.filter {
      $0.activityState == .active || $0.activityState == .stale
    }.count
    status = "Stop completed. Nonterminal companion activities: \(remaining)."
  }
}
