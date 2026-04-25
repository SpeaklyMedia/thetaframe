import type { CSSProperties, ReactNode } from "react";
import { useLocation } from "wouter";
import { useUser } from "@clerk/react";
import { useGetUserMode, getGetUserModeQueryKey } from "@workspace/api-client-react";
import { Header } from "./header";
import {
  getWorkspaceColourForeground,
  getWorkspaceColourRgb,
  type WorkspaceColourState,
} from "@/lib/colors";
import { useAuthSession } from "@/hooks/use-auth-session";
import { useUserPreferences } from "@/hooks/use-user-preferences";

interface LayoutProps {
  children: ReactNode;
}

type LaneKey =
  | "console"
  | "daily"
  | "weekly"
  | "vision"
  | "bizdev"
  | "life-ledger"
  | "reach"
  | "admin";

type LaneAtmosphere = {
  lane: LaneKey;
  background: string;
};

type WorkspaceColourKey = WorkspaceColourState | "neutral";

const LANE_ATMOSPHERES: Record<LaneKey, LaneAtmosphere> = {
  console: {
    lane: "console",
    background:
      "radial-gradient(circle at 50% 0%, rgb(var(--console-accent-rgb) / 0.22), transparent 34%), radial-gradient(circle at 14% 18%, rgb(var(--console-accent-strong-rgb) / 0.14), transparent 28%), linear-gradient(180deg, rgb(var(--console-shell-ink-rgb) / 0.22), transparent 60%)",
  },
  daily: {
    lane: "daily",
    background:
      "radial-gradient(circle at 16% 10%, rgb(34 197 94 / 0.18), transparent 34%), linear-gradient(180deg, rgb(34 197 94 / 0.10), transparent 56%)",
  },
  weekly: {
    lane: "weekly",
    background:
      "radial-gradient(circle at 16% 10%, rgb(59 130 246 / 0.17), transparent 34%), linear-gradient(180deg, rgb(59 130 246 / 0.10), transparent 56%)",
  },
  vision: {
    lane: "vision",
    background:
      "radial-gradient(circle at 16% 10%, rgb(168 85 247 / 0.17), transparent 34%), linear-gradient(180deg, rgb(168 85 247 / 0.10), transparent 56%)",
  },
  bizdev: {
    lane: "bizdev",
    background:
      "radial-gradient(circle at 16% 10%, rgb(239 68 68 / 0.15), transparent 34%), linear-gradient(180deg, rgb(239 68 68 / 0.09), transparent 56%)",
  },
  "life-ledger": {
    lane: "life-ledger",
    background:
      "radial-gradient(circle at 16% 10%, rgb(234 179 8 / 0.17), transparent 34%), linear-gradient(180deg, rgb(234 179 8 / 0.09), transparent 56%)",
  },
  reach: {
    lane: "reach",
    background:
      "radial-gradient(circle at 16% 10%, rgb(16 185 129 / 0.17), transparent 34%), linear-gradient(180deg, rgb(16 185 129 / 0.09), transparent 56%)",
  },
  admin: {
    lane: "admin",
    background:
      "radial-gradient(circle at 16% 10%, rgb(120 113 108 / 0.12), transparent 34%), linear-gradient(180deg, rgb(120 113 108 / 0.08), transparent 56%)",
  },
};

function resolveLane(pathname: string): LaneAtmosphere | null {
  if (pathname === "/console" || pathname.startsWith("/console/")) {
    return LANE_ATMOSPHERES.console;
  }
  if (pathname === "/daily" || pathname.startsWith("/daily/")) {
    return LANE_ATMOSPHERES.daily;
  }
  if (pathname === "/weekly" || pathname.startsWith("/weekly/")) {
    return LANE_ATMOSPHERES.weekly;
  }
  if (pathname === "/vision" || pathname.startsWith("/vision/")) {
    return LANE_ATMOSPHERES.vision;
  }
  if (pathname === "/bizdev" || pathname.startsWith("/bizdev/")) {
    return LANE_ATMOSPHERES.bizdev;
  }
  if (pathname === "/life-ledger" || pathname.startsWith("/life-ledger/")) {
    return LANE_ATMOSPHERES["life-ledger"];
  }
  if (pathname === "/reach" || pathname.startsWith("/reach/")) {
    return LANE_ATMOSPHERES.reach;
  }
  if (pathname === "/admin" || pathname.startsWith("/admin/")) {
    return LANE_ATMOSPHERES.admin;
  }
  return null;
}

function getWorkspaceBackground(workspaceColour: WorkspaceColourState | null): string | null {
  const rgb = getWorkspaceColourRgb(workspaceColour);
  if (!rgb) return null;

  return [
    `radial-gradient(circle at 86% 12%, rgb(${rgb} / 0.16), transparent 30%)`,
    `linear-gradient(180deg, rgb(${rgb} / 0.07), transparent 42%)`,
  ].join(", ");
}

function getWorkspaceStyle(
  atmosphere: LaneAtmosphere | null,
  workspaceColour: WorkspaceColourState | null,
): CSSProperties | undefined {
  const workspaceBackground = getWorkspaceBackground(workspaceColour);
  const background = [workspaceBackground, atmosphere?.background].filter(Boolean).join(", ");
  const rgb = getWorkspaceColourRgb(workspaceColour);
  const foreground = getWorkspaceColourForeground(workspaceColour);
  const style: CSSProperties & Record<string, string> = {};

  if (background) {
    style.background = background;
  }
  if (rgb) {
    style["--workspace-colour-rgb"] = rgb;
    style["--workspace-action-rgb"] = rgb;
  }
  if (foreground) {
    style["--workspace-action-foreground-rgb"] = foreground;
  }

  return Object.keys(style).length > 0 ? style : undefined;
}

export function Layout({ children }: LayoutProps) {
  const [location] = useLocation();
  const { user } = useUser();
  const { status } = useAuthSession();
  const { data: userMode } = useGetUserMode({
    query: {
      enabled: Boolean(user) && status === "ready",
      queryKey: getGetUserModeQueryKey(),
      retry: 0,
    },
  });
  const { preferences } = useUserPreferences(Boolean(user));
  const pathname = location.split("?")[0] || "/";
  const atmosphere = resolveLane(pathname);
  const workspaceColour = (user && status === "ready" ? userMode?.colourState : null) ?? null;
  const workspaceColourKey: WorkspaceColourKey = workspaceColour ?? "neutral";
  const atmosphereStyle = getWorkspaceStyle(atmosphere, workspaceColour);

  return (
    <div
      className="workspace-shell relative isolate min-h-[100dvh] flex flex-col bg-background"
      data-lane={atmosphere?.lane ?? "neutral"}
      data-workspace-colour={workspaceColourKey}
      data-density={preferences.density}
      data-reduced-stimulation={preferences.reducedStimulation}
      data-reminder-tone={preferences.reminderTone}
    >
      {atmosphereStyle ? (
        <div
          className="workspace-atmosphere pointer-events-none absolute inset-0 z-0"
          style={atmosphereStyle}
          aria-hidden="true"
        />
      ) : null}
      <Header />
      <main className="relative z-10 flex-1 flex flex-col">
        {children}
      </main>
    </div>
  );
}
