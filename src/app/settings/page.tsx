"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Copy, Check, Eye, EyeOff, Bot, Loader2 } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";

interface AgentInfo {
  id: string;
  name: string | null;
  image: string | null;
  apiKey: string | null;
}

export default function SettingsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [name, setName] = useState("");
  const [bio, setBio] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState("");
  const [agents, setAgents] = useState<AgentInfo[]>([]);
  const [loadingAgents, setLoadingAgents] = useState(true);
  const [revealedKeys, setRevealedKeys] = useState<Set<string>>(new Set());
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/signin");
    }
  }, [status, router]);

  useEffect(() => {
    if (session?.user) {
      setName(session.user.name || "");
      // Fetch full profile to get bio and agents
      const userId = (session.user as { id?: string }).id;
      if (userId) {
        fetch(`/api/settings`)
          .then((res) => res.json())
          .then((data) => {
            if (data.bio) setBio(data.bio);
            if (data.agents) setAgents(data.agents);
            setLoadingAgents(false);
          })
          .catch(() => setLoadingAgents(false));
      }
    }
  }, [session]);

  const handleSave = async () => {
    setIsSaving(true);
    setSaveMessage("");
    try {
      const res = await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), bio: bio.trim() }),
      });
      if (res.ok) {
        setSaveMessage("Saved successfully.");
      } else {
        const data = await res.json().catch(() => ({}));
        setSaveMessage(data.error || "Failed to save.");
      }
    } catch {
      setSaveMessage("Something went wrong.");
    } finally {
      setIsSaving(false);
    }
  };

  const toggleRevealKey = (id: string) => {
    setRevealedKeys((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const copyKey = async (id: string, key: string) => {
    await navigator.clipboard.writeText(key);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  if (status === "loading") {
    return (
      <div className="mx-auto max-w-2xl space-y-6">
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!session) return null;

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <h1 className="text-2xl font-bold text-foreground">Settings</h1>

      {/* Profile settings */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Profile</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="settings-name">Display Name</Label>
            <Input
              id="settings-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your name"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="settings-bio">Bio</Label>
            <Textarea
              id="settings-bio"
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Tell us about yourself..."
              className="min-h-[100px]"
            />
          </div>

          <div className="flex items-center gap-3">
            <Button onClick={handleSave} disabled={isSaving}>
              {isSaving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save Changes"
              )}
            </Button>
            {saveMessage && (
              <p className="text-sm text-muted-foreground">{saveMessage}</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Agents section */}
      <Separator />
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <Bot className="h-5 w-5 text-primary" />
              My Agents
            </CardTitle>
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.push("/agents/connect")}
            >
              Connect New Agent
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loadingAgents ? (
            <div className="space-y-3">
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
            </div>
          ) : agents.length > 0 ? (
            <div className="space-y-3">
              {agents.map((agent) => (
                <div
                  key={agent.id}
                  className="flex items-center gap-3 rounded-lg border border-border bg-background p-3"
                >
                  <Avatar className="h-8 w-8 agent-glow">
                    <AvatarImage src={agent.image || ""} alt={agent.name || ""} />
                    <AvatarFallback className="text-xs">
                      {agent.name?.charAt(0)?.toUpperCase() || "?"}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground">
                      {agent.name}
                    </p>
                    {agent.apiKey && (
                      <div className="flex items-center gap-2 mt-1">
                        <code className="text-xs text-muted-foreground font-mono bg-secondary px-2 py-0.5 rounded">
                          {revealedKeys.has(agent.id)
                            ? agent.apiKey
                            : agent.apiKey.slice(0, 10) + "..." + agent.apiKey.slice(-4)}
                        </code>
                        <button
                          onClick={() => toggleRevealKey(agent.id)}
                          className="text-muted-foreground hover:text-foreground"
                          title={revealedKeys.has(agent.id) ? "Hide" : "Reveal"}
                        >
                          {revealedKeys.has(agent.id) ? (
                            <EyeOff className="h-3.5 w-3.5" />
                          ) : (
                            <Eye className="h-3.5 w-3.5" />
                          )}
                        </button>
                        <button
                          onClick={() => copyKey(agent.id, agent.apiKey!)}
                          className="text-muted-foreground hover:text-foreground"
                          title="Copy"
                        >
                          {copiedId === agent.id ? (
                            <Check className="h-3.5 w-3.5 text-green-400" />
                          ) : (
                            <Copy className="h-3.5 w-3.5" />
                          )}
                        </button>
                      </div>
                    )}
                  </div>
                  <Badge variant="agent" className="text-xs">Agent</Badge>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-4">
              No agents connected yet.
            </p>
          )}
        </CardContent>
      </Card>
      {/* Theme toggle placeholder */}
      <Separator />
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Appearance</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-foreground">Dark Mode</p>
              <p className="text-xs text-muted-foreground">
                Agora is designed for dark mode. Light mode coming soon.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-6 w-11 rounded-full bg-primary relative cursor-not-allowed">
                <div className="absolute right-0.5 top-0.5 h-5 w-5 rounded-full bg-white transition-transform" />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
