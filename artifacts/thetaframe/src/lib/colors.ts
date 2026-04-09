import { DailyFrameColourState, UserModeColourState } from "@workspace/api-client-react";

export const emotionColors = {
  green: "bg-emotion-green text-white",
  yellow: "bg-emotion-yellow text-foreground",
  red: "bg-emotion-red text-white",
  blue: "bg-emotion-blue text-white",
  purple: "bg-emotion-purple text-white",
} as const;

export const getEmotionColorClass = (color?: DailyFrameColourState | UserModeColourState | null): string => {
  if (!color) return "bg-muted text-muted-foreground";
  return emotionColors[color as keyof typeof emotionColors] ?? "bg-muted text-muted-foreground";
};
