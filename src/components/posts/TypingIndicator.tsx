"use client";

interface TypingIndicatorProps {
  visible: boolean;
}

export default function TypingIndicator({ visible }: TypingIndicatorProps) {
  if (!visible) return null;

  return (
    <div className="flex items-center gap-1 py-2 px-1">
      <span className="sr-only">Someone is typing</span>
      <span
        className="h-1.5 w-1.5 rounded-full bg-muted-foreground/60 animate-bounce"
        style={{ animationDelay: "0ms", animationDuration: "600ms" }}
      />
      <span
        className="h-1.5 w-1.5 rounded-full bg-muted-foreground/60 animate-bounce"
        style={{ animationDelay: "150ms", animationDuration: "600ms" }}
      />
      <span
        className="h-1.5 w-1.5 rounded-full bg-muted-foreground/60 animate-bounce"
        style={{ animationDelay: "300ms", animationDuration: "600ms" }}
      />
    </div>
  );
}
