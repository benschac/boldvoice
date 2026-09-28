export const timerPalettes = {
  light: {
    background: "#F5F3EE",
    card: "#FFFFFF",
    text: "#202A25",
    secondary: "#59645D",
    accent: "#245740",
    onAccent: "#FFFFFF",
    border: "#D5DAD3",
    subtle: "#E8EDE5",
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
    subtle: "#283C2E",
    warning: "#40341D",
    warningText: "#FFDA87",
    danger: "#FFA9A9",
  },
};

export type TimerPalette = typeof timerPalettes.light;
