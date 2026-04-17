import { SignIn } from "@clerk/react";
import { Layout } from "@/components/layout";

export default function SignInPage() {
  const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");
  const homeRedirectUrl = `${basePath || ""}/`;

  return (
    <Layout>
      <div className="auth-shell flex-1 flex flex-col items-center justify-center gap-6 px-4 py-12 min-h-[calc(100vh-4rem)]">
        <div className="flex flex-col items-center gap-2">
          <img
            src="/brand/THETAFRAME_LOGO_PRIMARY__BRAND_SPLASH__2026-04-13__R1.png"
            alt="ThetaFrame"
            className="h-40 w-40 object-contain"
          />
          <p className="text-xs font-medium uppercase tracking-[0.25em] text-muted-foreground">
            Drop In · Rewire · Rise
          </p>
        </div>
        <div className="w-full max-w-md rounded-2xl border bg-card px-4 py-3 text-sm text-muted-foreground shadow-sm">
          <p className="font-medium text-foreground">Sign in with your preferred method.</p>
          <p className="mt-1">
            Continue with Google, or use your ThetaFrame email and account credentials.
          </p>
        </div>
        <SignIn routing="path" path={`${basePath}/sign-in`} signUpUrl={`${basePath}/sign-up`} fallbackRedirectUrl={homeRedirectUrl} />
      </div>
    </Layout>
  );
}
