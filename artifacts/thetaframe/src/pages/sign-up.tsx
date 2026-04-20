import { SignUp } from "@clerk/react";
import { Layout } from "@/components/layout";
import { MarketingThetaPositioning } from "@/components/marketing-theta-positioning";

export default function SignUpPage() {
  const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");
  const homeRedirectUrl = `${basePath || ""}/`;

  return (
    <Layout>
      <div className="auth-shell flex-1 flex flex-col items-center justify-center px-4 py-12 gap-4">
        <div className="w-full max-w-md rounded-2xl border bg-card px-4 py-3 text-sm text-muted-foreground shadow-sm">
          <p className="font-medium text-foreground">Create access with your preferred method.</p>
          <p className="mt-1">
            Continue with Google, or start with your email address to create or continue your workspace access.
          </p>
        </div>
        <div className="w-full max-w-md" data-testid="auth-clerk-panel-sign-up">
          <SignUp
            routing="path"
            path={`${basePath}/sign-up`}
            signInUrl={`${basePath}/sign-in`}
            fallbackRedirectUrl={homeRedirectUrl}
          />
        </div>
        <div className="w-full max-w-md" data-testid="auth-theta-positioning-sign-up">
          <MarketingThetaPositioning compact />
        </div>
      </div>
    </Layout>
  );
}
