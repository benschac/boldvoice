import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useColorScheme,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import type { SessionSnapshot } from "./study-timer.types";
import { elapsedMilliseconds, formatElapsed } from "./timer-format";
import { useStudyTimer } from "./use-study-timer";

const palettes = {
  light: {
    background: "#F5F3EE",
    card: "#FFFFFF",
    text: "#202A25",
    secondary: "#536158",
    accent: "#245740",
    onAccent: "#FFFFFF",
    border: "#CAD1CB",
    warning: "#FFF0CE",
    warningText: "#694600",
    danger: "#A32626",
  },
  dark: {
    background: "#141B17",
    card: "#202C24",
    text: "#F3F5EF",
    secondary: "#B3C0B7",
    accent: "#B6E3C3",
    onAccent: "#163421",
    border: "#4B5E51",
    warning: "#40341D",
    warningText: "#FFDA87",
    danger: "#FFA9A9",
  },
};

type Palette = typeof palettes.light;

function TimerButton({
  label,
  onPress,
  disabled,
  secondary = false,
  colors,
  testID,
}: {
  label: string;
  onPress: () => void;
  disabled: boolean;
  secondary?: boolean;
  colors: Palette;
  testID: string;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      testID={testID}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        {
          backgroundColor: secondary ? colors.card : colors.accent,
          borderColor: secondary ? colors.border : colors.accent,
          opacity: disabled ? 0.5 : pressed ? 0.75 : 1,
        },
      ]}
    >
      <Text
        style={[
          styles.buttonText,
          { color: secondary ? colors.text : colors.onAccent },
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

function ElapsedTime({
  session,
  foreground,
  colors,
}: {
  session: SessionSnapshot;
  foreground: boolean;
  colors: Palette;
}) {
  const [now, setNow] = useState(Date.now);
  useEffect(() => {
    if (session.phase !== "running" || !foreground) return;
    const interval = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(interval);
  }, [session, foreground]);
  const formatted = formatElapsed(elapsedMilliseconds(session, now));
  return (
    <Text
      testID="timer-elapsed"
      accessibilityLabel={`Elapsed time ${formatted}`}
      adjustsFontSizeToFit
      minimumFontScale={0.45}
      numberOfLines={1}
      style={[styles.elapsed, { color: colors.text }]}
    >
      {formatted}
    </Text>
  );
}

export function TimerScreen() {
  const timer = useStudyTimer();
  const [name, setName] = useState("");
  const colors = palettes[useColorScheme() === "dark" ? "dark" : "light"];
  const session = timer.result?.session;
  const warning = timer.result?.warning;
  const disabled = timer.pending !== null || !timer.foreground;
  const start = () => {
    Keyboard.dismiss();
    void timer.start(name);
  };
  const activityUnavailable = session && session.activityStatus !== "active";

  return (
    <SafeAreaView
      style={[styles.safeArea, { backgroundColor: colors.background }]}
    >
      <KeyboardAvoidingView
        style={styles.safeArea}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
        >
          <View style={styles.heading}>
            <Text style={[styles.eyebrow, { color: colors.secondary }]}>
              ONE SESSION AT A TIME
            </Text>
            <Text
              accessibilityRole="header"
              style={[styles.title, { color: colors.text }]}
            >
              Study timer
            </Text>
            <Text style={[styles.body, { color: colors.secondary }]}>
              Make time for what you want to learn.
            </Text>
          </View>

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
                {timer.pending
                  ? "Loading your session…"
                  : "Session unavailable"}
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
                />
              )}
            </View>
          ) : session ? (
            <View style={[styles.card, { backgroundColor: colors.card }]}>
              <Text
                testID="timer-phase"
                style={[styles.eyebrow, { color: colors.secondary }]}
              >
                {session.phase === "running" ? "IN PROGRESS" : "PAUSED"}
              </Text>
              <Text
                testID="timer-session-name"
                accessibilityRole="header"
                style={[styles.sessionName, { color: colors.text }]}
              >
                {session.name}
              </Text>
              <ElapsedTime
                key={`${session.sessionId}:${session.runningSinceMs}:${timer.foreground}`}
                session={session}
                foreground={timer.foreground}
                colors={colors}
              />
              <Text style={[styles.caption, { color: colors.secondary }]}>
                Hours · minutes · seconds
              </Text>
              <View style={styles.controls}>
                <TimerButton
                  label={session.phase === "running" ? "Pause" : "Resume"}
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
                <TimerButton
                  label="Stop session"
                  testID="timer-stop"
                  onPress={() => {
                    void timer.stop();
                  }}
                  disabled={disabled}
                  secondary
                  colors={colors}
                />
              </View>
              <Text
                testID="timer-activity-status"
                style={[styles.caption, { color: colors.secondary }]}
              >
                {session.activityStatus === "active"
                  ? "Live Activity active"
                  : session.activityStatus === "missing"
                    ? "Live Activity missing"
                    : "Live Activity unavailable"}
              </Text>
            </View>
          ) : (
            <View style={[styles.card, { backgroundColor: colors.card }]}>
              <Text
                accessibilityRole="header"
                style={[styles.sectionTitle, { color: colors.text }]}
              >
                Start a new session
              </Text>
              <Text style={[styles.label, { color: colors.text }]}>
                What are you studying?
              </Text>
              <TextInput
                testID="timer-name-input"
                accessibilityLabel="Session name"
                accessibilityHint="Required, up to 80 characters. Appears on your Lock Screen."
                value={name}
                onChangeText={setName}
                placeholder="Chapter 5 Review"
                placeholderTextColor={colors.secondary}
                editable={!disabled}
                returnKeyType="done"
                onSubmitEditing={start}
                style={[
                  styles.input,
                  {
                    color: colors.text,
                    borderColor: colors.border,
                    backgroundColor: colors.background,
                  },
                ]}
              />
              <Text style={[styles.caption, { color: colors.secondary }]}>
                Up to 80 characters. This name appears on your Lock Screen.
              </Text>
              <TimerButton
                label="Start session"
                testID="timer-start"
                onPress={start}
                disabled={disabled}
                colors={colors}
              />
              {timer.capabilities?.activitiesEnabled === false && (
                <Text style={[styles.body, { color: colors.secondary }]}>
                  Live Activities are disabled. Your timer will still run in the
                  app.
                </Text>
              )}
            </View>
          )}

          {(warning || activityUnavailable) && (
            <View style={[styles.notice, { backgroundColor: colors.warning }]}>
              <Text
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
          {timer.error && (
            <Text
              accessibilityRole="alert"
              testID="timer-error"
              style={[styles.body, { color: colors.danger }]}
            >
              {timer.error}
            </Text>
          )}
          {timer.pending && (
            <View
              style={styles.pending}
              accessibilityLiveRegion="polite"
              accessibilityLabel="Updating timer"
            >
              <ActivityIndicator color={colors.accent} />
              <Text style={[styles.caption, { color: colors.secondary }]}>
                {timer.pending === "refresh"
                  ? "Checking session…"
                  : "Updating timer…"}
              </Text>
            </View>
          )}
          <Text style={[styles.footer, { color: colors.secondary }]}>
            Your timer keeps counting when you leave the app. Pause whenever you
            need a break.
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  content: {
    flexGrow: 1,
    padding: 24,
    gap: 20,
    width: "100%",
    maxWidth: 600,
    alignSelf: "center",
  },
  heading: { gap: 10, paddingVertical: 16 },
  eyebrow: { fontSize: 12, fontWeight: "700", letterSpacing: 1.5 },
  title: { fontSize: 36, fontWeight: "700", letterSpacing: -1 },
  sectionTitle: { fontSize: 23, fontWeight: "600" },
  sessionName: { fontSize: 28, fontWeight: "600" },
  body: { fontSize: 16, lineHeight: 24 },
  caption: { fontSize: 14, lineHeight: 20 },
  label: { fontSize: 16, fontWeight: "500" },
  card: { padding: 24, borderRadius: 24, gap: 18 },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    minHeight: 52,
    fontSize: 18,
  },
  elapsed: {
    fontSize: 48,
    fontWeight: "600",
    fontVariant: ["tabular-nums"],
    letterSpacing: -1,
  },
  controls: { gap: 12, marginTop: 8 },
  button: {
    minHeight: 52,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  buttonText: { fontSize: 17, fontWeight: "600", textAlign: "center" },
  notice: { padding: 20, gap: 14, borderRadius: 16 },
  pending: { flexDirection: "row", alignItems: "center", gap: 10 },
  footer: {
    fontSize: 14,
    lineHeight: 21,
    paddingHorizontal: 8,
    paddingBottom: 16,
  },
});
