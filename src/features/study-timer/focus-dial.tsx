import { StyleSheet, Text, useWindowDimensions, View } from "react-native";
import Animated, {
  type SharedValue,
  useAnimatedProps,
} from "react-native-reanimated";
import Svg, { Circle } from "react-native-svg";

import { Fonts } from "@/constants/theme";

import { RollingElapsed } from "./rolling-elapsed";
import { focusProgress, formatElapsed } from "./timer-format";
import type { TimerPalette } from "./timer-theme";

// Arc geometry adapted from number-flow-react-native's step-counter recipe.
const SIZE = 360;
const STROKE = 8;
const RADIUS = (SIZE - STROKE) / 2 - 6;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;
const ARC_LENGTH = (240 / 360) * CIRCUMFERENCE;
const AnimatedCircle = Animated.createAnimatedComponent(Circle);

export function FocusDial({
  elapsedMs,
  visualElapsedMs,
  goalDurationMs,
  running,
  colors,
}: {
  elapsedMs: number;
  visualElapsedMs: SharedValue<number>;
  goalDurationMs: number;
  running: boolean;
  colors: TimerPalette;
}) {
  const progress = focusProgress(elapsedMs, goalDurationMs);
  const arcProps = useAnimatedProps(() => {
    const currentProgress = focusProgress(
      visualElapsedMs.get(),
      goalDurationMs,
    );
    return {
      strokeDashoffset: ARC_LENGTH * (1 - currentProgress),
      opacity: currentProgress > 0 ? 1 : 0,
    };
  });
  const percent = Math.floor(progress * 100);
  const { fontScale } = useWindowDimensions();
  const largeText = fontScale > 1.3;
  const goalMinutes = goalDurationMs / 60_000;
  const legend = (
    <Text style={[styles.legend, { color: colors.secondary }]}>
      hours · minutes · seconds
    </Text>
  );
  return (
    <View style={styles.container}>
      <View style={styles.dial}>
        <Svg
          accessible={false}
          pointerEvents="none"
          width="100%"
          height="100%"
          viewBox={`0 0 ${SIZE} ${SIZE}`}
        >
          <Circle
            cx={SIZE / 2}
            cy={SIZE / 2}
            r={RADIUS}
            fill="none"
            stroke={colors.border}
            strokeWidth={STROKE}
            strokeDasharray={[ARC_LENGTH, CIRCUMFERENCE - ARC_LENGTH]}
            strokeLinecap="round"
            rotation={150}
            origin={`${SIZE / 2}, ${SIZE / 2}`}
          />
          <AnimatedCircle
            cx={SIZE / 2}
            cy={SIZE / 2}
            r={RADIUS}
            fill="none"
            stroke={colors.accent}
            strokeWidth={STROKE}
            strokeDasharray={[ARC_LENGTH, CIRCUMFERENCE]}
            animatedProps={arcProps}
            strokeLinecap="round"
            rotation={150}
            origin={`${SIZE / 2}, ${SIZE / 2}`}
          />
        </Svg>
        <View style={styles.clock}>
          <RollingElapsed
            formatted={formatElapsed(elapsedMs)}
            elapsedMs={visualElapsedMs}
            color={colors.text}
            background={colors.background}
            running={running}
          />
          {!largeText && legend}
        </View>
      </View>
      {largeText && legend}
      <View
        testID="timer-goal-progress"
        accessible
        accessibilityRole="progressbar"
        accessibilityLabel={`${goalMinutes}-minute focus goal`}
        accessibilityValue={{
          min: 0,
          max: 100,
          now: percent,
          text: `${percent}% complete${progress === 1 ? ", goal reached" : ""}`,
        }}
        style={[styles.goal, { marginTop: largeText ? 16 : -52 }]}
      >
        <Text style={[styles.goalTitle, { color: colors.text }]}>
          {goalMinutes}-minute focus goal
        </Text>
        <Text style={[styles.goalValue, { color: colors.secondary }]}>
          {progress === 1 ? "Goal reached" : `${percent}% complete`}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 8 },
  dial: { width: "100%", maxWidth: 320, aspectRatio: 1, alignSelf: "center" },
  clock: {
    position: "absolute",
    top: 0,
    bottom: 0,
    left: 24,
    right: 24,
    justifyContent: "center",
    gap: 8,
  },
  legend: {
    fontFamily: Fonts.rounded,
    fontSize: 13,
    letterSpacing: 0.4,
    textAlign: "center",
  },
  goal: { gap: 5, alignItems: "center" },
  goalTitle: {
    fontFamily: Fonts.rounded,
    fontSize: 15,
    fontWeight: "600",
    textAlign: "center",
  },
  goalValue: {
    fontFamily: Fonts.rounded,
    fontSize: 13,
    textAlign: "center",
    fontVariant: ["tabular-nums"],
  },
});
