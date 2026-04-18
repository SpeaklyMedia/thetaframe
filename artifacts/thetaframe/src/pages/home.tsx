import { Link } from "wouter";
import { Layout } from "@/components/layout";
import { MarketingThetaPositioning } from "@/components/marketing-theta-positioning";

export default function Home() {
  return (
    <Layout>
      <div className="flex-1">
        <section
          className="marketing-hero relative isolate flex min-h-[calc(100dvh-4rem)] items-center overflow-hidden px-4 py-16 text-white"
          data-testid="marketing-screamer-hero"
        >
          <img
            src="/marketing/screamer-beach-chair.webp"
            alt=""
            className="marketing-hero-image marketing-hero-image-calm"
            data-testid="marketing-screamer-calm"
            aria-hidden="true"
          />
          <img
            src="/marketing/screamer-stress.webp"
            alt=""
            className="marketing-hero-image marketing-hero-image-stress"
            data-testid="marketing-screamer-stress"
            aria-hidden="true"
          />
          <div className="absolute inset-0 z-10 bg-gradient-to-r from-black/72 via-black/34 to-black/12" aria-hidden="true" />
          <div className="relative z-20 mx-auto w-full max-w-6xl">
            <p className="mb-4 text-xs font-semibold uppercase tracking-[0.28em] text-white/78">
              Stress acknowledged. Calm rehearsed.
            </p>
            <h1 className="max-w-3xl text-4xl font-bold tracking-tight md:text-6xl">
              A quiet place for your mind.
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-white/84 md:text-xl">
              ThetaFrame helps you move from the loud version of the day into a visible LIFEos: Today, This Week, Goals, and the habits you want to practice next.
            </p>
            <div className="mt-9 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/sign-up"
                className="inline-flex min-h-12 items-center justify-center rounded-md bg-white px-8 py-3 text-base font-semibold text-[#0A1F36] shadow-lg transition-colors hover:bg-white/88"
              >
                Start your journey
              </Link>
              <Link
                href="/sign-in"
                className="inline-flex min-h-12 items-center justify-center rounded-md border border-white/58 bg-black/20 px-8 py-3 text-base font-semibold text-white backdrop-blur-sm transition-colors hover:bg-white/14"
              >
                Sign in
              </Link>
            </div>
          </div>
        </section>

        <MarketingThetaPositioning />

        <section className="mx-auto grid w-full max-w-6xl grid-cols-1 gap-8 px-4 py-16 text-left md:grid-cols-3">
          <div className="rounded-lg border bg-card p-6 shadow-sm">
            <div className="w-10 h-10 rounded-full bg-emotion-green/20 flex items-center justify-center mb-4">
              <div className="w-4 h-4 rounded-full bg-emotion-green" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Emotion-First</h3>
            <p className="text-muted-foreground text-sm">
              Your day starts by acknowledging how you feel. We adapt your frame to your capacity.
            </p>
          </div>
          <div className="rounded-lg border bg-card p-6 shadow-sm">
            <div className="w-10 h-10 rounded-full bg-emotion-yellow/20 flex items-center justify-center mb-4">
              <div className="w-4 h-4 rounded-full bg-emotion-yellow" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Gentle Rhythms</h3>
            <p className="text-muted-foreground text-sm">
              Not a rigid task list. A fluid tier system that gives you permission to adjust.
            </p>
          </div>
          <div className="rounded-lg border bg-card p-6 shadow-sm">
            <div className="w-10 h-10 rounded-full bg-emotion-purple/20 flex items-center justify-center mb-4">
              <div className="w-4 h-4 rounded-full bg-emotion-purple" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Quiet Focus</h3>
            <p className="text-muted-foreground text-sm">
              A private, calm environment free from noise, notifications, and unnecessary metrics.
            </p>
          </div>
        </section>
      </div>
    </Layout>
  );
}
