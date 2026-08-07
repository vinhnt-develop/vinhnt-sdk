import { forwardRef, type ComponentProps } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { cn } from "../lib/utils";
import { CodeBlock } from "./code-block";

export interface MarkdownProps extends ComponentProps<"div"> {
  content: string;
}

export const Markdown = forwardRef<HTMLDivElement, MarkdownProps>(({ content, className, ...props }, ref) => {
  return (
    <div ref={ref} data-slot="markdown" className={cn("prose prose-sm max-w-none dark:prose-invert", className)} {...props}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          code({ className, children, ...props }) {
            const match = /language-(\w+)/.exec(className ?? "");
            const language = match ? match[1] : undefined;
            const code = String(children).replace(/\n$/, "");
            if (language) {
              return <CodeBlock language={language} code={code} />;
            }
            return (
              <code className={cn("rounded bg-surface-container-high px-1 py-0.5 font-mono text-xs text-primary", className)} {...props}>
                {children}
              </code>
            );
          },
          pre({ children }) {
            return <>{children}</>;
          },
          a({ href, children }) {
            return (
              <a href={href} target="_blank" rel="noreferrer" className="text-primary underline underline-offset-2 hover:text-primary/80">
                {children}
              </a>
            );
          },
          ul({ children }) {
            return <ul className="my-1.5 list-disc pl-5 text-sm text-foreground/80 space-y-0.5">{children}</ul>;
          },
          ol({ children }) {
            return <ol className="my-1.5 list-decimal pl-5 text-sm text-foreground/80 space-y-0.5">{children}</ol>;
          },
          p({ children }) {
            return <p className="my-1.5 text-sm leading-relaxed text-foreground/80">{children}</p>;
          },
          h1({ children }) {
            return <h1 className="my-3 text-base font-bold text-foreground">{children}</h1>;
          },
          h2({ children }) {
            return <h2 className="my-2.5 text-sm font-bold text-foreground">{children}</h2>;
          },
          h3({ children }) {
            return <h3 className="my-2 text-sm font-semibold text-foreground">{children}</h3>;
          },
          blockquote({ children }) {
            return <blockquote className="my-2 border-l-2 border-primary/30 pl-3 text-sm italic text-muted-foreground/60">{children}</blockquote>;
          },
          hr() {
            return <hr className="my-3 border-border/30" />;
          },
          table({ children }) {
            return <div className="my-2 overflow-x-auto"><table className="w-full border-collapse text-sm">{children}</table></div>;
          },
          th({ children }) {
            return <th className="border border-border/30 bg-surface-container-high px-2 py-1 text-left text-xs font-semibold text-foreground/80">{children}</th>;
          },
          td({ children }) {
            return <td className="border border-border/30 px-2 py-1 text-xs text-foreground/70">{children}</td>;
          },
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
});
Markdown.displayName = "Markdown";
