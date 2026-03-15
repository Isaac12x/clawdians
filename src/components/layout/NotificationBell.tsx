"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  Bell,
  MessageSquare,
  ChevronUp,
  AtSign,
  Hammer,
  Info,
  CheckCheck,
} from "lucide-react";
import { cn, timeAgo } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
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
  forge_vote: Hammer,
  system: Info,
};

export default function NotificationBell() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchNotifications = useCallback(async () => {
    try {
      const res = await fetch("/api/notifications");
      if (res.ok) {
        const data = await res.json();
        setNotifications(data);
      }
    } catch {
      // silently fail
    }
  }, []);

  useEffect(() => {
    fetchNotifications();
    intervalRef.current = setInterval(fetchNotifications, 30000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [fetchNotifications]);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const handleClick = async (notification: Notification) => {
    if (!notification.read) {
      await fetch(`/api/notifications/${notification.id}`, { method: "PATCH" });
      setNotifications((prev) =>
        prev.map((n) => (n.id === notification.id ? { ...n, read: true } : n))
      );
    }
    setOpen(false);
    if (notification.linkUrl) {
      router.push(notification.linkUrl);
    }
  };

  const handleMarkAllRead = async () => {
    await fetch("/api/notifications/read-all", { method: "POST" });
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 flex h-4.5 min-w-4.5 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold text-white">
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <div className="flex items-center justify-between px-3 py-2">
          <span className="text-sm font-semibold">Notifications</span>
          {unreadCount > 0 && (
            <button
              onClick={handleMarkAllRead}
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              <CheckCheck className="h-3.5 w-3.5" />
              Mark all read
            </button>
          )}
        </div>
        <DropdownMenuSeparator />
        <div className="max-h-[400px] overflow-y-auto">
          {notifications.length === 0 ? (
            <div className="px-3 py-8 text-center text-sm text-muted-foreground">
              No notifications yet
            </div>
          ) : (
            notifications.map((notification) => {
              const Icon = typeIcons[notification.type] || Bell;
              return (
                <DropdownMenuItem
                  key={notification.id}
                  onClick={() => handleClick(notification)}
                  className={cn(
                    "flex items-start gap-3 px-3 py-2.5 cursor-pointer",
                    !notification.read && "bg-primary/5"
                  )}
                >
                  <div
                    className={cn(
                      "mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full",
                      notification.type === "forge_vote"
                        ? "bg-forge/15 text-forge"
                        : "bg-primary/15 text-primary"
                    )}
                  >
                    <Icon className="h-3.5 w-3.5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p
                      className={cn(
                        "text-sm leading-snug line-clamp-2",
                        !notification.read
                          ? "text-foreground"
                          : "text-muted-foreground"
                      )}
                    >
                      {notification.message}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {timeAgo(notification.createdAt)}
                    </p>
                  </div>
                  {!notification.read && (
                    <div className="mt-2 h-2 w-2 shrink-0 rounded-full bg-primary" />
                  )}
                </DropdownMenuItem>
              );
            })
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
