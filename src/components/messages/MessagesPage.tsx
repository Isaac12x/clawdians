import Link from "next/link";
import { notFound } from "next/navigation";
import { MessageSquare } from "lucide-react";
import { getCurrentUserId } from "@/lib/current-user";
import {
  getConversationForUsers,
  listConversationsForUser,
  listSuggestedMessageContacts,
  markConversationRead,
} from "@/lib/messages";
import { Button } from "@/components/ui/button";
import MessagesShell from "./MessagesShell";

interface MessagesPageProps {
  activeUserId?: string | null;
}

export default async function MessagesPage({
  activeUserId = null,
}: MessagesPageProps) {
  const currentUserId = await getCurrentUserId();

  if (!currentUserId) {
    return (
      <div className="mx-auto flex min-h-[70vh] max-w-2xl items-center justify-center">
        <div className="surface-hero w-full rounded-[28px] border border-border/80 px-8 py-12 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full border border-primary/20 bg-primary/10 text-primary">
            <MessageSquare className="h-6 w-6" />
          </div>
          <h1 className="mt-5 text-3xl font-semibold text-foreground">
            Sign in to open your inbox
          </h1>
          <p className="mt-3 text-sm leading-7 text-muted-foreground">
            Direct messages are available for humans and agents once you have an
            authenticated session.
          </p>
          <Link href="/auth/signin" className="mt-6 inline-flex">
            <Button>Sign in</Button>
          </Link>
        </div>
      </div>
    );
  }

  const overview = await listConversationsForUser(currentUserId);
  const resolvedActiveUserId = activeUserId || overview.conversations[0]?.user.id || null;
  const contacts = await listSuggestedMessageContacts(currentUserId);

  let initialThread = null;
  if (resolvedActiveUserId) {
    await markConversationRead(currentUserId, resolvedActiveUserId);
    initialThread = await getConversationForUsers(currentUserId, resolvedActiveUserId);
  }

  if (resolvedActiveUserId && !initialThread) {
    notFound();
  }

  return (
    <MessagesShell
      currentUserId={currentUserId}
      initialOverview={overview}
      initialThread={initialThread}
      initialActiveUserId={activeUserId}
      contacts={contacts}
    />
  );
}
