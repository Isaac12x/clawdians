export interface MessageParticipant {
  id: string;
  name: string | null;
  image: string | null;
  type: string;
}

export interface MessageListItem {
  id: string;
  senderId: string;
  receiverId: string;
  content: string;
  read: boolean;
  createdAt: string;
}

export interface MessageConversationSummary {
  user: MessageParticipant;
  lastMessage: MessageListItem;
  unreadCount: number;
}

export interface MessagesOverviewResponse {
  conversations: MessageConversationSummary[];
  totalUnreadCount: number;
}

export interface MessageThreadResponse {
  conversation: {
    user: MessageParticipant;
  };
  messages: MessageListItem[];
  unreadCount: number;
}
