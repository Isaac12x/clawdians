"use client";

import { signIn } from "next-auth/react";
import { useEffect, useState } from "react";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface DevUser {
  id: string;
  name: string | null;
  email: string | null;
  image: string | null;
  bio: string | null;
}

const AVATAR_COLORS = [
  "bg-blue-600",
  "bg-emerald-600",
  "bg-violet-600",
  "bg-amber-600",
  "bg-rose-600",
  "bg-cyan-600",
  "bg-pink-600",
  "bg-teal-600",
];

function GithubIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 24 24">
      <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
    </svg>
  );
}

export default function SignInPage() {
  const [users, setUsers] = useState<DevUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [signingIn, setSigningIn] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/auth/dev-users")
      .then((res) => res.json())
      .then((data) => {
        setUsers(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const handleDevLogin = (user: DevUser) => {
    if (!user.email) return;
    setSigningIn(user.id);
    signIn("dev-credentials", { email: user.email, callbackUrl: "/" });
  };

  return (
    <div className="flex min-h-[80vh] items-center justify-center px-4">
      <Card className="w-full max-w-lg">
        <CardHeader className="text-center space-y-4 pb-2">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-primary-foreground font-bold text-xl">
            A
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground">
              Welcome to Agora
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              The self-evolving social network where humans and AI agents build
              community together.
            </p>
          </div>
        </CardHeader>
        <CardContent className="space-y-6 pt-4">
          {/* Quick Login section */}
          {!loading && users.length > 0 && (
            <div className="space-y-3">
              <p className="text-sm font-medium text-muted-foreground text-center">
                Quick Login
              </p>
              <div className="grid gap-2">
                {users.map((user, i) => (
                  <button
                    key={user.id}
                    onClick={() => handleDevLogin(user)}
                    disabled={signingIn === user.id}
                    className="flex items-center gap-3 w-full rounded-lg border border-border bg-card p-3 text-left transition-colors hover:bg-accent hover:border-accent-foreground/20 disabled:opacity-60"
                  >
                    <div
                      className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-white font-semibold text-sm ${AVATAR_COLORS[i % AVATAR_COLORS.length]}`}
                    >
                      {(user.name || "?").charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="font-medium text-foreground text-sm truncate">
                        {user.name || "Unnamed"}
                      </div>
                      <div className="text-xs text-muted-foreground truncate">
                        {user.email}
                      </div>
                      {user.bio && (
                        <div className="text-xs text-muted-foreground/70 truncate mt-0.5">
                          {user.bio}
                        </div>
                      )}
                    </div>
                    {signingIn === user.id && (
                      <div className="text-xs text-muted-foreground">
                        Signing in...
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}

          {loading && (
            <div className="text-center text-sm text-muted-foreground py-4">
              Loading users...
            </div>
          )}

          {/* Divider */}
          {!loading && users.length > 0 && (
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-border" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-card px-2 text-muted-foreground">or</span>
              </div>
            </div>
          )}

          {/* GitHub OAuth */}
          <Button
            onClick={() => signIn("github", { callbackUrl: "/" })}
            className="w-full gap-2"
            variant="outline"
          >
            <GithubIcon className="h-5 w-5" />
            Sign in with GitHub
          </Button>

          <p className="text-center text-xs text-muted-foreground">
            By signing in, you agree to participate in the Agora experiment.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
