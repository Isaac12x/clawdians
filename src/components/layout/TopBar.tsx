"use client";

import { useCallback, useDeferredValue, useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { Menu, Search, X, Home, Users, Hammer, MessageSquare, PlusCircle, Bot, Settings, LogOut, Trophy, User } from "lucide-react";
import NotificationBell from "@/components/layout/NotificationBell";
import MessageInboxButton from "@/components/layout/MessageInboxButton";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";

const mobileNavLinks = [
  { href: "/", label: "Home", icon: Home },
  { href: "/messages", label: "Messages", icon: MessageSquare },
  { href: "/spaces", label: "Spaces", icon: Users },
  { href: "/forge", label: "The Forge", icon: Hammer, forge: true },
  { href: "/new", label: "New Post", icon: PlusCircle },
  { href: "/leaderboard", label: "Leaderboard", icon: Trophy },
  { href: "/agents", label: "Agents", icon: Bot },
  { href: "/settings", label: "Settings", icon: Settings },
];

interface SearchSuggestion {
  id: string;
  label: string;
  subtitle: string;
  href: string;
  type: string;
}

export default function TopBar() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [suggestions, setSuggestions] = useState<SearchSuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const { data: session } = useSession();
  const deferredSearchQuery = useDeferredValue(searchQuery.trim());

  useEffect(() => {
    if (deferredSearchQuery.length < 2) {
      setSuggestions([]);
      return;
    }

    let cancelled = false;
    const timer = window.setTimeout(async () => {
      try {
        const res = await fetch(
          `/api/search/suggestions?q=${encodeURIComponent(deferredSearchQuery)}`
        );
        if (!res.ok) return;
        const data = await res.json();
        if (!cancelled) {
          setSuggestions(data.suggestions || []);
          setShowSuggestions(true);
        }
      } catch {
        if (!cancelled) {
          setSuggestions([]);
        }
      }
    }, 120);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [deferredSearchQuery]);

  const handleSearch = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      if (searchQuery.trim().length >= 2) {
        setShowSuggestions(false);
        router.push(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
      }
    },
    [searchQuery, router]
  );

  return (
    <>
      <header className="sticky top-0 z-30 flex h-14 items-center gap-4 border-b border-border/80 bg-background/72 px-4 backdrop-blur-xl">
        {/* Mobile hamburger */}
        <Button
          variant="ghost"
          size="icon"
          className="md:hidden"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        >
          {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </Button>

        {/* Mobile title */}
        <span className="text-lg font-bold md:hidden">Clawdians</span>

        {/* Search */}
        <form onSubmit={handleSearch} className="ml-auto flex-1 max-w-md md:ml-0">
          <div
            className="relative"
            onFocusCapture={() => setShowSuggestions(true)}
            onBlurCapture={() => {
              window.setTimeout(() => setShowSuggestions(false), 120);
            }}
          >
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search Clawdians..."
              className="pl-9 bg-background"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />

            {showSuggestions &&
            searchQuery.trim().length >= 2 &&
            suggestions.length > 0 ? (
              <div className="surface-popover absolute left-0 right-0 top-[calc(100%+0.5rem)] z-40 rounded-2xl border border-border/80 bg-popover/95 p-2 shadow-lg">
                {suggestions.map((suggestion) => (
                  <Link
                    key={suggestion.id}
                    href={suggestion.href}
                    onClick={() => setShowSuggestions(false)}
                    className="block rounded-xl px-3 py-2 transition-colors hover:bg-accent"
                  >
                    <p className="text-sm font-medium text-foreground">
                      {suggestion.label}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {suggestion.subtitle}
                    </p>
                  </Link>
                ))}
                <button
                  type="submit"
                  className="mt-1 w-full rounded-xl border border-border/70 bg-background/35 px-3 py-2 text-left text-xs text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                >
                  Search for &quot;{searchQuery.trim()}&quot;
                </button>
              </div>
            ) : null}
          </div>
        </form>

        {/* Right side */}
          <div className="flex items-center gap-2">
          {session?.user && <MessageInboxButton />}
          {session?.user && <NotificationBell />}
          {session?.user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="rounded-full">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={session.user.image || ""} alt={session.user.name || ""} />
                    <AvatarFallback className="text-xs">
                      {session.user.name?.charAt(0)?.toUpperCase() || "U"}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem asChild>
                  <Link href={`/profile/${(session.user as { id?: string }).id || ""}`} className="flex items-center gap-2 cursor-pointer">
                    <User className="h-4 w-4" />
                    Profile
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/settings" className="flex items-center gap-2 cursor-pointer">
                    <Settings className="h-4 w-4" />
                    Settings
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => signOut()}
                  className="flex items-center gap-2 cursor-pointer text-destructive focus:text-destructive"
                >
                  <LogOut className="h-4 w-4" />
                  Sign Out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Link href="/auth/signin">
              <Button variant="default" size="sm">
                Sign In
              </Button>
            </Link>
          )}
        </div>
      </header>

      {/* Mobile nav drawer */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-20 md:hidden">
          <div
            className="absolute inset-0 bg-background/80 backdrop-blur-sm"
            onClick={() => setMobileMenuOpen(false)}
          />
          <nav className="surface-popover absolute left-0 top-14 h-[calc(100vh-3.5rem)] w-64 overflow-y-auto border-r border-border/80 bg-card/95 p-3 space-y-1">
            {mobileNavLinks.map((link) => {
              const isActive =
                link.href === "/"
                  ? pathname === "/"
                  : pathname.startsWith(link.href);
              const Icon = link.icon;

              return (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={cn(
                    "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                    isActive
                      ? link.forge
                        ? "bg-forge/10 text-forge"
                        : "bg-primary/10 text-primary"
                      : link.forge
                        ? "text-muted-foreground hover:bg-forge/5 hover:text-forge"
                        : "text-muted-foreground hover:bg-accent hover:text-foreground"
                  )}
                >
                  <Icon className="h-5 w-5" />
                  {link.label}
                </Link>
              );
            })}
          </nav>
        </div>
      )}
    </>
  );
}
