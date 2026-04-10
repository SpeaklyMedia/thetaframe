import { Link } from "wouter";
import { useUser, useClerk } from "@clerk/react";
import { useGetUserMode, getGetUserModeQueryKey, useUpsertUserMode } from "@workspace/api-client-react";
import { ApiError } from "@workspace/api-client-react";
import { getEmotionColorClass } from "@/lib/colors";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { usePermissions } from "@/hooks/usePermissions";
import { Menu } from "lucide-react";
import { useAuthSession } from "@/hooks/use-auth-session";
import { useToast } from "@/hooks/use-toast";

const MODES = ["explore", "build", "release"] as const;
type Mode = typeof MODES[number];

const MODE_LABELS: Record<Mode, string> = {
  explore: "Explore",
  build: "Build",
  release: "Release",
};

const MODULE_NAV = [
  { module: "daily", href: "/daily", label: "Daily Frame", testId: "link-daily" },
  { module: "weekly", href: "/weekly", label: "Weekly Rhythm", testId: "link-weekly" },
  { module: "vision", href: "/vision", label: "Vision Tracker", testId: "link-vision" },
  { module: "bizdev", href: "/bizdev", label: "BizDev", testId: "link-bizdev" },
  { module: "life-ledger", href: "/life-ledger", label: "Life Ledger", testId: "link-life-ledger" },
  { module: "reach", href: "/reach", label: "REACH", testId: "link-reach" },
];

export function Header() {
  const { user, isLoaded } = useUser();
  const { signOut } = useClerk();
  const { status } = useAuthSession();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { hasModule, isAdmin } = usePermissions();
  const { data: userMode, error } = useGetUserMode({
    query: { enabled: !!user && status === "ready", queryKey: getGetUserModeQueryKey(), retry: 0 }
  });
  const upsertMode = useUpsertUserMode();
  const [optimisticMode, setOptimisticMode] = useState<Mode | null>(null);

  const currentMode = optimisticMode ?? userMode?.mode as Mode | undefined;
  const currentColour = userMode?.colourState;

  const isMissing = error instanceof ApiError && error.status === 404;
  const modeLabel = useMemo(() => {
    if (upsertMode.isPending) {
      return "Saving...";
    }
    return currentMode ? MODE_LABELS[currentMode] : "Set Mode";
  }, [currentMode, upsertMode.isPending]);

  const handleModeChange = (mode: Mode) => {
    setOptimisticMode(mode);
    upsertMode.mutate(
      { data: { mode, colourState: currentColour ?? "green" } },
      {
        onSuccess: (result) => {
          setOptimisticMode(null);
          queryClient.setQueryData(getGetUserModeQueryKey(), result);
        },
        onError: () => {
          setOptimisticMode(null);
          toast({
            title: "Mode could not be saved",
            description: isMissing
              ? "Your first mode selection did not persist. Try again."
              : "The app could not update your working mode. Try again.",
            variant: "destructive",
          });
        },
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
              {MODULE_NAV.filter((item) => hasModule(item.module)).map((item) => (
                <Link
                  key={item.module}
                  href={item.href}
                  className="px-3 py-2 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-accent rounded-md transition-colors"
                  data-testid={item.testId}
                >
                  {item.label}
                </Link>
              ))}
              {isAdmin && (
                <Link href="/admin" className="px-3 py-2 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-accent rounded-md transition-colors" data-testid="link-admin">
                  Admin
                </Link>
              )}
            </nav>
          )}
        </div>

        <div className="flex items-center gap-3">
          {user && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="md:hidden"
                  aria-label="Open navigation menu"
                  data-testid="button-mobile-nav"
                >
                  <Menu className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56 md:hidden" data-testid="dropdown-mobile-nav">
                {MODULE_NAV.filter((item) => hasModule(item.module)).map((item) => (
                  <DropdownMenuItem asChild key={item.module}>
                    <Link href={item.href} className="w-full">
                      {item.label}
                    </Link>
                  </DropdownMenuItem>
                ))}
                {isAdmin && (
                  <DropdownMenuItem asChild>
                    <Link href="/admin" className="w-full">
                      Admin
                    </Link>
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          )}

          {user && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  className={`px-3 py-1.5 text-xs font-medium rounded-full cursor-pointer transition-all hover:opacity-90 ${
                    currentMode
                      ? getEmotionColorClass(currentColour)
                      : "bg-muted text-muted-foreground"
                  }`}
                  disabled={upsertMode.isPending}
                  data-testid="button-mode-badge"
                >
                  {modeLabel}
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" data-testid="dropdown-mode">
                {MODES.map(mode => (
                  <DropdownMenuItem
                    key={mode}
                    onSelect={() => handleModeChange(mode)}
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
