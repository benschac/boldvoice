import { useEffect, useLayoutEffect, useRef, useState } from "react";
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
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";

// Adapted from hewad-mubariz/reactnative-50-days, timer/src/components/Digit.tsx.
function RollingDigit({
  value,
  size,
  color,
  animate,
}: {
  value: string;
  size: number;
  color: string;
  animate: boolean;
}) {
  const height = Math.ceil(size * 1.25);
  const previous = useRef(value);
  const [digits, setDigits] = useState({ outgoing: value, incoming: value });
  const translateY = useSharedValue(-height);

  useLayoutEffect(() => {
    const outgoing = previous.current;
    previous.current = value;
    cancelAnimation(translateY);
    setDigits({ outgoing, incoming: value });
    if (animate && outgoing !== value) {
      translateY.set(0);
      translateY.set(
        withTiming(-height, {
          duration: 300,
          easing: Easing.inOut(Easing.quad),
          reduceMotion: ReduceMotion.System,
        }),
      );
    } else {
      translateY.set(-height);
    }
    return () => cancelAnimation(translateY);
  }, [value, height, animate, translateY]);

  const outgoingStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.get() }],
  }));
  const incomingStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.get() + height }],
  }));
  const type = { fontSize: size, lineHeight: height, height, color };
  return (
    <View style={{ height, width: size * 0.62, overflow: "hidden" }}>
      <Animated.Text
        allowFontScaling={false}
        style={[styles.digit, type, outgoingStyle]}
      >
        {digits.outgoing}
      </Animated.Text>
      <Animated.Text
        allowFontScaling={false}
        style={[styles.digit, type, incomingStyle]}
      >
        {digits.incoming}
      </Animated.Text>
    </View>
  );
}

export function RollingElapsed({
  formatted,
  color,
  running,
}: {
  formatted: string;
  color: string;
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
        {[...formatted].map((character, index) =>
          character === ":" ? (
            <Text
              key={index}
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
              key={index}
              value={character}
              size={size}
              color={color}
              animate={running && !reduceMotion}
            />
          ),
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", justifyContent: "center" },
  digit: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 0,
    fontWeight: "500",
    fontVariant: ["tabular-nums"],
    textAlign: "center",
  },
  separator: { fontWeight: "500", textAlign: "center" },
});
