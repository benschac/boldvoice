import ActivityKit
import SwiftUI
import WidgetKit

@main
struct StudyTimerWidgetBundle: WidgetBundle {
  var body: some Widget { StudyTimerWidget() }
}

struct StudyTimerWidget: Widget {
  private let accent = Color(red: 182 / 255, green: 227 / 255, blue: 195 / 255)
  private let pausedAccent = Color(red: 255 / 255, green: 218 / 255, blue: 135 / 255)

  var body: some WidgetConfiguration {
    ActivityConfiguration(for: StudyTimerAttributes.self) { context in
      VStack(alignment: .leading, spacing: 6) {
        phaseLabel(context.state)
          .font(.caption)
        sessionName(context.attributes.name)
        elapsed(context.state)
          .font(.title.monospacedDigit())
          .frame(maxWidth: .infinity, alignment: .leading)
      }
      .padding(16)
      .dynamicTypeSize(...DynamicTypeSize.large)
      .activityBackgroundTint(Color(red: 20 / 255, green: 27 / 255, blue: 23 / 255))
      .activitySystemActionForegroundColor(.white)
      .foregroundStyle(.white)
    } dynamicIsland: { context in
      DynamicIsland {
        DynamicIslandExpandedRegion(.leading) {
          phaseLabel(context.state)
            .font(.caption)
            .dynamicTypeSize(...DynamicTypeSize.large)
        }
        DynamicIslandExpandedRegion(.trailing) {
          Text("25 min goal")
            .font(.caption2)
            .lineLimit(1)
            .minimumScaleFactor(0.8)
            .padding(.trailing, 12)
            .dynamicTypeSize(...DynamicTypeSize.large)
        }
        DynamicIslandExpandedRegion(.bottom) {
          VStack(alignment: .leading, spacing: 6) {
            sessionName(context.attributes.name)
            HStack(spacing: 16) {
              elapsed(context.state)
                .font(.title2.monospacedDigit())
                .frame(maxWidth: .infinity, alignment: .leading)
              goalProgress(context)
                .frame(width: 36, height: 36)
            }
          }
          .padding(.horizontal, 8)
          .padding(.bottom, 6)
          .dynamicTypeSize(...DynamicTypeSize.large)
        }
      } compactLeading: {
        HStack(spacing: 3) {
          if context.state.phase == "paused" {
            Image(systemName: "pause.fill")
              .font(.caption2)
              .accessibilityHidden(true)
          }
          Text(context.attributes.name)
            .font(.caption)
            .lineLimit(1)
            .truncationMode(.tail)
        }
        .frame(maxWidth: 70, alignment: .leading)
        .accessibilityElement(children: .ignore)
        .accessibilityLabel(Text(context.attributes.name))
        .accessibilityValue(context.state.phase == "paused" ? "Paused" : "Studying")
      } compactTrailing: {
        elapsed(context.state)
          .font(.caption2.monospacedDigit())
          .multilineTextAlignment(.trailing)
          .frame(width: 64, alignment: .trailing)
      } minimal: {
        elapsed(context.state)
          .font(.system(size: 9, design: .monospaced))
          .multilineTextAlignment(.center)
          .frame(width: 34)
      }
      .keylineTint(accent)
    }
  }

  private func sessionName(_ name: String) -> some View {
    Text(name)
      .font(.system(size: 13, weight: .semibold))
      .lineLimit(4)
      .minimumScaleFactor(0.7)
      .allowsTightening(true)
      .frame(maxWidth: .infinity, maxHeight: 64, alignment: .topLeading)
      .accessibilityLabel(Text(name))
  }

  private func phaseLabel(_ state: StudyTimerAttributes.ContentState) -> some View {
    Label(
      state.phase == "paused" ? "Paused" : "Studying",
      systemImage: state.phase == "paused" ? "pause.fill" : "book.closed.fill"
    )
    .foregroundStyle(state.phase == "paused" ? pausedAccent : accent)
  }

  private func elapsed(_ state: StudyTimerAttributes.ContentState) -> some View {
    let timer = Text(
      timerInterval: state.timerRange, pauseTime: state.pauseDate,
      countsDown: false, showsHours: true)
    return
      timer
      .lineLimit(1)
      .minimumScaleFactor(0.5)
      .accessibilityLabel(state.phase == "paused" ? "Paused study time" : "Elapsed study time")
      .accessibilityValue(timer)
  }

  private func goalProgress(_ context: ActivityViewContext<StudyTimerAttributes>) -> some View {
    let state = context.state
    let goalSeconds = context.attributes.goalDurationMs / 1_000
    return Group {
      if state.phase == "paused" {
        let progress = min(1, max(0, state.accumulatedMs / context.attributes.goalDurationMs))
        ZStack {
          Circle().stroke(accent.opacity(0.25), lineWidth: 4)
          Circle()
            .trim(from: 0, to: progress)
            .stroke(accent, style: StrokeStyle(lineWidth: 4, lineCap: .round))
            .rotationEffect(.degrees(-90))
        }
        .padding(2)
        .accessibilityElement(children: .ignore)
        .accessibilityValue(Text(progress, format: .percent.precision(.fractionLength(0))))
      } else {
        ProgressView(
          timerInterval: state
            .effectiveStart...state.effectiveStart.addingTimeInterval(goalSeconds),
          countsDown: false
        ) {
          EmptyView()
        } currentValueLabel: {
          EmptyView()
        }
        .progressViewStyle(.circular)
        .tint(accent)
        .labelsHidden()
      }
    }
    .accessibilityLabel("25-minute focus goal")
  }
}
