import { Button, Host, Label } from "@expo/ui/swift-ui";
import {
  accessibilityLabel,
  buttonBorderShape,
  buttonStyle,
  controlSize,
  disabled as disabledModifier,
  font,
  foregroundStyle,
  frame,
  tint,
} from "@expo/ui/swift-ui/modifiers";

import type { TimerButtonProps } from "./timer-button.types";

export function TimerButton({
  label,
  onPress,
  disabled,
  secondary = false,
  colors,
  testID,
  symbol,
}: TimerButtonProps) {
  return (
    <Host matchContents={{ vertical: true }} ignoreSafeArea="all">
      <Button
        testID={testID}
        onPress={onPress}
        modifiers={[
          buttonStyle(secondary ? "bordered" : "borderedProminent"),
          buttonBorderShape("capsule"),
          controlSize("large"),
          tint(colors.accent),
          foregroundStyle(secondary ? colors.accent : colors.onAccent),
          disabledModifier(disabled),
          accessibilityLabel(label),
        ]}
      >
        <Label
          title={label}
          systemImage={symbol}
          modifiers={[
            font({ textStyle: "body", weight: "semibold" }),
            frame({ maxWidth: Infinity, minHeight: 28 }),
          ]}
        />
      </Button>
    </Host>
  );
}
