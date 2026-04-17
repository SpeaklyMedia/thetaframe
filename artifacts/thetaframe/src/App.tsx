import { Switch, Route, Redirect, Router as WouterRouter, useLocation } from "wouter";
import { QueryClient, QueryClientProvider, useQueryClient } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ClerkProvider, ClerkLoaded, ClerkLoading, Show, useClerk } from "@clerk/react";
import { useEffect, useRef } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { Layout } from "@/components/layout";
import { ThetaFrameStartup } from "@/components/shell/ThetaFrameStartup";
import { AuthSessionProvider, useAuthSession } from "@/hooks/use-auth-session";
import { useHabitCanvasFocus } from "@/hooks/use-habit-canvas-focus";
import { usePermissions } from "@/hooks/usePermissions";
import { SignedInOnboardingModal } from "@/components/signed-in-onboarding-modal";

import Home from "@/pages/home";
import SignInPage from "@/pages/sign-in";
import SignUpPage from "@/pages/sign-up";
import DashboardPage from "@/pages/dashboard";
import DailyPage from "@/pages/daily";
import WeeklyPage from "@/pages/weekly";
import VisionPage from "@/pages/vision";
import BizdevPage from "@/pages/bizdev";
import LifeLedgerPage from "@/pages/life-ledger";
import ReachPage from "@/pages/reach";
import AdminPage from "@/pages/admin";
import AccessDeniedPage from "@/pages/access-denied";
import NotFound from "@/pages/not-found";

const queryClient = new QueryClient();

const clerkPubKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;
const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");
const homeRedirectUrl = `${basePath || ""}/`;

function stripBase(path: string): string {
  return basePath && path.startsWith(basePath)
    ? path.slice(basePath.length) || "/"
    : path;
}

if (!clerkPubKey) {
  throw new Error('Missing VITE_CLERK_PUBLISHABLE_KEY in .env file');
}

function PageSkeleton() {
  return (
    <Layout>
      <div className="container mx-auto p-4 md:p-8 max-w-4xl space-y-8">
        <Skeleton className="h-9 w-48" />
        <Skeleton className="h-10 w-full max-w-sm" />
        <div className="grid gap-6 md:grid-cols-2">
          <Skeleton className="h-48 w-full rounded-2xl" />
          <Skeleton className="h-48 w-full rounded-2xl" />
        </div>
        <Skeleton className="h-32 w-full rounded-2xl" />
      </div>
    </Layout>
  );
}

function HomeRedirect() {
  const { status } = useAuthSession();
  const { isLoading, isError } = usePermissions();

  return (
    <>
      <Show when="signed-in">
        {status === "loading" ? (
          <ThetaFrameStartup />
        ) : isLoading ? (
          <PageSkeleton />
        ) : (
          <Redirect to={isError ? "/daily" : "/dashboard"} />
        )}
      </Show>
      <Show when="signed-out">
        <Home />
      </Show>
    </>
  );
}

function DashboardRoute() {
  const { status } = useAuthSession();
  const { isLoading } = usePermissions();

  return (
    <>
      <Show when="signed-in">
        {status === "loading" ? (
          <ThetaFrameStartup />
        ) : isLoading ? (
          <PageSkeleton />
        ) : (
          <DashboardPage />
        )}
      </Show>
      <Show when="signed-out">
        <Redirect to="/" />
      </Show>
    </>
  );
}

function ModuleRoute({
  component: Component,
  module,
}: {
  component: React.ComponentType;
  module: "daily" | "weekly" | "vision" | "bizdev" | "life-ledger" | "reach";
}) {
  const { status } = useAuthSession();
  const { hasModule, isLoading, isError } = usePermissions();

  return (
    <>
      <Show when="signed-in">
        {status === "loading" ? (
          <ThetaFrameStartup />
        ) : isLoading ? (
          <PageSkeleton />
        ) : !isError && !hasModule(module) ? (
          <AccessDeniedPage />
        ) : (
          <Component />
        )}
      </Show>
      <Show when="signed-out">
        <Redirect to="/" />
      </Show>
    </>
  );
}

function AdminRoute() {
  const { status } = useAuthSession();
  const { isAdmin, isLoading } = usePermissions();
  return (
    <>
      <Show when="signed-in">
        {status === "loading" ? (
          <ThetaFrameStartup />
        ) : isLoading ? (
          <PageSkeleton />
        ) : isAdmin ? (
          <AdminPage />
        ) : (
          <AccessDeniedPage />
        )}
      </Show>
      <Show when="signed-out">
        <Redirect to="/" />
      </Show>
    </>
  );
}

function ClerkQueryClientCacheInvalidator() {
  const { addListener } = useClerk();
  const queryClient = useQueryClient();
  const prevUserIdRef = useRef<string | null | undefined>(undefined);

  useEffect(() => {
    const unsubscribe = addListener(({ user }) => {
      const userId = user?.id ?? null;
      if (
        prevUserIdRef.current !== undefined &&
        prevUserIdRef.current !== userId
      ) {
        queryClient.clear();
      }
      prevUserIdRef.current = userId;
    });
    return unsubscribe;
  }, [addListener, queryClient]);

  return null;
}

function HabitCanvasFocusRuntime() {
  useHabitCanvasFocus();
  return null;
}

function ClerkProviderWithRoutes() {
  const [, setLocation] = useLocation();
  const clerkProxyUrl = import.meta.env.VITE_CLERK_PROXY_URL?.trim();

  return (
    <ClerkProvider
      publishableKey={clerkPubKey}
      {...(clerkProxyUrl ? { proxyUrl: clerkProxyUrl } : {})}
      signInUrl={`${basePath}/sign-in`}
      signUpUrl={`${basePath}/sign-up`}
      signInFallbackRedirectUrl={homeRedirectUrl}
      signUpFallbackRedirectUrl={homeRedirectUrl}
      routerPush={(to) => setLocation(stripBase(to))}
      routerReplace={(to) => setLocation(stripBase(to), { replace: true })}
    >
      <QueryClientProvider client={queryClient}>
        <AuthSessionProvider>
          <ClerkQueryClientCacheInvalidator />
          <HabitCanvasFocusRuntime />
          <TooltipProvider>
            <ClerkLoading>
              <ThetaFrameStartup />
            </ClerkLoading>
            <ClerkLoaded>
              <Show when="signed-in">
                <SignedInOnboardingModal />
              </Show>
              <Switch>
                <Route path="/" component={HomeRedirect} />
                <Route path="/sign-in/*?" component={SignInPage} />
                <Route path="/sign-up/*?" component={SignUpPage} />

                <Route path="/dashboard">
                  <DashboardRoute />
                </Route>
                <Route path="/daily">
                  <ModuleRoute component={DailyPage} module="daily" />
                </Route>
                <Route path="/weekly">
                  <ModuleRoute component={WeeklyPage} module="weekly" />
                </Route>
                <Route path="/vision">
                  <ModuleRoute component={VisionPage} module="vision" />
                </Route>
                <Route path="/bizdev">
                  <ModuleRoute component={BizdevPage} module="bizdev" />
                </Route>
                <Route path="/life-ledger">
                  <ModuleRoute component={LifeLedgerPage} module="life-ledger" />
                </Route>
                <Route path="/reach">
                  <ModuleRoute component={ReachPage} module="reach" />
                </Route>
                <Route path="/admin">
                  <AdminRoute />
                </Route>

                <Route component={NotFound} />
              </Switch>
            </ClerkLoaded>
            <Toaster />
          </TooltipProvider>
        </AuthSessionProvider>
      </QueryClientProvider>
    </ClerkProvider>
  );
}

export default function App() {
  return (
    <WouterRouter base={basePath}>
      <ClerkProviderWithRoutes />
    </WouterRouter>
  );
}
