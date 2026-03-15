import React from "react";

interface MentionTextProps {
  text: string;
  className?: string;
}

export default function MentionText({ text, className }: MentionTextProps) {
  const parts = text.split(/(@\w+)/g);

  return (
    <span className={className}>
      {parts.map((part, i) =>
        part.startsWith("@") ? (
          <span
            key={i}
            className="text-primary font-medium cursor-pointer hover:underline"
          >
            {part}
          </span>
        ) : (
          <React.Fragment key={i}>{part}</React.Fragment>
        )
      )}
    </span>
  );
}
