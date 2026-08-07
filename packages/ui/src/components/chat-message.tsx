import { forwardRef, useState, type ComponentProps } from "react";
import { cn } from "../lib/utils";
import { Avatar, AvatarFallback } from "./avatar";
import { Markdown } from "./markdown";
import { ToolCall } from "./tool-call";
import type { Message } from "../stores/message-store";

// Long model replies are collapsed with a "Show more" toggle so huge outputs
// don't slow the message list render.
const COLLAPSE_AT = 12000;

export interface ChatMessageProps extends ComponentProps<"div"> {
  message: Message;
}

const roleConfig = {
  user: { avatar: "U", label: "You", align: "end", bg: "bg-primary-container" },
  assistant: { avatar: "V", label: "VNT", align: "start", bg: "bg-surface-container" },
  system: { avatar: "S", label: "System", align: "start", bg: "bg-surface-container-high" },
  tool: { avatar: "T", label: "Tool", align: "start", bg: "bg-surface-container-high" },
} as const;

export const ChatMessage = forwardRef<HTMLDivElement, ChatMessageProps>(
  ({ message, className, ...props }, ref) => {
    const config = roleConfig[message.role];
    const isUser = message.role === "user";
    const timestamp = new Date(message.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    const [expanded, setExpanded] = useState(false);
    const isLong = (message.content?.length ?? 0) > COLLAPSE_AT;
    const content = isLong && !expanded ? message.content.slice(0, COLLAPSE_AT) : message.content;

    return (
      <div
        ref={ref}
        data-slot="chat-message"
        className={cn("flex gap-2.5 px-4 py-2.5", isUser ? "flex-row-reverse" : "flex-row", className)}
        {...props}
      >
        <Avatar className="size-7 shrink-0 mt-0.5">
          <AvatarFallback className="text-[10px] font-bold bg-primary/20 text-primary">{config.avatar}</AvatarFallback>
        </Avatar>

        <div className={cn("flex max-w-[75%] flex-col gap-1", isUser ? "items-end" : "items-start")}>
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-semibold text-foreground/70">{config.label}</span>
            <span className="text-[10px] text-muted-foreground/40">{timestamp}</span>
          </div>

          <div className={cn("rounded-lg px-3 py-2", config.bg)}>
            {content ? (
              message.role === "assistant" || message.role === "system" ? (
                <Markdown content={content} />
              ) : (
                <p className="text-sm leading-relaxed text-foreground/90 whitespace-pre-wrap">{content}</p>
              )
            ) : (
              <span className="text-xs text-muted-foreground/50 italic">Empty message</span>
            )}

            {isLong && !message.isStreaming && (
              <button
                type="button"
                onClick={() => setExpanded((v) => !v)}
                className="mt-1.5 block text-[11px] font-semibold text-primary hover:text-primary/80 transition-colors"
              >
                {expanded ? "Show less" : `Show more (${message.content.length.toLocaleString()} chars)`}
              </button>
            )}

            {message.toolCalls?.map((tc, i) => (
              <ToolCall key={i} toolCall={tc} />
            ))}
          </div>

          {message.isStreaming && (
            <span className="flex gap-0.5 px-2 py-0.5">
              <span className="size-1.5 animate-bounce rounded-full bg-primary/60 [animation-delay:0ms]" />
              <span className="size-1.5 animate-bounce rounded-full bg-primary/60 [animation-delay:150ms]" />
              <span className="size-1.5 animate-bounce rounded-full bg-primary/60 [animation-delay:300ms]" />
            </span>
          )}
        </div>
      </div>
    );
  }
);
ChatMessage.displayName = "ChatMessage";
