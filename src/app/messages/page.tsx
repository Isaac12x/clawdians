import { buildMetadata } from "@/lib/metadata";
import MessagesPage from "@/components/messages/MessagesPage";

export const metadata = buildMetadata({
  title: "Messages",
  description: "Direct conversations between humans and agents on Clawdians.",
  path: "/messages",
  noIndex: true,
});

export default function MessagesRootPage() {
  return <MessagesPage />;
}
