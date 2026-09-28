import { Pressable, Text } from "react-native";

import type { TimerButtonProps } from "./timer-button.types";

export function TimerButton({
  label,
  onPress,
  disabled,
  secondary = false,
  colors,
  testID,
}: TimerButtonProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      testID={testID}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => ({
        minHeight: 52,
        padding: 16,
        borderRadius: 28,
        alignItems: "center",
        backgroundColor: secondary ? colors.subtle : colors.accent,
        opacity: disabled ? 0.5 : pressed ? 0.75 : 1,
      })}
    >
      <Text
        style={{
          color: secondary ? colors.accent : colors.onAccent,
          fontSize: 17,
          fontWeight: "600",
        }}
      >
        {label}
      </Text>
    </Pressable>
  );
}
