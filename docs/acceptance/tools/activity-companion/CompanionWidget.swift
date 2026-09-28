import ActivityKit
import SwiftUI
import WidgetKit

@main
struct CompanionWidgets: WidgetBundle {
  var body: some Widget { CompanionLiveActivity() }
}

private struct CompanionLiveActivity: Widget {
  var body: some WidgetConfiguration {
    ActivityConfiguration(for: CompanionAttributes.self) { context in
      VStack(alignment: .leading, spacing: 8) {
        Label("Acceptance companion", systemImage: "square.stack.fill")
          .font(.headline)
        Text("Second app activity for minimal Island verification")
          .font(.caption)
        Text(context.state.startedAt, style: .timer).monospacedDigit()
      }
      .padding()
      .activityBackgroundTint(.black)
      .activitySystemActionForegroundColor(.white)
      .foregroundStyle(.white)
    } dynamicIsland: { context in
      DynamicIsland {
        DynamicIslandExpandedRegion(.center) {
          Text("Acceptance companion")
        }
        DynamicIslandExpandedRegion(.bottom) {
          Text(context.state.startedAt, style: .timer)
            .monospacedDigit()
        }
      } compactLeading: {
        Text("C").foregroundStyle(.orange)
      } compactTrailing: {
        Image(systemName: "square.stack.fill")
          .foregroundStyle(.orange)
      } minimal: {
        Text("C").foregroundStyle(.orange)
      }
      .keylineTint(.orange)
    }
  }
}
