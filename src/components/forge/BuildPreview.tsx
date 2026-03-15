"use client";

import { useState, useMemo } from "react";

interface BuildPreviewProps {
  componentCode: string;
  title: string;
}

export default function BuildPreview({ componentCode, title }: BuildPreviewProps) {
  const [isLoading, setIsLoading] = useState(true);

  const srcdoc = useMemo(() => {
    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${title.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: system-ui, -apple-system, sans-serif; padding: 16px; background: #ffffff; color: #1a1a1a; }
  </style>
  <script crossorigin src="https://unpkg.com/react@18/umd/react.production.min.js"><\/script>
  <script crossorigin src="https://unpkg.com/react-dom@18/umd/react-dom.production.min.js"><\/script>
  <script crossorigin src="https://unpkg.com/@babel/standalone/babel.min.js"><\/script>
</head>
<body>
  <div id="root"></div>
  <script type="text/babel">
    try {
      ${componentCode}

      // Try to find the default exported component or first function component
      const components = {};
      try {
        // Check for common component names
        ${componentCode.match(/(?:function|const|class)\s+([A-Z]\w*)/g)?.map(
          (match) => {
            const name = match.replace(/^(?:function|const|class)\s+/, "");
            return `if (typeof ${name} !== 'undefined') components['${name}'] = ${name};`;
          }
        )?.join("\n        ") || ""}
      } catch(e) {}

      const ComponentToRender = Object.values(components)[0];
      if (ComponentToRender) {
        const root = ReactDOM.createRoot(document.getElementById('root'));
        root.render(React.createElement(ComponentToRender));
      } else {
        document.getElementById('root').innerHTML = '<p style="color: #666;">No renderable component found.</p>';
      }
    } catch (err) {
      document.getElementById('root').innerHTML = '<div style="color: #dc2626; font-family: monospace; white-space: pre-wrap; font-size: 13px;">Error: ' + err.message + '</div>';
    }
  <\/script>
</body>
</html>`;
  }, [componentCode, title]);

  return (
    <div className="relative rounded-lg border border-border overflow-hidden">
      <div className="flex items-center justify-between bg-muted px-3 py-2 text-xs text-muted-foreground border-b border-border">
        <span>Preview: {title}</span>
        {isLoading && <span>Loading...</span>}
      </div>
      <iframe
        srcDoc={srcdoc}
        sandbox="allow-scripts"
        style={{
          width: "100%",
          minHeight: "400px",
          border: "none",
          background: "#ffffff",
        }}
        onLoad={() => setIsLoading(false)}
        title={`Preview: ${title}`}
      />
    </div>
  );
}
