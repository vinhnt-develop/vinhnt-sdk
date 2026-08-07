import { forwardRef, useMemo, useState, type ComponentProps } from "react";
import { cn } from "../lib/utils";
import type { ToolCallData } from "../stores/message-store";

// Hard cap on rendered char count per block. Longer payloads are collapsed with
// "Show more" so huge tool outputs don't freeze the chat.
const TRUNCATE_AT = 4000;

function TruncatedBlock({ label, text }: { label: string; text: string }) {
  const [expanded, setExpanded] = useState(false);
  const isLong = text.length > TRUNCATE_AT;
  const shown = expanded || !isLong ? text : text.slice(0, TRUNCATE_AT);
  return (
    <div>
      <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/40">{label}</span>
      <pre className="mt-0.5 max-h-80 overflow-y-auto whitespace-pre-wrap break-words rounded bg-surface-container-high p-2 font-mono text-[11px] text-foreground/70">
        {shown}
        {isLong && !expanded && <span className="text-muted-foreground/50">… ({text.length.toLocaleString()} chars)</span>}
      </pre>
      {isLong && (
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="mt-1 text-[10px] font-semibold text-primary hover:text-primary/80 transition-colors"
        >
          {expanded ? "Show less" : "Show more"}
        </button>
      )}
    </div>
  );
}

export interface ToolCallProps extends ComponentProps<"div"> {
  toolCall: ToolCallData;
}

export const ToolCall = forwardRef<HTMLDivElement, ToolCallProps>(({ toolCall, className, ...props }, ref) => {
  const [open, setOpen] = useState(false);
  const argText = useMemo(() => String(toolCall.arguments ?? ""), [toolCall.arguments]);
  const resultText = useMemo(() => String(toolCall.result ?? ""), [toolCall.result]);

  return (
    <div ref={ref} data-slot="tool-call" className={cn("my-1.5 overflow-hidden rounded-md border border-border/20 bg-surface-container", className)} {...props}>
      <button
        className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs font-medium text-muted-foreground/70 hover:bg-accent/30 transition-colors"
        onClick={() => setOpen(!open)}
      >
        <svg
          width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"
          className={`shrink-0 transition-transform text-muted-foreground/40 ${open ? "rotate-90" : ""}`}
        >
          <polyline points="9 18 15 12 9 6" />
        </svg>
        <span className="font-semibold text-primary/80">{toolCall.name}</span>
        {toolCall.isError && <span className="text-[10px] font-semibold text-destructive">Error</span>}
        <span className={cn("ml-auto text-[10px] font-medium", toolCall.isError ? "text-destructive" : "text-muted-foreground/40")}>
          {toolCall.isError ? "Error" : "Done"}
        </span>
      </button>
      {open && (
        <div className="border-t border-border/20">
          <div className="space-y-2 p-3">
            {argText && <TruncatedBlock label="Arguments" text={argText} />}
            {resultText && <TruncatedBlock label="Result" text={resultText} />}
          </div>
        </div>
      )}
    </div>
  );
});
ToolCall.displayName = "ToolCall";
