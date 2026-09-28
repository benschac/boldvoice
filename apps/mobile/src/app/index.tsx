import { useState } from "react";
import { Button, ScrollView, Text, View } from "react-native";
import { studyTimer } from "@/features/study-timer/study-timer";
import type { TimerResult } from "@/features/study-timer/study-timer.types";

export default function NativeCheck() {
  const [result, setResult] = useState<TimerResult>({
    session: null,
    warning: null,
  });
  const [message, setMessage] = useState("Native checkpoint");
  const [busy, setBusy] = useState(false);
  const run = async (action: () => Promise<TimerResult>) => {
    setBusy(true);
    try {
      setResult(await action());
      setMessage("Native call completed");
    } catch (error) {
      setMessage(
        `${typeof error === "object" && error !== null && "code" in error ? error.code : "uncoded"}: ${String(error)}`,
      );
    } finally {
      setBusy(false);
    }
  };
  const session = result.session;
  return (
    <ScrollView
      contentContainerStyle={{ padding: 24, paddingTop: 100, gap: 20 }}
    >
      <Text>{message}</Text>
      <Button
        title="Capabilities"
        onPress={() =>
          void studyTimer
            .getCapabilities()
            .then((value) => setMessage(JSON.stringify(value)))
            .catch((error) => setMessage(String(error)))
        }
      />
      <Button
        title="Invalid name"
        disabled={busy}
        onPress={() => void run(() => studyTimer.start({ name: "" }))}
      />
      <Button
        title="Stale pause"
        disabled={busy}
        onPress={() => void run(() => studyTimer.pause("stale-session"))}
      />
      <Button
        title="Refresh"
        disabled={busy}
        onPress={() => void run(() => studyTimer.getSession())}
      />
      <Button
        title="Start Chapter 5 Review"
        disabled={busy}
        onPress={() =>
          void run(() => studyTimer.start({ name: "Chapter 5 Review" }))
        }
      />
      {session && (
        <View style={{ gap: 16 }}>
          <Button
            title="Pause"
            disabled={busy}
            onPress={() => void run(() => studyTimer.pause(session.sessionId))}
          />
          <Button
            title="Resume"
            disabled={busy}
            onPress={() => void run(() => studyTimer.resume(session.sessionId))}
          />
          <Button
            title="Stop"
            disabled={busy}
            onPress={() => void run(() => studyTimer.stop(session.sessionId))}
          />
        </View>
      )}
      <Text selectable>{JSON.stringify(result, null, 2)}</Text>
    </ScrollView>
  );
}
