import { Link } from "wouter";
import { Layout } from "@/components/layout";

export default function Home() {
  return (
    <Layout>
      <div className="flex-1 flex flex-col items-center justify-center px-4 py-12 md:py-24 text-center max-w-3xl mx-auto">
        <h1 className="text-4xl md:text-6xl font-bold tracking-tight text-foreground mb-6">
          A quiet place for your mind.
        </h1>
        <p className="text-lg md:text-xl text-muted-foreground mb-10 max-w-2xl">
          ThetaFrame is a personal daily OS designed for neurodivergent brains. 
          It respects your emotional state, helps you find focus, and gives you a private workspace to build your routine.
        </p>
        
        <div className="flex flex-col sm:flex-row gap-4">
          <Link 
            href="/sign-up" 
            className="inline-flex items-center justify-center rounded-full text-base font-medium transition-colors bg-primary text-primary-foreground hover:bg-primary/90 h-12 px-8"
          >
            Start your journey
          </Link>
          <Link 
            href="/sign-in" 
            className="inline-flex items-center justify-center rounded-full text-base font-medium transition-colors border border-input bg-background hover:bg-accent hover:text-accent-foreground h-12 px-8"
          >
            Sign in
          </Link>
        </div>

        <div className="mt-24 grid grid-cols-1 md:grid-cols-3 gap-8 text-left w-full">
          <div className="bg-card border rounded-2xl p-6 shadow-sm">
            <div className="w-10 h-10 rounded-full bg-emotion-green/20 flex items-center justify-center mb-4">
              <div className="w-4 h-4 rounded-full bg-emotion-green" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Emotion-First</h3>
            <p className="text-muted-foreground text-sm">
              Your day starts by acknowledging how you feel. We adapt your frame to your capacity.
            </p>
          </div>
          <div className="bg-card border rounded-2xl p-6 shadow-sm">
            <div className="w-10 h-10 rounded-full bg-emotion-yellow/20 flex items-center justify-center mb-4">
              <div className="w-4 h-4 rounded-full bg-emotion-yellow" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Gentle Rhythms</h3>
            <p className="text-muted-foreground text-sm">
              Not a rigid task list. A fluid tier system that gives you permission to adjust.
            </p>
          </div>
          <div className="bg-card border rounded-2xl p-6 shadow-sm">
            <div className="w-10 h-10 rounded-full bg-emotion-purple/20 flex items-center justify-center mb-4">
              <div className="w-4 h-4 rounded-full bg-emotion-purple" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Quiet Focus</h3>
            <p className="text-muted-foreground text-sm">
              A private, calm environment free from noise, notifications, and unnecessary metrics.
            </p>
          </div>
        </div>
      </div>
    </Layout>
  );
}
