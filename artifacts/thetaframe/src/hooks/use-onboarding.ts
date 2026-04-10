import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { customFetch } from "@workspace/api-client-react";
import { useAuthSession } from "@/hooks/use-auth-session";

export const ONBOARDING_QUERY_KEY = ["onboarding-progress"] as const;
export const ONBOARDING_SURFACE_ORDER = [
  "daily",
  "weekly",
  "vision",
  "bizdev",
  "life-ledger",
  "reach",
  "admin",
] as const;

export type OnboardingSurface = typeof ONBOARDING_SURFACE_ORDER[number];

export type OnboardingSurfaceProgress = {
  surface: OnboardingSurface;
  completionState: "pending" | "completed";
  firstShownAt: string;
  completedAt: string | null;
  isComplete: boolean;
};

type OnboardingProgressResponse = {
  surfaces: OnboardingSurfaceProgress[];
};

export function useOnboardingProgress() {
  const { status, userId } = useAuthSession();

  const query = useQuery<OnboardingProgressResponse>({
    queryKey: ONBOARDING_QUERY_KEY,
    queryFn: () => customFetch<OnboardingProgressResponse>("/api/onboarding", { responseType: "json" }),
    enabled: status === "ready" && Boolean(userId),
    staleTime: 30_000,
  });

  const surfaces = query.data?.surfaces ?? [];
  const surfaceMap = useMemo(
    () => new Map(surfaces.map((surface) => [surface.surface, surface])),
    [surfaces],
  );

  const completedCount = surfaces.filter((surface) => surface.isComplete).length;
  const incompleteSurfaces = surfaces.filter((surface) => !surface.isComplete);

  return {
    ...query,
    surfaces,
    surfaceMap,
    completedCount,
    incompleteSurfaces,
    isSurfaceComplete: (surface: OnboardingSurface) => surfaceMap.get(surface)?.isComplete ?? false,
  };
}
