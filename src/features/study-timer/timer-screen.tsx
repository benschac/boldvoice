import { Image } from "expo-image";
import { Stack } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Keyboard,
  StyleSheet,
  Text,
  TextInput,
  useColorScheme,
  useWindowDimensions,
  View,
} from "react-native";
import Animated, {
  FadeIn,
  ReduceMotion,
  useAnimatedReaction,
  useFrameCallback,
  useSharedValue,
} from "react-native-reanimated";
import { scheduleOnRN } from "react-native-worklets";
import {
  KeyboardAwareScrollView,
  useKeyboardState,
} from "react-native-keyboard-controller";

import { Fonts } from "@/constants/theme";

import type { SessionSnapshot } from "./study-timer.types";
import { FocusDial } from "./focus-dial";
import { TimerButton } from "./timer-button";
import { elapsedMilliseconds } from "./timer-format";
import { timerPalettes, type TimerPalette } from "./timer-theme";
import { useStudyTimer } from "./use-study-timer";

function ElapsedTime({
  session,
  foreground,
  colors,
}: {
  session: SessionSnapshot;
  foreground: boolean;
  colors: TimerPalette;
}) {
  const running = foreground && session.phase === "running";
  const [elapsedMs, setElapsedMs] = useState(() =>
    elapsedMilliseconds(session, Date.now()),
  );
  const visualElapsedMs = useSharedValue(elapsedMs);
  const frame = useFrameCallback(
    useCallback(() => {
      "worklet";
      visualElapsedMs.set(elapsedMilliseconds(session, Date.now()));
    }, [session, visualElapsedMs]),
    running,
  );
  useEffect(() => {
    frame.setActive(running);
    visualElapsedMs.set(elapsedMilliseconds(session, Date.now()));
  }, [frame, running, session, visualElapsedMs]);
  useAnimatedReaction(
    () => Math.floor(visualElapsedMs.get() / 1000),
    (seconds, previous) => {
      if (seconds !== previous) scheduleOnRN(setElapsedMs, seconds * 1000);
    },
  );
  return (
    <FocusDial
      elapsedMs={elapsedMs}
      visualElapsedMs={visualElapsedMs}
      goalDurationMs={session.goalDurationMs}
      colors={colors}
      running={running}
    />
  );
}

export function TimerScreen() {
  const timer = useStudyTimer();
  const [name, setName] = useState("");
  const [inputFocused, setInputFocused] = useState(false);
  const [formFooterHeight, setFormFooterHeight] = useState(0);
  const [viewportHeight, setViewportHeight] = useState(0);
  const [inputHeight, setInputHeight] = useState(0);
  const keyboardHeight = useKeyboardState((state) => state.height);
  const colors = timerPalettes[useColorScheme() === "dark" ? "dark" : "light"];
  const { fontScale } = useWindowDimensions();
  const session = timer.result?.session;
  const warning = timer.result?.warning;
  const disabled = timer.pending !== null || !timer.foreground;
  const start = () => {
    Keyboard.dismiss();
    void timer.start(name);
  };
  const activityUnavailable = session && session.activityStatus !== "active";
  const keyboardClearance = Math.min(
    formFooterHeight + 56,
    Math.max(0, viewportHeight - keyboardHeight - inputHeight - 32),
  );

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: true,
          title: "Study timer",
          headerShadowVisible: false,
          headerStyle: { backgroundColor: colors.background },
          headerTintColor: colors.text,
          headerTitleStyle: { fontFamily: Fonts.rounded, fontWeight: "600" },
          contentStyle: { backgroundColor: colors.background },
        }}
      />
      <KeyboardAwareScrollView
        style={{ backgroundColor: colors.background }}
        contentContainerStyle={styles.content}
        contentInsetAdjustmentBehavior="automatic"
        bottomOffset={keyboardClearance}
        onLayout={({ nativeEvent }) =>
          setViewportHeight(nativeEvent.layout.height)
        }
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive"
      >
        {timer.capabilities?.supported === false ? (
          <View style={[styles.card, { backgroundColor: colors.card }]}>
            <Text
              accessibilityRole="header"
              style={[styles.sectionTitle, { color: colors.text }]}
            >
              An iPhone is required
            </Text>
            <Text style={[styles.body, { color: colors.secondary }]}>
              Study Timer uses iOS Live Activities. Open the iOS development
              build to start a session.
            </Text>
          </View>
        ) : timer.result === null ? (
          <View style={[styles.card, { backgroundColor: colors.card }]}>
            <Text style={[styles.body, { color: colors.text }]}>
              {timer.pending ? "Loading your session…" : "Session unavailable"}
            </Text>
            {!timer.pending && (
              <TimerButton
                label="Refresh session"
                testID="timer-refresh"
                onPress={() => {
                  void timer.refresh();
                }}
                disabled={false}
                colors={colors}
                symbol="arrow.clockwise"
              />
            )}
          </View>
        ) : session ? (
          <Animated.View
            key={session.sessionId}
            entering={FadeIn.duration(180).reduceMotion(ReduceMotion.System)}
            style={styles.session}
          >
            <View
              style={[
                styles.phase,
                {
                  backgroundColor:
                    session.phase === "paused" ? colors.warning : colors.subtle,
                },
              ]}
            >
              <Image
                source={
                  session.phase === "running"
                    ? "sf:book.closed"
                    : "sf:pause.fill"
                }
                tintColor={
                  session.phase === "paused"
                    ? colors.warningText
                    : colors.accent
                }
                style={styles.smallIcon}
                accessible={false}
              />
              <Text
                testID="timer-phase"
                style={[
                  styles.phaseText,
                  {
                    color:
                      session.phase === "paused"
                        ? colors.warningText
                        : colors.accent,
                  },
                ]}
              >
                {session.phase === "running" ? "IN PROGRESS" : "PAUSED"}
              </Text>
            </View>
            <Text
              selectable
              testID="timer-session-name"
              accessibilityRole="header"
              style={[styles.sessionName, { color: colors.text }]}
            >
              {session.name}
            </Text>
            <View style={styles.clock}>
              <ElapsedTime
                key={`${session.sessionId}:${session.runningSinceMs}:${timer.foreground}`}
                session={session}
                foreground={timer.foreground}
                colors={colors}
              />
            </View>
            <View
              style={[
                styles.controls,
                { flexDirection: fontScale > 1.3 ? "column" : "row" },
              ]}
            >
              <View style={styles.control}>
                <TimerButton
                  label={session.phase === "running" ? "Pause" : "Resume"}
                  symbol={
                    session.phase === "running" ? "pause.fill" : "play.fill"
                  }
                  testID={
                    session.phase === "running" ? "timer-pause" : "timer-resume"
                  }
                  onPress={() => {
                    void (session.phase === "running"
                      ? timer.pause()
                      : timer.resume());
                  }}
                  disabled={disabled}
                  colors={colors}
                />
              </View>
              <View style={styles.control}>
                <TimerButton
                  label="Stop"
                  symbol="stop.fill"
                  testID="timer-stop"
                  onPress={() => {
                    void timer.stop();
                  }}
                  disabled={disabled}
                  secondary
                  colors={colors}
                />
              </View>
            </View>
            <Text
              style={[
                styles.caption,
                { color: colors.secondary, textAlign: "center" },
              ]}
            >
              Your timer continues after the goal.
            </Text>
          </Animated.View>
        ) : (
          <Animated.View
            key="new-session"
            entering={FadeIn.duration(180).reduceMotion(ReduceMotion.System)}
            style={styles.entry}
          >
            <View style={styles.intro}>
              <View
                style={[styles.bookMark, { backgroundColor: colors.subtle }]}
              >
                <Image
                  source="sf:book.closed"
                  tintColor={colors.accent}
                  style={{ width: 30, height: 30 }}
                  accessible={false}
                />
              </View>
              <Text
                accessibilityRole="header"
                style={[styles.title, { color: colors.text }]}
              >
                Time to focus.
              </Text>
              <Text style={[styles.body, { color: colors.secondary }]}>
                One session. Your full attention.
              </Text>
            </View>
            <View style={styles.form}>
              <Text style={[styles.label, { color: colors.text }]}>
                What are you studying?
              </Text>
              <TextInput
                testID="timer-name-input"
                accessibilityLabel="Session name"
                accessibilityHint="Required, up to 80 characters. Appears on your Lock Screen."
                value={name}
                onChangeText={setName}
                onFocus={() => setInputFocused(true)}
                onBlur={() => setInputFocused(false)}
                onLayout={({ nativeEvent }) =>
                  setInputHeight(nativeEvent.layout.height)
                }
                placeholder="Chapter 5 Review"
                placeholderTextColor={colors.secondary}
                selectionColor={colors.accent}
                editable={!disabled}
                returnKeyType="done"
                onSubmitEditing={start}
                style={[
                  styles.input,
                  {
                    color: colors.text,
                    borderColor: inputFocused ? colors.accent : colors.border,
                    backgroundColor: colors.card,
                  },
                ]}
              />
              <View
                style={styles.form}
                onLayout={({ nativeEvent }) =>
                  setFormFooterHeight(nativeEvent.layout.height)
                }
              >
                <Text style={[styles.caption, { color: colors.secondary }]}>
                  Appears on your Lock Screen. Up to 80 characters.
                </Text>
                {timer.error && (
                  <Text
                    selectable
                    accessibilityRole="alert"
                    testID="timer-error"
                    style={[styles.body, { color: colors.danger }]}
                  >
                    {timer.error}
                  </Text>
                )}
                <View style={styles.startButton}>
                  <TimerButton
                    label="Start session"
                    symbol="play.fill"
                    testID="timer-start"
                    onPress={start}
                    disabled={disabled}
                    colors={colors}
                  />
                </View>
                {timer.capabilities?.activitiesEnabled === false && (
                  <Text style={[styles.body, { color: colors.secondary }]}>
                    Live Activities are disabled. Your timer will still run in
                    the app.
                  </Text>
                )}
              </View>
            </View>
          </Animated.View>
        )}

        {(warning || activityUnavailable) && (
          <View style={[styles.notice, { backgroundColor: colors.warning }]}>
            <Text
              selectable
              accessibilityRole="alert"
              testID="timer-warning"
              style={[styles.body, { color: colors.warningText }]}
            >
              {warning?.message ??
                "The Live Activity is no longer visible. Your session is still saved."}
            </Text>
            {activityUnavailable && (
              <TimerButton
                label="Retry Live Activity"
                symbol="arrow.clockwise"
                testID="timer-retry"
                onPress={() => {
                  void timer.retry();
                }}
                disabled={disabled}
                secondary
                colors={colors}
              />
            )}
            {warning?.code === "ACTIVITY_CLEANUP_UNCONFIRMED" && (
              <TimerButton
                label="Check again"
                testID="timer-cleanup-retry"
                onPress={() => {
                  void timer.refresh();
                }}
                disabled={disabled}
                secondary
                colors={colors}
              />
            )}
          </View>
        )}
        {timer.error &&
          (session ||
            timer.result === null ||
            timer.capabilities?.supported === false) && (
            <Text
              selectable
              accessibilityRole="alert"
              testID="timer-error"
              style={[styles.body, { color: colors.danger }]}
            >
              {timer.error}
            </Text>
          )}
        <View style={styles.pending} accessibilityLiveRegion="polite">
          {timer.pending && (
            <>
              <ActivityIndicator color={colors.accent} />
              <Text style={[styles.caption, { color: colors.secondary }]}>
                {timer.pending === "refresh"
                  ? "Checking session…"
                  : "Updating timer…"}
              </Text>
            </>
          )}
        </View>
        {timer.capabilities?.supported && timer.result !== null && (
          <View style={styles.footer}>
            <Image
              source="sf:lock.iphone"
              tintColor={colors.secondary}
              style={styles.footerIcon}
              accessible={false}
            />
            <Text
              testID={session ? "timer-activity-status" : undefined}
              style={[styles.footerText, { color: colors.secondary }]}
            >
              {session
                ? session.activityStatus === "active"
                  ? "Live Activity active"
                  : session.activityStatus === "missing"
                    ? "Live Activity missing"
                    : "Live Activity unavailable"
                : "Keeps counting when you leave the app."}
            </Text>
          </View>
        )}
      </KeyboardAwareScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  content: {
    flexGrow: 1,
    padding: 28,
    paddingBottom: 32,
    gap: 24,
    width: "100%",
    maxWidth: 600,
    alignSelf: "center",
  },
  entry: { gap: 40 },
  intro: { gap: 12, paddingTop: 20 },
  bookMark: {
    width: 64,
    height: 64,
    borderRadius: 22,
    borderCurve: "continuous",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  title: {
    fontFamily: Fonts.rounded,
    fontSize: 36,
    fontWeight: "600",
    letterSpacing: -1.2,
  },
  sectionTitle: { fontFamily: Fonts.rounded, fontSize: 23, fontWeight: "600" },
  body: { fontFamily: Fonts.rounded, fontSize: 16, lineHeight: 24 },
  caption: { fontFamily: Fonts.rounded, fontSize: 14, lineHeight: 21 },
  form: { gap: 12 },
  label: { fontFamily: Fonts.rounded, fontSize: 17, fontWeight: "600" },
  input: {
    borderWidth: 1,
    borderRadius: 16,
    borderCurve: "continuous",
    padding: 18,
    minHeight: 60,
    fontFamily: Fonts.rounded,
    fontSize: 19,
  },
  startButton: { marginTop: 12 },
  card: { padding: 24, borderRadius: 24, borderCurve: "continuous", gap: 18 },
  session: { gap: 20, paddingTop: 12 },
  phase: {
    alignSelf: "center",
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 24,
  },
  phaseText: {
    fontFamily: Fonts.rounded,
    fontSize: 12,
    fontWeight: "600",
    letterSpacing: 1.2,
  },
  smallIcon: { width: 14, height: 14 },
  sessionName: {
    fontFamily: Fonts.rounded,
    fontSize: 28,
    fontWeight: "500",
    letterSpacing: -0.5,
    textAlign: "center",
  },
  clock: { paddingVertical: 4 },
  controls: { gap: 12 },
  control: { flex: 1 },
  notice: { padding: 20, gap: 14, borderRadius: 18, borderCurve: "continuous" },
  pending: {
    minHeight: 24,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 10,
  },
  footer: {
    marginTop: "auto",
    paddingTop: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  footerIcon: { width: 18, height: 22 },
  footerText: {
    flexShrink: 1,
    fontFamily: Fonts.rounded,
    fontSize: 13,
    lineHeight: 20,
  },
});
