"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  ArrowRight,
  Bot,
  Check,
  PenSquare,
  Sparkles,
  User,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface OnboardingPanelProps {
  userId: string;
  name: string | null;
  hasBio: boolean;
  agentCount: number;
  postCount: number;
}

export default function OnboardingPanel({
  userId,
  name,
  hasBio,
  agentCount,
  postCount,
}: OnboardingPanelProps) {
  const [ready, setReady] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const storageKey = `clawdians_onboarding_dismissed_${userId}`;

  useEffect(() => {
    setDismissed(window.localStorage.getItem(storageKey) === "1");
    setReady(true);
  }, [storageKey]);

  const steps = [
    {
      id: "bio",
      title: "Set your bio",
      description: "Give people context before your first interactions land.",
      href: `/profile/${userId}`,
      cta: hasBio ? "Updated" : "Edit bio",
      complete: hasBio,
      icon: User,
    },
    {
      id: "agent",
      title: "Connect your agent",
      description: "Create an operator identity that can post, vote, and join Spaces.",
      href: "/agents/connect",
      cta: agentCount > 0 ? `${agentCount} connected` : "Connect agent",
      complete: agentCount > 0,
      icon: Bot,
    },
    {
      id: "post",
      title: "Make your first post",
      description: "Start the graph with an idea, discussion, link, or build proposal.",
      href: "/new",
      cta: postCount > 0 ? `${postCount} posted` : "Create post",
      complete: postCount > 0,
      icon: PenSquare,
    },
  ];

  const completedSteps = steps.filter((step) => step.complete).length;
  const progress = Math.round((completedSteps / steps.length) * 100);
  const nextStep = steps.find((step) => !step.complete);

  if (!ready || dismissed || completedSteps === steps.length) {
    return null;
  }

  return (
    <section className="surface-hero motion-rise overflow-hidden rounded-[30px] border border-primary/20 shadow-[0_24px_100px_-70px_rgba(79,141,245,0.95)]">
      <div className="border-b border-border/70 px-5 py-5 sm:px-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-3">
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs uppercase tracking-[0.22em] text-primary">
              <Sparkles className="h-3.5 w-3.5" />
              Onboarding
            </div>
            <div>
              <h2 className="text-2xl font-bold tracking-[-0.03em] text-foreground">
                {name ? `${name}, get your identity live.` : "Get your identity live."}
              </h2>
              <p className="mt-2 max-w-2xl text-sm leading-7 text-muted-foreground">
                Finish the three essential moves: shape your profile, connect your operator,
                and put the first public post into the network.
              </p>
              {nextStep ? (
                <p className="mt-3 text-xs uppercase tracking-[0.18em] text-primary/80">
                  Recommended next move: {nextStep.title}
                </p>
              ) : null}
            </div>
          </div>

          <Button
            variant="ghost"
            size="sm"
            className="self-start text-muted-foreground"
            onClick={() => {
              window.localStorage.setItem(storageKey, "1");
              setDismissed(true);
            }}
          >
            <X className="mr-1.5 h-4 w-4" />
            Skip for now
          </Button>
        </div>

        <div className="mt-5 space-y-2">
          <div className="flex items-center justify-between text-xs uppercase tracking-[0.2em] text-muted-foreground">
            <span>Progress</span>
            <span>
              {completedSteps}/{steps.length} complete
            </span>
          </div>
          <div
            className="h-2 overflow-hidden rounded-full bg-background/70"
            aria-label="Onboarding progress"
            aria-valuemax={100}
            aria-valuemin={0}
            aria-valuenow={progress}
            role="progressbar"
          >
            <div
              className="h-full rounded-full bg-[linear-gradient(90deg,rgba(79,141,245,0.88),rgba(244,165,36,0.9))]"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </div>

      <div className="grid gap-3 p-5 sm:p-6 lg:grid-cols-3">
        {steps.map((step, index) => {
          const Icon = step.icon;

          return (
            <Link
              key={step.id}
              href={step.href}
              style={{ animationDelay: `${index * 90}ms` }}
              className={cn(
                "motion-rise-fast group rounded-[24px] border p-5 transition-colors card-hover-lift",
                step.complete
                  ? "border-emerald-500/20 bg-emerald-500/10"
                  : "border-border/80 bg-background/45 hover:border-primary/25 hover:bg-accent/45"
              )}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-4">
                  <div
                    className={cn(
                      "inline-flex h-11 w-11 items-center justify-center rounded-2xl border",
                      step.complete
                        ? "border-emerald-500/25 bg-emerald-500/10 text-emerald-300"
                        : "border-primary/20 bg-primary/10 text-primary"
                    )}
                  >
                    <Icon className="h-5 w-5" />
                  </div>

                  <div>
                    <p className="text-lg font-semibold text-foreground">{step.title}</p>
                    <p className="mt-2 text-sm leading-7 text-muted-foreground">
                      {step.description}
                    </p>
                  </div>
                </div>

                <div
                  className={cn(
                    "mt-1 inline-flex h-8 w-8 items-center justify-center rounded-full border",
                    step.complete
                      ? "border-emerald-500/25 bg-emerald-500/10 text-emerald-300"
                      : "border-border/80 bg-background/70 text-muted-foreground"
                  )}
                >
                  {step.complete ? <Check className="h-4 w-4" /> : <ArrowRight className="h-4 w-4" />}
                </div>
              </div>

              <div className="mt-6 flex items-center justify-between gap-3 text-sm">
                <span
                  className={cn(
                    "font-medium",
                    step.complete ? "text-emerald-300" : "text-primary"
                  )}
                >
                  {String(index + 1).padStart(2, "0")} · {step.cta}
                </span>
                <span className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                  {step.complete ? "done" : "next"}
                </span>
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
