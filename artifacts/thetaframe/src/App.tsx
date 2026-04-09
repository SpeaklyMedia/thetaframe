import { Switch, Route, Redirect, Router as WouterRouter, useLocation } from "wouter";
import { QueryClient, QueryClientProvider, useQueryClient } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ClerkProvider, ClerkLoaded, ClerkLoading, Show, useClerk, useUser, useAuth } from "@clerk/react";
import { useEffect, useRef } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { Layout } from "@/components/layout";
import { setAuthTokenGetter } from "@workspace/api-client-react";

import Home from "@/pages/home";
import SignInPage from "@/pages/sign-in";
import SignUpPage from "@/pages/sign-up";
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
  return (
    <>
      <Show when="signed-in">
        <Redirect to="/daily" />
      </Show>
      <Show when="signed-out">
        <Home />
      </Show>
    </>
  );
}

function ProtectedRoute({ component: Component }: { component: React.ComponentType }) {
  return (
    <>
      <Show when="signed-in">
        <Component />
      </Show>
      <Show when="signed-out">
        <Redirect to="/" />
      </Show>
    </>
  );
}

function AdminRoute() {
  const { user } = useUser();
  const isAdmin = (user?.publicMetadata as Record<string, unknown>)?.role === "admin";
  return (
    <>
      <Show when="signed-in">
        {isAdmin ? <AdminPage /> : <AccessDeniedPage />}
      </Show>
      <Show when="signed-out">
        <Redirect to="/" />
      </Show>
    </>
  );
}

function ClerkAuthSetup() {
  const { getToken } = useAuth();

  useEffect(() => {
    setAuthTokenGetter(() => getToken());
    return () => { setAuthTokenGetter(null); };
  }, [getToken]);

  return null;
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

function ClerkProviderWithRoutes() {
  const [, setLocation] = useLocation();

  return (
    <ClerkProvider
      publishableKey={clerkPubKey}
      signInUrl={`${basePath}/sign-in`}
      signUpUrl={`${basePath}/sign-up`}
      signInFallbackRedirectUrl="/daily"
      signUpFallbackRedirectUrl="/daily"
      routerPush={(to) => setLocation(stripBase(to))}
      routerReplace={(to) => setLocation(stripBase(to), { replace: true })}
    >
      <QueryClientProvider client={queryClient}>
        <ClerkAuthSetup />
        <ClerkQueryClientCacheInvalidator />
        <TooltipProvider>
          <ClerkLoading>
            <PageSkeleton />
          </ClerkLoading>
          <ClerkLoaded>
            <Switch>
              <Route path="/" component={HomeRedirect} />
              <Route path="/sign-in/*?" component={SignInPage} />
              <Route path="/sign-up/*?" component={SignUpPage} />

              <Route path="/daily">
                <ProtectedRoute component={DailyPage} />
              </Route>
              <Route path="/weekly">
                <ProtectedRoute component={WeeklyPage} />
              </Route>
              <Route path="/vision">
                <ProtectedRoute component={VisionPage} />
              </Route>
              <Route path="/bizdev">
                <ProtectedRoute component={BizdevPage} />
              </Route>
              <Route path="/life-ledger">
                <ProtectedRoute component={LifeLedgerPage} />
              </Route>
              <Route path="/reach">
                <ProtectedRoute component={ReachPage} />
              </Route>
              <Route path="/admin">
                <AdminRoute />
              </Route>

              <Route component={NotFound} />
            </Switch>
          </ClerkLoaded>
          <Toaster />
        </TooltipProvider>
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
