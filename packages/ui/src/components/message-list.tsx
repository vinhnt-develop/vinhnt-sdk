import { forwardRef, useRef, useEffect, type ComponentProps } from "react";
import { cn } from "../lib/utils";
import { ChatMessage } from "./chat-message";
import type { Message } from "../stores/message-store";

export interface MessageListProps extends ComponentProps<"div"> {
  messages: Message[];
  streamingContent?: string | null;
  sessionId: string;
}

export const MessageList = forwardRef<HTMLDivElement, MessageListProps>(({ messages, streamingContent, sessionId, className, ...props }, ref) => {
  const listRef = useRef<HTMLDivElement>(null);
  const shouldAutoScroll = useRef(true);

  useEffect(() => {
    const el = listRef.current;
    if (!el || !shouldAutoScroll.current) return;
    el.scrollTo({ top: el.scrollHeight, behavior: "auto" });
  }, [messages, streamingContent]);

  const handleScroll = () => {
    const el = listRef.current;
    if (!el) return;
    const isAtBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 100;
    shouldAutoScroll.current = isAtBottom;
  };

  if (messages.length === 0 && !streamingContent) {
    return (
      <div data-slot="message-list-empty" className={cn("flex flex-1 items-center justify-center", className)} {...props}>
        <div className="text-center">
          <h2 className="text-2xl font-bold text-foreground/20">VNT Agent</h2>
          <p className="mt-2 text-sm text-muted-foreground/30">Start a conversation</p>
        </div>
      </div>
    );
  }

  return (
    <div ref={(node) => { listRef.current = node; if (typeof ref === "function") ref(node); else if (ref) ref.current = node; }} data-slot="message-list" onScroll={handleScroll} className={cn("flex-1 overflow-y-auto", className)} {...props}>
      <div className="mx-auto max-w-3xl py-4">
        {messages.map((msg) => (
          <ChatMessage key={msg.id} message={msg} />
        ))}
        {streamingContent && (
          <ChatMessage
            message={{
              id: "streaming",
              role: "assistant",
              content: streamingContent,
              timestamp: Date.now(),
              isStreaming: true,
              sessionId,
            }}
          />
        )}
      </div>
    </div>
  );
});
MessageList.displayName = "MessageList";
