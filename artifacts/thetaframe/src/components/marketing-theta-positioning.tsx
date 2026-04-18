import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

const EXAMPLES = [
  "Ever wake up mad at someone because of what they did in your dream?",
  "Ever hear one sentence in the morning and carry that mood all day?",
  "Ever solve something in the shower after you stopped forcing it?",
  "Ever feel calmer after picturing the same safe place a few times?",
] as const;

const SOURCES = [
  {
    label: "N1 sleep and creative association",
    href: "https://www.nature.com/articles/s41598-023-31361-w",
  },
  {
    label: "Theta rhythms and associative memory",
    href: "https://pubmed.ncbi.nlm.nih.gov/33158958/",
  },
  {
    label: "Theta, hypnosis, and suggestibility review",
    href: "https://pmc.ncbi.nlm.nih.gov/articles/PMC4361031/",
  },
  {
    label: "MIT Media Lab dream incubation summary",
    href: "https://www.media.mit.edu/posts/dreams-and-creativity/",
  },
] as const;

function usePrefersReducedMotion() {
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReducedMotion(query.matches);
    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);

  return reducedMotion;
}

export function MarketingThetaPositioning({
  compact = false,
  className,
}: {
  compact?: boolean;
  className?: string;
}) {
  const reducedMotion = usePrefersReducedMotion();
  const [isPaused, setIsPaused] = useState(false);
  const [exampleIndex, setExampleIndex] = useState(0);
  const example = EXAMPLES[exampleIndex];

  useEffect(() => {
    if (reducedMotion || isPaused) return;
    const interval = window.setInterval(() => {
      setExampleIndex((current) => (current + 1) % EXAMPLES.length);
    }, 5000);
    return () => window.clearInterval(interval);
  }, [isPaused, reducedMotion]);

  return (
    <section
      className={cn(
        compact
          ? "rounded-lg border bg-card/90 p-4 shadow-sm"
          : "w-full border-y bg-background/88 px-4 py-12 md:py-16",
        className,
      )}
      data-testid="theta-positioning"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onFocus={() => setIsPaused(true)}
      onBlur={() => setIsPaused(false)}
    >
      <div className={compact ? "space-y-4" : "mx-auto grid max-w-6xl gap-8 md:grid-cols-[0.92fr_1.08fr] md:items-start"}>
        <div className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground">
            Why theta?
          </p>
          <h2 className={compact ? "text-xl font-semibold" : "text-2xl font-semibold md:text-4xl"}>
            The mind changes faster when the body feels safe enough to listen.
          </h2>
          <p className="text-sm leading-6 text-muted-foreground md:text-base">
            ThetaFrame uses relaxed, repeatable, emotionally aware planning to help you practice new habits in a calmer state. It is not treatment, hypnosis, or a guarantee. It is a workspace for making the next pattern easier to rehearse.
          </p>
        </div>

        <div className="space-y-4">
          <div
            className="rounded-lg border bg-card p-4 shadow-sm"
            aria-live="polite"
            data-testid="theta-example-cycle"
            tabIndex={0}
          >
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              Human example
            </p>
            <p className="mt-2 text-lg font-semibold leading-7">{example}</p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <p className="rounded-lg border bg-card/80 p-3 text-sm text-muted-foreground">
              Research connects theta rhythms with associative memory formation, which is part of why the metaphor fits a habit-design workspace.
            </p>
            <p className="rounded-lg border bg-card/80 p-3 text-sm text-muted-foreground">
              Sleep-onset research suggests unusual creative association can happen near the edge of sleep. ThetaFrame borrows that idea carefully: soften the state, then shape the pattern.
            </p>
          </div>

          <div className="flex flex-wrap gap-2 text-xs" data-testid="theta-evidence-links">
            {SOURCES.map((source) => (
              <a
                key={source.href}
                href={source.href}
                target="_blank"
                rel="noreferrer"
                className="rounded-full border bg-background px-3 py-1 font-medium text-muted-foreground transition-colors hover:border-primary/50 hover:text-foreground"
              >
                {source.label}
              </a>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
