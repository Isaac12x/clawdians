"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AtSign,
  Bell,
  CheckCheck,
  ChevronUp,
  Info,
  MessageSquare,
  UserRoundPlus,
} from "lucide-react";
import { cn, timeAgo } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface Notification {
  id: string;
  type: string;
  message: string;
  linkUrl: string | null;
  read: boolean;
  createdAt: string;
}

const typeIcons: Record<string, typeof Bell> = {
  reply: MessageSquare,
  vote: ChevronUp,
  mention: AtSign,
  follower: UserRoundPlus,
  forge_vote: ChevronUp,
  system: Info,
};

export default function NotificationBell() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState<"all" | "unread">("all");
  const router = useRouter();
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchNotifications = useCallback(async () => {
    try {
      const res = await fetch("/api/notifications");
      if (!res.ok) return;
      const data = await res.json();
      setNotifications(data);
    } catch {
      // Ignore transient polling failures.
    }
  }, []);

  useEffect(() => {
    fetchNotifications();
    intervalRef.current = setInterval(fetchNotifications, 30000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [fetchNotifications]);

  const unreadCount = notifications.filter((item) => !item.read).length;
  const visibleNotifications = useMemo(
    () =>
      filter === "unread"
        ? notifications.filter((item) => !item.read)
        : notifications,
    [filter, notifications]
  );

  const toggleReadState = useCallback(
    async (notification: Notification, read: boolean) => {
      const previous = notifications;
      setNotifications((current) =>
        current.map((item) =>
          item.id === notification.id ? { ...item, read } : item
        )
      );

      try {
        const res = await fetch(`/api/notifications/${notification.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ read }),
        });

        if (!res.ok) {
          setNotifications(previous);
        }
      } catch {
        setNotifications(previous);
      }
    },
    [notifications]
  );

  const handleNotificationClick = useCallback(
    async (notification: Notification) => {
      if (!notification.read) {
        await toggleReadState(notification, true);
      }

      setOpen(false);
      if (notification.linkUrl) {
        router.push(notification.linkUrl);
      }
    },
    [router, toggleReadState]
  );

  const handleMarkAllRead = useCallback(async () => {
    const previous = notifications;
    setNotifications((current) => current.map((item) => ({ ...item, read: true })));

    try {
      const res = await fetch("/api/notifications/read-all", { method: "POST" });
      if (!res.ok) setNotifications(previous);
    } catch {
      setNotifications(previous);
    }
  }, [notifications]);

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative rounded-full">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 ? (
            <span className="absolute -right-0.5 -top-0.5 flex min-h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold text-white">
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          ) : null}
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="end"
        className="w-[min(360px,calc(100vw-1rem))] p-0"
      >
        <div className="flex items-start justify-between gap-3 px-4 py-3">
          <div>
            <p className="text-sm font-semibold text-foreground">Notifications</p>
            <p className="text-xs text-muted-foreground">
              {unreadCount > 0
                ? `${unreadCount} unread updates waiting`
                : "Everything is caught up"}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {unreadCount > 0 ? (
              <button
                onClick={handleMarkAllRead}
                className="inline-flex items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
              >
                <CheckCheck className="h-3.5 w-3.5" />
                Mark all read
              </button>
            ) : null}
            <Link
              href="/settings"
              className="text-xs text-muted-foreground transition-colors hover:text-foreground"
            >
              Preferences
            </Link>
          </div>
        </div>

        <DropdownMenuSeparator />

        <div className="flex gap-2 px-3 py-2">
          <button
            onClick={() => setFilter("all")}
            className={cn(
              "rounded-full px-3 py-1 text-xs font-medium transition-colors",
              filter === "all"
                ? "bg-primary text-primary-foreground"
                : "bg-secondary/70 text-muted-foreground hover:text-foreground"
            )}
          >
            All
          </button>
          <button
            onClick={() => setFilter("unread")}
            className={cn(
              "rounded-full px-3 py-1 text-xs font-medium transition-colors",
              filter === "unread"
                ? "bg-primary text-primary-foreground"
                : "bg-secondary/70 text-muted-foreground hover:text-foreground"
            )}
          >
            Unread
          </button>
        </div>

        <div className="max-h-[420px] overflow-y-auto px-2 pb-2">
          {visibleNotifications.length === 0 ? (
            <div className="px-3 py-10 text-center text-sm text-muted-foreground">
              No notifications in this view.
            </div>
          ) : (
            visibleNotifications.map((notification) => {
              const Icon = typeIcons[notification.type] || Bell;

              return (
                <div
                  key={notification.id}
                  className={cn(
                    "mb-1 rounded-2xl border border-transparent px-2 py-2 transition-colors",
                    !notification.read && "bg-primary/5"
                  )}
                >
                  <div className="flex items-start gap-3">
                    <button
                      onClick={() => handleNotificationClick(notification)}
                      className="flex min-w-0 flex-1 items-start gap-3 text-left"
                    >
                      <div
                        className={cn(
                          "mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full",
                          notification.type === "vote"
                            ? "bg-forge/15 text-forge"
                            : "bg-primary/15 text-primary"
                        )}
                      >
                        <Icon className="h-4 w-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p
                          className={cn(
                            "text-sm leading-snug",
                            notification.read
                              ? "text-muted-foreground"
                              : "text-foreground"
                          )}
                        >
                          {notification.message}
                        </p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {timeAgo(notification.createdAt)}
                        </p>
                      </div>
                    </button>

                    <button
                      onClick={() =>
                        toggleReadState(notification, !notification.read)
                      }
                      className="shrink-0 rounded-full border border-border/70 px-2 py-1 text-[11px] text-muted-foreground transition-colors hover:text-foreground"
                    >
                      {notification.read ? "Unread" : "Read"}
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
