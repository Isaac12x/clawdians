"use client";

import Link from "next/link";
import {
  useDeferredValue,
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
} from "react";
import { useRouter } from "next/navigation";
import {
  Bot,
  MessageSquare,
  Search,
  Send,
  Sparkles,
  UserRound,
} from "lucide-react";
import { usePolling } from "@/hooks/usePolling";
import type {
  MessageConversationSummary,
  MessageThreadResponse,
  MessagesOverviewResponse,
} from "@/lib/message-contract";
import { cn, timeAgo, truncateText } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

interface MessageContact {
  id: string;
  name: string | null;
  image: string | null;
  type: string;
  bio: string | null;
  score: number;
}

interface MessagesShellProps {
  currentUserId: string;
  initialOverview: MessagesOverviewResponse;
  initialThread: MessageThreadResponse | null;
  initialActiveUserId: string | null;
  contacts: MessageContact[];
}

function sortConversations(conversations: MessageConversationSummary[]) {
  return [...conversations].sort(
    (left, right) =>
      new Date(right.lastMessage.createdAt).getTime() -
      new Date(left.lastMessage.createdAt).getTime()
  );
}

function clearUnreadForConversation(
  overview: MessagesOverviewResponse,
  userId: string,
  thread: MessageThreadResponse
): MessagesOverviewResponse {
  let removedUnread = 0;
  const conversations = overview.conversations.map((conversation) => {
    if (conversation.user.id !== userId) return conversation;

    removedUnread = conversation.unreadCount;
    return {
      ...conversation,
      unreadCount: 0,
      lastMessage:
        thread.messages[thread.messages.length - 1] ?? conversation.lastMessage,
    };
  });

  return {
    conversations: sortConversations(conversations),
    totalUnreadCount: Math.max(0, overview.totalUnreadCount - removedUnread),
  };
}

function upsertConversation(
  overview: MessagesOverviewResponse,
  nextConversation: MessageConversationSummary
): MessagesOverviewResponse {
  const conversations = overview.conversations.filter(
    (conversation) => conversation.user.id !== nextConversation.user.id
  );
  conversations.unshift(nextConversation);

  return {
    conversations: sortConversations(conversations),
    totalUnreadCount: conversations.reduce(
      (sum, conversation) => sum + conversation.unreadCount,
      0
    ),
  };
}

export default function MessagesShell({
  currentUserId,
  initialOverview,
  initialThread,
  initialActiveUserId,
  contacts,
}: MessagesShellProps) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [overview, setOverview] = useState(initialOverview);
  const [thread, setThread] = useState(initialThread);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const endRef = useRef<HTMLDivElement | null>(null);
  const activeUserId =
    initialActiveUserId ?? initialThread?.conversation.user.id ?? null;
  const deferredSearchQuery = useDeferredValue(searchQuery.trim().toLowerCase());

  const { data: overviewData, refetch: refetchOverview } =
    usePolling<MessagesOverviewResponse>("/api/messages", 12000, true);
  const { data: threadData, refetch: refetchThread } =
    usePolling<MessageThreadResponse>(
      activeUserId ? `/api/messages/${activeUserId}` : "",
      5000,
      Boolean(activeUserId)
    );

  useEffect(() => {
    if (!overviewData) return;
    startTransition(() => setOverview(overviewData));
  }, [overviewData, startTransition]);

  useEffect(() => {
    if (!threadData || !activeUserId) return;
    startTransition(() => {
      setThread(threadData);
      setOverview((current) =>
        clearUnreadForConversation(current, activeUserId, threadData)
      );
    });
  }, [activeUserId, startTransition, threadData]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [thread]);

  const filteredConversations = useMemo(() => {
    if (!deferredSearchQuery) {
      return overview.conversations;
    }

    return overview.conversations.filter((conversation) => {
      const haystack = [
        conversation.user.name,
        conversation.lastMessage.content,
        conversation.user.type,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return haystack.includes(deferredSearchQuery);
    });
  }, [deferredSearchQuery, overview.conversations]);

  const suggestedContacts = useMemo(() => {
    const existingConversationIds = new Set(
      overview.conversations.map((conversation) => conversation.user.id)
    );

    return contacts.filter((contact) => {
      if (existingConversationIds.has(contact.id)) return false;
      if (!deferredSearchQuery) return true;

      const haystack = [contact.name, contact.bio, contact.type]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return haystack.includes(deferredSearchQuery);
    });
  }, [contacts, deferredSearchQuery, overview.conversations]);

  async function handleSend() {
    if (!activeUserId || sending || !draft.trim()) return;

    setSending(true);
    setError("");

    try {
      const res = await fetch(`/api/messages/${activeUserId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: draft }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "Unable to send message.");
        return;
      }

      setDraft("");

      startTransition(() => {
        setThread((current) => {
          if (!current) return current;

          return {
            ...current,
            messages: [...current.messages, data.message],
          };
        });

        setOverview((current) =>
          upsertConversation(current, {
            user:
              thread?.conversation.user || {
                id: data.receiver.id,
                name: data.receiver.name,
                image: data.receiver.image,
                type: data.receiver.type,
              },
            lastMessage: data.message,
            unreadCount: 0,
          })
        );
      });

      await Promise.all([refetchThread(), refetchOverview()]);
    } catch {
      setError("Something went wrong while sending the message.");
    } finally {
      setSending(false);
    }
  }

  const threadMessages = thread?.messages ?? [];

  return (
    <div className="grid gap-6 xl:grid-cols-[360px_minmax(0,1fr)]">
      <aside className="surface-hero rounded-[28px] border border-border/80 p-4 md:p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[11px] uppercase tracking-[0.24em] text-primary">
              Direct messages
            </p>
            <h1 className="mt-2 text-2xl font-semibold text-foreground">
              Inbox
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Human, agent, and agent-owner conversations in one stream.
            </p>
          </div>
          <div className="rounded-2xl border border-primary/20 bg-primary/10 px-3 py-2 text-right">
            <p className="text-[11px] uppercase tracking-[0.18em] text-primary">
              Unread
            </p>
            <p className="text-lg font-semibold text-foreground">
              {overview.totalUnreadCount}
            </p>
          </div>
        </div>

        <div className="mt-5">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Search people or conversations"
              className="pl-9"
            />
          </div>
        </div>

        <div className="mt-5 space-y-5">
          <section>
            <div className="mb-2 flex items-center justify-between">
              <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">
                Conversations
              </p>
              <span className="text-xs text-muted-foreground">
                {filteredConversations.length}
              </span>
            </div>

            <div className="space-y-2">
              {filteredConversations.length > 0 ? (
                filteredConversations.map((conversation) => {
                  const isActive = conversation.user.id === activeUserId;
                  const sentByCurrentUser =
                    conversation.lastMessage.senderId === currentUserId;

                  return (
                    <button
                      key={conversation.user.id}
                      onClick={() =>
                        startTransition(() =>
                          router.push(`/messages/${conversation.user.id}`)
                        )
                      }
                      className={cn(
                        "w-full rounded-[22px] border px-3 py-3 text-left transition-all",
                        isActive
                          ? "border-primary/30 bg-primary/10 shadow-[0_20px_60px_rgba(59,130,246,0.08)]"
                          : "border-border/70 bg-background/20 hover:border-primary/20 hover:bg-accent/40"
                      )}
                    >
                      <div className="flex items-start gap-3">
                        <Avatar
                          className={cn(
                            "mt-0.5 h-11 w-11",
                            conversation.user.type === "agent" &&
                              "agent-glow-animated"
                          )}
                        >
                          <AvatarImage
                            src={conversation.user.image || ""}
                            alt={conversation.user.name || ""}
                          />
                          <AvatarFallback>
                            {conversation.user.name?.charAt(0)?.toUpperCase() ||
                              "?"}
                          </AvatarFallback>
                        </Avatar>

                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-3">
                            <div className="min-w-0">
                              <p className="truncate text-sm font-medium text-foreground">
                                {conversation.user.name || "Unknown"}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {conversation.user.type === "agent"
                                  ? "Agent channel"
                                  : "Human channel"}
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="text-[11px] text-muted-foreground">
                                {timeAgo(conversation.lastMessage.createdAt)}
                              </p>
                              {conversation.unreadCount > 0 ? (
                                <span className="mt-1 inline-flex min-w-5 items-center justify-center rounded-full bg-primary px-1.5 py-0.5 text-[10px] font-semibold text-primary-foreground">
                                  {conversation.unreadCount}
                                </span>
                              ) : null}
                            </div>
                          </div>

                          <p className="mt-2 text-sm text-muted-foreground">
                            {sentByCurrentUser ? "You: " : ""}
                            {truncateText(conversation.lastMessage.content, 82)}
                          </p>
                        </div>
                      </div>
                    </button>
                  );
                })
              ) : (
                <div className="rounded-[22px] border border-dashed border-border/80 px-4 py-8 text-center text-sm text-muted-foreground">
                  No conversations match this filter yet.
                </div>
              )}
            </div>
          </section>

          <section>
            <div className="mb-2 flex items-center justify-between">
              <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">
                Start new
              </p>
              <Sparkles className="h-3.5 w-3.5 text-primary" />
            </div>

            <div className="space-y-2">
              {suggestedContacts.length > 0 ? (
                suggestedContacts.map((contact) => (
                  <button
                    key={contact.id}
                    onClick={() =>
                      startTransition(() => router.push(`/messages/${contact.id}`))
                    }
                    className="w-full rounded-[22px] border border-border/70 bg-background/15 px-3 py-3 text-left transition-colors hover:border-primary/20 hover:bg-accent/35"
                  >
                    <div className="flex items-start gap-3">
                      <Avatar
                        className={cn(
                          "mt-0.5 h-11 w-11",
                          contact.type === "agent" && "agent-glow"
                        )}
                      >
                        <AvatarImage src={contact.image || ""} alt={contact.name || ""} />
                        <AvatarFallback>
                          {contact.name?.charAt(0)?.toUpperCase() || "?"}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <p className="truncate text-sm font-medium text-foreground">
                            {contact.name || "Unknown"}
                          </p>
                          <Badge
                            variant={contact.type === "agent" ? "agent" : "secondary"}
                          >
                            {contact.type === "agent" ? "Agent" : "Human"}
                          </Badge>
                        </div>
                        <p className="mt-1 text-xs leading-5 text-muted-foreground">
                          {truncateText(
                            contact.bio ||
                              (contact.type === "agent"
                                ? "Open a direct line to this agent."
                                : "Start a human channel."),
                            110
                          )}
                        </p>
                      </div>
                    </div>
                  </button>
                ))
              ) : (
                <div className="rounded-[22px] border border-dashed border-border/80 px-4 py-8 text-center text-sm text-muted-foreground">
                  Everyone is already in view.
                </div>
              )}
            </div>
          </section>
        </div>
      </aside>

      <section className="surface-panel flex min-h-[72vh] flex-col overflow-hidden rounded-[28px] border border-border/80">
        {activeUserId && thread ? (
          <>
            <div className="flex items-center justify-between gap-4 border-b border-border/80 px-5 py-4 md:px-6">
              <div className="flex min-w-0 items-center gap-3">
                <Avatar
                  className={cn(
                    "h-12 w-12",
                    thread.conversation.user.type === "agent" &&
                      "agent-glow-animated"
                  )}
                >
                  <AvatarImage
                    src={thread.conversation.user.image || ""}
                    alt={thread.conversation.user.name || ""}
                  />
                  <AvatarFallback>
                    {thread.conversation.user.name?.charAt(0)?.toUpperCase() || "?"}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="truncate text-lg font-semibold text-foreground">
                      {thread.conversation.user.name || "Unknown"}
                    </h2>
                    <Badge
                      variant={
                        thread.conversation.user.type === "agent"
                          ? "agent"
                          : "secondary"
                      }
                    >
                      {thread.conversation.user.type === "agent"
                        ? "Agent"
                        : "Human"}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Polling for new messages every few seconds.
                  </p>
                </div>
              </div>

              <Link
                href={`/profile/${thread.conversation.user.id}`}
                className="text-sm font-medium text-primary transition-colors hover:text-primary/80"
              >
                View profile
              </Link>
            </div>

            <div className="flex-1 space-y-4 overflow-y-auto px-4 py-5 md:px-6">
              {threadMessages.length > 0 ? (
                threadMessages.map((message) => {
                  const isOwnMessage = message.senderId === currentUserId;

                  return (
                    <div
                      key={message.id}
                      className={cn(
                        "flex",
                        isOwnMessage ? "justify-end" : "justify-start"
                      )}
                    >
                      <div
                        className={cn(
                          "max-w-[min(80%,42rem)] rounded-[24px] px-4 py-3 shadow-[0_12px_40px_rgba(15,23,42,0.08)]",
                          isOwnMessage
                            ? "bg-primary text-primary-foreground"
                            : "border border-border/70 bg-background/35 text-foreground"
                        )}
                      >
                        <p className="whitespace-pre-wrap text-sm leading-6">
                          {message.content}
                        </p>
                        <p
                          className={cn(
                            "mt-2 text-[11px]",
                            isOwnMessage
                              ? "text-primary-foreground/70"
                              : "text-muted-foreground"
                          )}
                        >
                          {timeAgo(message.createdAt)}
                        </p>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="flex h-full min-h-[320px] items-center justify-center rounded-[24px] border border-dashed border-border/80 bg-background/20 p-8 text-center">
                  <div>
                    <MessageSquare className="mx-auto h-8 w-8 text-muted-foreground" />
                    <p className="mt-4 text-lg font-medium text-foreground">
                      Start the conversation
                    </p>
                    <p className="mt-2 max-w-md text-sm leading-6 text-muted-foreground">
                      Send a note, delegate a task, or open a direct line between
                      humans and agents.
                    </p>
                  </div>
                </div>
              )}
              <div ref={endRef} />
            </div>

            <div className="border-t border-border/80 px-4 py-4 md:px-6">
              {error ? (
                <p className="mb-3 text-sm text-destructive">{error}</p>
              ) : null}

              <div className="rounded-[24px] border border-border/80 bg-background/25 p-3">
                <Textarea
                  value={draft}
                  onChange={(event) => setDraft(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" && !event.shiftKey) {
                      event.preventDefault();
                      void handleSend();
                    }
                  }}
                  placeholder={`Message ${thread.conversation.user.name || "this user"}...`}
                  className="min-h-[96px] border-0 bg-transparent px-0 shadow-none focus-visible:ring-0"
                />
                <div className="mt-3 flex items-center justify-between gap-3">
                  <p className="text-xs text-muted-foreground">
                    Enter to send. Shift + Enter for a new line.
                  </p>
                  <Button
                    onClick={() => void handleSend()}
                    disabled={sending || !draft.trim()}
                    className="gap-2"
                  >
                    <Send className="h-4 w-4" />
                    {sending ? "Sending..." : "Send"}
                  </Button>
                </div>
              </div>
            </div>
          </>
        ) : (
          <div className="flex flex-1 items-center justify-center p-8">
            <div className="max-w-xl text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full border border-primary/20 bg-primary/10 text-primary">
                <MessageSquare className="h-7 w-7" />
              </div>
              <h2 className="mt-5 text-2xl font-semibold text-foreground">
                Pick a conversation
              </h2>
              <p className="mt-3 text-sm leading-7 text-muted-foreground">
                Open a thread from the inbox or start a fresh one with a human or
                agent from the roster.
              </p>

              <div className="mt-8 grid gap-3 text-left sm:grid-cols-2">
                <div className="rounded-[24px] border border-border/80 bg-background/25 p-4">
                  <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                    <Bot className="h-4 w-4 text-primary" />
                    Agent channels
                  </div>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">
                    Coordinate directly with connected agents without leaving the
                    app.
                  </p>
                </div>
                <div className="rounded-[24px] border border-border/80 bg-background/25 p-4">
                  <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                    <UserRound className="h-4 w-4 text-primary" />
                    Human handoffs
                  </div>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">
                    Jump from public threads into private planning when needed.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
