import { Link } from "wouter";
import { useUser, useClerk } from "@clerk/react";
import { useGetUserMode, getGetUserModeQueryKey, useUpsertUserMode } from "@workspace/api-client-react";
import { getEmotionColorClass } from "@/lib/colors";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";

const MODES = ["explore", "build", "release"] as const;
type Mode = typeof MODES[number];

const MODE_LABELS: Record<Mode, string> = {
  explore: "Explore",
  build: "Build",
  release: "Release",
};

export function Header() {
  const { user, isLoaded } = useUser();
  const { signOut } = useClerk();
  const queryClient = useQueryClient();
  const { data: userMode, isError } = useGetUserMode({
    query: { enabled: !!user, queryKey: getGetUserModeQueryKey() }
  });
  const upsertMode = useUpsertUserMode();

  const currentMode = userMode?.mode as Mode | undefined;
  const currentColour = userMode?.colourState;

  useEffect(() => {
    if (user && isError && !upsertMode.isPending) {
      upsertMode.mutate(
        { data: { mode: "explore", colourState: "green" } },
        {
          onSuccess: (result) => {
            queryClient.setQueryData(getGetUserModeQueryKey(), result);
          }
        }
      );
    }
  }, [user, isError, upsertMode, queryClient]);

  const handleModeChange = (mode: Mode) => {
    upsertMode.mutate(
      { data: { mode, colourState: currentColour ?? "green" } },
      {
        onSuccess: (result) => {
          queryClient.setQueryData(getGetUserModeQueryKey(), result);
        }
      }
    );
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/80 backdrop-blur-sm" data-testid="app-header">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <Link href="/" className="font-semibold text-lg tracking-tight" data-testid="link-home">
            ThetaFrame
          </Link>

          {user && (
            <nav className="hidden md:flex items-center gap-1" data-testid="main-nav">
              <Link href="/daily" className="px-3 py-2 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-accent rounded-md transition-colors" data-testid="link-daily">
                Daily Frame
              </Link>
              <Link href="/weekly" className="px-3 py-2 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-accent rounded-md transition-colors" data-testid="link-weekly">
                Weekly Rhythm
              </Link>
              <Link href="/vision" className="px-3 py-2 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-accent rounded-md transition-colors" data-testid="link-vision">
                Vision Tracker
              </Link>
            </nav>
          )}
        </div>

        <div className="flex items-center gap-3">
          {user && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  className={`px-3 py-1.5 text-xs font-medium rounded-full cursor-pointer transition-all hover:opacity-90 ${
                    currentMode
                      ? getEmotionColorClass(currentColour)
                      : "bg-muted text-muted-foreground"
                  }`}
                  data-testid="button-mode-badge"
                >
                  {currentMode ? MODE_LABELS[currentMode] : "Set Mode"}
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" data-testid="dropdown-mode">
                {MODES.map(mode => (
                  <DropdownMenuItem
                    key={mode}
                    onClick={() => handleModeChange(mode)}
                    className={currentMode === mode ? "font-semibold" : ""}
                    data-testid={`dropdown-item-mode-${mode}`}
                  >
                    {MODE_LABELS[mode]}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          )}

          {isLoaded && user ? (
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground hidden sm:inline-block" data-testid="text-username">
                {user.firstName || user.emailAddresses[0]?.emailAddress}
              </span>
              <Button variant="ghost" size="sm" onClick={() => signOut()} data-testid="button-sign-out">
                Sign Out
              </Button>
            </div>
          ) : isLoaded && !user ? (
            <div className="flex items-center gap-2">
              <Link href="/sign-in" className="text-sm font-medium hover:underline" data-testid="link-sign-in">
                Sign In
              </Link>
              <Link
                href="/sign-up"
                className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-9 px-4 py-2"
                data-testid="link-sign-up"
              >
                Sign Up
              </Link>
            </div>
          ) : null}
        </div>
      </div>
    </header>
  );
}
