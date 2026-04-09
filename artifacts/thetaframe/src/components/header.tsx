import { Link } from "wouter";
import { useUser, useClerk } from "@clerk/react";
import { useGetUserMode, getGetUserModeQueryKey } from "@workspace/api-client-react";
import { getEmotionColorClass } from "@/lib/colors";
import { Button } from "@/components/ui/button";

export function Header() {
  const { user, isLoaded } = useUser();
  const { signOut } = useClerk();
  const { data: userMode } = useGetUserMode({ query: { enabled: !!user, queryKey: getGetUserModeQueryKey() } });

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/80 backdrop-blur-sm">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <Link href="/" className="font-semibold text-lg tracking-tight">
            ThetaFrame
          </Link>
          
          {user && (
            <nav className="hidden md:flex items-center gap-1">
              <Link href="/daily" className="px-3 py-2 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-accent rounded-md transition-colors">
                Daily Frame
              </Link>
              <Link href="/weekly" className="px-3 py-2 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-accent rounded-md transition-colors">
                Weekly Rhythm
              </Link>
              <Link href="/vision" className="px-3 py-2 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-accent rounded-md transition-colors">
                Vision Tracker
              </Link>
            </nav>
          )}
        </div>

        <div className="flex items-center gap-4">
          {user && userMode && (
            <div className={`px-2.5 py-1 text-xs font-medium rounded-full ${getEmotionColorClass(userMode.colourState)}`}>
              {userMode.mode === "explore" ? "Explore" : userMode.mode === "build" ? "Build" : "Release"}
            </div>
          )}
          
          {isLoaded && user ? (
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground hidden sm:inline-block">
                {user.firstName || user.emailAddresses[0]?.emailAddress}
              </span>
              <Button variant="ghost" size="sm" onClick={() => signOut()}>
                Sign Out
              </Button>
            </div>
          ) : isLoaded && !user ? (
            <div className="flex items-center gap-2">
              <Link href="/sign-in" className="text-sm font-medium hover:underline">
                Sign In
              </Link>
              <Link href="/sign-up" className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-9 px-4 py-2">
                Sign Up
              </Link>
            </div>
          ) : null}
        </div>
      </div>
    </header>
  );
}
