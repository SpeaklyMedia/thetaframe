import { Link } from "wouter";
import { useUser, useClerk } from "@clerk/react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { usePermissions } from "@/hooks/usePermissions";
import { Compass, LayoutDashboard, Menu } from "lucide-react";
import { openThetaFrameGuide } from "@/lib/guide-events";

const MODULE_NAV = [
  { module: "daily", href: "/daily", label: "Today", testId: "link-daily" },
  { module: "weekly", href: "/weekly", label: "This Week", testId: "link-weekly" },
  { module: "vision", href: "/vision", label: "Goals", testId: "link-vision" },
  { module: "bizdev", href: "/bizdev", label: "FollowUps", testId: "link-bizdev" },
  { module: "life-ledger", href: "/life-ledger", label: "Life Ledger", testId: "link-life-ledger" },
  { module: "reach", href: "/reach", label: "REACH", testId: "link-reach" },
];

export function Header() {
  const { user, isLoaded } = useUser();
  const { signOut } = useClerk();
  const { hasModule, isAdmin } = usePermissions();

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/80 backdrop-blur-sm" data-testid="app-header">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <Link href="/" className="flex items-center gap-2 shrink-0" data-testid="link-home" aria-label="ThetaFrame home">
            <img
              src="/brand/THETAFRAME_LOGO_MARK__PHI_CROP__2026-04-13__R1.png"
              alt="ThetaFrame"
              className="h-8 w-8 object-contain"
            />
            <span className="hidden text-sm font-semibold tracking-tight sm:inline-block">ThetaFrame</span>
          </Link>

          {user && (
            <nav className="hidden md:flex items-center gap-1" data-testid="main-nav">
              <Link
                href="/dashboard"
                className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-accent rounded-md transition-colors"
                data-testid="link-dashboard"
              >
                <LayoutDashboard className="h-4 w-4" />
                Dashboard
              </Link>
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
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="gap-2"
              onClick={openThetaFrameGuide}
              data-testid="button-open-guide"
            >
              <Compass className="h-4 w-4" />
              <span className="hidden sm:inline">Start Here</span>
            </Button>
          )}

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
                <DropdownMenuItem asChild>
                  <Link href="/dashboard" className="w-full">
                    Dashboard
                  </Link>
                </DropdownMenuItem>
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
