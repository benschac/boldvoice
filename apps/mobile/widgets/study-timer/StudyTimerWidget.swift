import ActivityKit
import SwiftUI
import WidgetKit

@main
struct StudyTimerWidgetBundle: WidgetBundle {
  var body: some Widget { StudyTimerWidget() }
}

struct StudyTimerWidget: Widget {
  var body: some WidgetConfiguration {
    ActivityConfiguration(for: StudyTimerAttributes.self) { context in
      VStack(alignment: .leading, spacing: 8) {
        Text(context.attributes.name).font(.headline).lineLimit(2)
        elapsed(context.state).font(.title.monospacedDigit())
        Text(context.state.phase == "paused" ? "Paused" : "Studying").font(.caption)
      }
      .padding()
      .activityBackgroundTint(.black)
      .activitySystemActionForegroundColor(.white)
      .foregroundStyle(.white)
    } dynamicIsland: { context in
      DynamicIsland {
        DynamicIslandExpandedRegion(.center) {
          VStack {
            Text(context.attributes.name).lineLimit(3)
            elapsed(context.state).font(.title.monospacedDigit())
          }
        }
      } compactLeading: {
        Text(context.attributes.name).lineLimit(1).frame(maxWidth: 70)
      } compactTrailing: {
        elapsed(context.state).font(.caption2.monospacedDigit()).frame(width: 64)
      } minimal: {
        elapsed(context.state).font(.system(size: 9).monospacedDigit()).frame(width: 42)
      }
    }
  }

  private func elapsed(_ state: StudyTimerAttributes.ContentState) -> some View {
    Text(
      timerInterval: state.timerRange, pauseTime: state.pauseDate, countsDown: false,
      showsHours: true)
  }
}
