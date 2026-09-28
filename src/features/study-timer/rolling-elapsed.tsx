import { useEffect, useState } from "react";
import {
  AccessibilityInfo,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import Animated, {
  cancelAnimation,
  Easing,
  ReduceMotion,
  type SharedValue,
  useAnimatedReaction,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import Svg, { Defs, LinearGradient, Rect, Stop } from "react-native-svg";

import { Fonts } from "@/constants/theme";

function RollingDigit({
  value,
  elapsedMs,
  placeSeconds,
  radix,
  size,
  color,
  animate,
}: {
  value: number;
  elapsedMs: SharedValue<number>;
  placeSeconds: number;
  radix: number;
  size: number;
  color: string;
  animate: boolean;
}) {
  const height = Math.ceil(size * 1.25);
  const position = useSharedValue(value);
  useAnimatedReaction(
    () => ({
      step: Math.floor(Math.max(0, elapsedMs.get()) / (placeSeconds * 1000)),
      animate,
    }),
    (current, previous) => {
      if (
        current.step === previous?.step &&
        current.animate === previous.animate
      ) {
        return;
      }
      const digit = current.step % radix;
      cancelAnimation(position);
      if (
        !current.animate ||
        !previous?.animate ||
        current.step !== previous.step + 1
      ) {
        position.set(digit);
        return;
      }
      // The duplicate zero lets a wrap finish before resetting the reel.
      position.set(
        withTiming(
          digit === 0 ? radix : digit,
          {
            duration: 220,
            easing: Easing.out(Easing.cubic),
            reduceMotion: ReduceMotion.System,
          },
          (finished) => {
            if (finished && digit === 0) position.set(0);
          },
        ),
      );
    },
  );
  const reelStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: -height * position.get() }],
  }));
  const type = { fontSize: size, lineHeight: height, height, color };
  return (
    <View style={{ height, width: size * 0.62, overflow: "hidden" }}>
      <Animated.View style={reelStyle}>
        {Array.from({ length: radix + 1 }, (_, digit) => (
          <Text
            key={digit}
            allowFontScaling={false}
            style={[styles.digit, type]}
          >
            {digit % radix}
          </Text>
        ))}
      </Animated.View>
    </View>
  );
}

export function RollingElapsed({
  formatted,
  elapsedMs,
  color,
  background,
  running,
}: {
  formatted: string;
  elapsedMs: SharedValue<number>;
  color: string;
  background: string;
  running: boolean;
}) {
  const [width, setWidth] = useState(0);
  const [reduceMotion, setReduceMotion] = useState(true);
  const { fontScale } = useWindowDimensions();
  useEffect(() => {
    let mounted = true;
    void AccessibilityInfo.isReduceMotionEnabled().then((enabled) => {
      if (mounted) setReduceMotion(enabled);
    });
    const subscription = AccessibilityInfo.addEventListener(
      "reduceMotionChanged",
      setReduceMotion,
    );
    return () => {
      mounted = false;
      subscription.remove();
    };
  }, []);
  const units = [...formatted].reduce(
    (sum, character) => sum + (character === ":" ? 0.3 : 0.62),
    0,
  );
  const size = Math.min(64 * fontScale, (width || 320) / units);
  return (
    <View
      testID="timer-elapsed"
      accessible
      accessibilityLabel={`Elapsed time ${formatted}`}
      onLayout={({ nativeEvent }) => setWidth(nativeEvent.layout.width)}
    >
      <View
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
        style={styles.row}
      >
        {[...formatted].map((character, index) => {
          const place = formatted.length - index - 1;
          return character === ":" ? (
            <Text
              key={place}
              allowFontScaling={false}
              style={[
                styles.separator,
                {
                  fontSize: size,
                  lineHeight: Math.ceil(size * 1.25),
                  width: size * 0.3,
                  color,
                },
              ]}
            >
              {character}
            </Text>
          ) : (
            <RollingDigit
              key={place}
              value={Number(character)}
              elapsedMs={elapsedMs}
              placeSeconds={
                place < 2
                  ? 10 ** place
                  : place < 5
                    ? 60 * 10 ** (place - 3)
                    : 3600 * 10 ** (place - 6)
              }
              radix={place === 1 || place === 4 ? 6 : 10}
              size={size}
              color={color}
              animate={running && !reduceMotion}
            />
          );
        })}
        <Svg
          pointerEvents="none"
          accessible={false}
          style={StyleSheet.absoluteFill}
          width="100%"
          height="100%"
        >
          <Defs>
            <LinearGradient id="digitEdges" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor={background} stopOpacity="1" />
              <Stop offset="0.18" stopColor={background} stopOpacity="0" />
              <Stop offset="0.82" stopColor={background} stopOpacity="0" />
              <Stop offset="1" stopColor={background} stopOpacity="1" />
            </LinearGradient>
          </Defs>
          <Rect width="100%" height="100%" fill="url(#digitEdges)" />
        </Svg>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", justifyContent: "center" },
  digit: {
    fontFamily: Fonts.rounded,
    fontWeight: "500",
    fontVariant: ["tabular-nums"],
    textAlign: "center",
  },
  separator: {
    fontFamily: Fonts.rounded,
    fontWeight: "500",
    textAlign: "center",
  },
});
