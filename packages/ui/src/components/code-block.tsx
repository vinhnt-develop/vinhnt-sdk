import { forwardRef, useMemo, useState, type ComponentProps } from "react";
import hljs from "highlight.js/lib/core";
import javascript from "highlight.js/lib/languages/javascript";
import typescript from "highlight.js/lib/languages/typescript";
import python from "highlight.js/lib/languages/python";
import css from "highlight.js/lib/languages/css";
import json from "highlight.js/lib/languages/json";
import bash from "highlight.js/lib/languages/bash";
import xml from "highlight.js/lib/languages/xml";
import sql from "highlight.js/lib/languages/sql";
import rust from "highlight.js/lib/languages/rust";
import go from "highlight.js/lib/languages/go";
import { cn } from "../lib/utils";

hljs.registerLanguage("javascript", javascript);
hljs.registerLanguage("js", javascript);
hljs.registerLanguage("typescript", typescript);
hljs.registerLanguage("ts", typescript);
hljs.registerLanguage("python", python);
hljs.registerLanguage("py", python);
hljs.registerLanguage("css", css);
hljs.registerLanguage("json", json);
hljs.registerLanguage("bash", bash);
hljs.registerLanguage("sh", bash);
hljs.registerLanguage("shell", bash);
hljs.registerLanguage("xml", xml);
hljs.registerLanguage("html", xml);
hljs.registerLanguage("sql", sql);
hljs.registerLanguage("rust", rust);
hljs.registerLanguage("rs", rust);
hljs.registerLanguage("go", go);

export interface CodeBlockProps extends ComponentProps<"div"> {
  language?: string;
  code: string;
}

export const CodeBlock = forwardRef<HTMLDivElement, CodeBlockProps>(({ language, code, className, ...props }, ref) => {
  const [copied, setCopied] = useState(false);

  const highlighted = useMemo(() => {
    if (!language) return null;
    try {
      const result = hljs.highlight(code, { language, ignoreIllegals: true });
      return result.value;
    } catch {
      return null;
    }
  }, [code, language]);

  const copy = async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div ref={ref} data-slot="code-block" className={cn("group relative my-2 overflow-hidden rounded-md border border-border/30 bg-surface-container", className)} {...props}>
      {(
        <div className="flex items-center justify-between border-b border-border/20 bg-surface-container-high px-3 py-1.5">
          <span className="text-[11px] font-medium text-muted-foreground/60">{language ?? "code"}</span>
          <button
            onClick={copy}
            className="flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground/40 opacity-0 transition-all hover:text-foreground group-hover:opacity-100"
          >
            {copied ? (
              <>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="20 6 9 17 4 12"/></svg>
                Copied
              </>
            ) : (
              <>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>
                Copy
              </>
            )}
          </button>
        </div>
      )}
      <pre className="flex overflow-x-auto p-3 text-sm leading-relaxed">
        <span className="line-number-gutter select-none pr-3 text-right text-[10px] leading-[1.6] text-muted-foreground/30 shrink-0" aria-hidden="true">
          {code.split("\n").map((_, i) => (
            <span key={i} className="block">{i + 1}</span>
          ))}
        </span>
        {highlighted ? (
          <code className="hljs font-mono text-xs" dangerouslySetInnerHTML={{ __html: highlighted }} />
        ) : (
          <code className="font-mono text-xs text-foreground/80">{code}</code>
        )}
      </pre>
    </div>
  );
});
CodeBlock.displayName = "CodeBlock";
