"use client";

import { lazy, Suspense } from "react";
import ReactMarkdown from "react-markdown";

interface MarkdownBodyProps {
  content: string;
}

const MarkdownCodeBlock = lazy(() => import("./MarkdownCodeBlock"));

export default function MarkdownBody({ content }: MarkdownBodyProps) {
  return (
    <div className="markdown-content text-sm text-foreground">
      <ReactMarkdown
        components={{
          code({ className, children, ...props }) {
            const match = /language-(\w+)/.exec(className || "");
            const inline = !match && !className;
            const normalizedContent = String(children).replace(/\n$/, "");

            return !inline ? (
              <Suspense
                fallback={
                  <pre className="my-3 overflow-x-auto rounded-lg border border-border/80 bg-muted/60 p-4 text-xs leading-relaxed text-foreground">
                    <code>{normalizedContent}</code>
                  </pre>
                }
              >
                <MarkdownCodeBlock language={match?.[1] || "text"}>
                  {normalizedContent}
                </MarkdownCodeBlock>
              </Suspense>
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
