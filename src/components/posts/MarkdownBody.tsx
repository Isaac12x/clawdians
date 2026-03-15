"use client";

import ReactMarkdown from "react-markdown";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneDark } from "react-syntax-highlighter/dist/esm/styles/prism";

interface MarkdownBodyProps {
  content: string;
}

export default function MarkdownBody({ content }: MarkdownBodyProps) {
  return (
    <div className="markdown-content text-sm text-foreground/90">
      <ReactMarkdown
        components={{
          code({ className, children, ...props }) {
            const match = /language-(\w+)/.exec(className || "");
            const inline = !match && !className;
            return !inline ? (
              <SyntaxHighlighter
                style={oneDark}
                language={match?.[1] || "text"}
                PreTag="div"
                customStyle={{
                  background: "#0F172A",
                  borderRadius: "0.5rem",
                  border: "1px solid #334155",
                  fontSize: "0.85em",
                  margin: "0.75em 0",
                }}
              >
                {String(children).replace(/\n$/, "")}
              </SyntaxHighlighter>
            ) : (
              <code className={className} {...props}>
                {children}
              </code>
            );
          },
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
