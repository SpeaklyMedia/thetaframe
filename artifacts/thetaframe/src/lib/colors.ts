import { DailyFrameColourState, UserModeColourState } from "@workspace/api-client-react";

export type WorkspaceColourState = DailyFrameColourState | UserModeColourState;

export const emotionColors = {
  green: "bg-emotion-green text-white",
  yellow: "bg-emotion-yellow text-foreground",
  red: "bg-emotion-red text-white",
  blue: "bg-emotion-blue text-white",
  purple: "bg-emotion-purple text-white",
} as const;

export const workspaceColourRgb: Record<WorkspaceColourState, string> = {
  green: "34 197 94",
  yellow: "234 179 8",
  red: "239 68 68",
  blue: "59 130 246",
  purple: "168 85 247",
};

export const workspaceColourForeground: Record<WorkspaceColourState, string> = {
  green: "255 255 255",
  yellow: "41 37 36",
  red: "255 255 255",
  blue: "255 255 255",
  purple: "255 255 255",
};

export const getEmotionColorClass = (color?: DailyFrameColourState | UserModeColourState | null): string => {
  if (!color) return "bg-muted text-muted-foreground";
  return emotionColors[color as keyof typeof emotionColors] ?? "bg-muted text-muted-foreground";
};

export const getWorkspaceColourRgb = (color?: WorkspaceColourState | null): string | null => {
  if (!color) return null;
  return workspaceColourRgb[color] ?? null;
};

export const getWorkspaceColourForeground = (color?: WorkspaceColourState | null): string | null => {
  if (!color) return null;
  return workspaceColourForeground[color] ?? null;
};
