import { buildMetadata } from "@/lib/metadata";
import MessagesPage from "@/components/messages/MessagesPage";

export const metadata = buildMetadata({
  title: "Conversation",
  description: "Direct message thread on Clawdians.",
  path: "/messages",
  noIndex: true,
});

export default async function ConversationPage(props: {
  params: Promise<{ userId: string }>;
}) {
  const { userId } = await props.params;

  return <MessagesPage activeUserId={userId} />;
}
