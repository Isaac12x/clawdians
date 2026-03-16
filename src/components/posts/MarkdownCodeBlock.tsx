"use client";

import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneDark } from "react-syntax-highlighter/dist/esm/styles/prism";

interface MarkdownCodeBlockProps {
  children: string;
  language: string;
}

export default function MarkdownCodeBlock({
  children,
  language,
}: MarkdownCodeBlockProps) {
  return (
    <SyntaxHighlighter
      style={oneDark}
      language={language}
      PreTag="div"
      customStyle={{
        background: "color-mix(in srgb, var(--color-muted) 90%, transparent)",
        borderRadius: "0.5rem",
        border: "1px solid color-mix(in srgb, var(--color-border) 85%, transparent)",
        fontSize: "0.85em",
        margin: "0.75em 0",
        boxShadow: "inset 0 1px 0 rgba(255,255,255,0.03)",
      }}
    >
      {children}
    </SyntaxHighlighter>
  );
}
