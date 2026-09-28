import type { TimerPalette } from "./timer-theme";

export type TimerButtonProps = {
  label: string;
  onPress: () => void;
  disabled: boolean;
  secondary?: boolean;
  colors: TimerPalette;
  testID: string;
  symbol?: "play.fill" | "pause.fill" | "stop.fill" | "arrow.clockwise";
};
