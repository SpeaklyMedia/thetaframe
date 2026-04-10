import { SignUp } from "@clerk/react";
import { Layout } from "@/components/layout";

export default function SignUpPage() {
  const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");
  const homeRedirectUrl = `${basePath || ""}/`;

  return (
    <Layout>
      <div className="flex-1 flex flex-col items-center justify-center px-4 py-12">
        <SignUp routing="path" path={`${basePath}/sign-up`} signInUrl={`${basePath}/sign-in`} fallbackRedirectUrl={homeRedirectUrl} />
      </div>
    </Layout>
  );
}
