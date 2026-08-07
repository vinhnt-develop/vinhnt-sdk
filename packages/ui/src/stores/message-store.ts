import { create } from "zustand";

export type MessageRole = "user" | "assistant" | "system" | "tool";

export interface ToolCallData {
  name: string;
  arguments: string;
  result?: string;
  isError?: boolean;
}

export interface Message {
  id: string;
  role: MessageRole;
  content: string;
  timestamp: number;
  toolCalls?: ToolCallData[];
  isStreaming?: boolean;
  sessionId: string;
}

interface MessageState {
  messages: Record<string, Message[]>;
  streamingContent: string | null;
  addMessage: (message: Message) => void;
  appendToMessage: (messageId: string, content: string) => void;
  setMessageToolCalls: (messageId: string, toolCalls: ToolCallData[]) => void;
  setStreamingContent: (content: string | null) => void;
  addSystemMessage: (sessionId: string, content: string) => void;
  clearSession: (sessionId: string) => void;
  setSessionMessages: (sessionId: string, messages: Message[]) => void;
  getSessionMessages: (sessionId: string) => Message[];
}

export const useMessageStore = create<MessageState>((set, get) => ({
  messages: {},
  streamingContent: null,
  addMessage: (message) =>
    set((s) => {
      const sessionMessages = s.messages[message.sessionId] ?? [];
      return {
        messages: { ...s.messages, [message.sessionId]: [...sessionMessages, message] },
      };
    }),
  appendToMessage: (messageId, content) =>
    set((s) => {
      for (const [sessionId, msgs] of Object.entries(s.messages)) {
        const idx = msgs.findIndex((m) => m.id === messageId);
        if (idx !== -1) {
          const updated = structuredClone(msgs);
          const msg = updated[idx]!;
          updated[idx] = { ...msg, content: msg.content + content };
          return { messages: { ...s.messages, [sessionId]: updated } };
        }
      }
      return s;
    }),
  setMessageToolCalls: (messageId, toolCalls) =>
    set((s) => {
      for (const [sessionId, msgs] of Object.entries(s.messages)) {
        const idx = msgs.findIndex((m) => m.id === messageId);
        if (idx !== -1) {
          const updated = structuredClone(msgs);
          updated[idx] = { ...updated[idx]!, toolCalls };
          return { messages: { ...s.messages, [sessionId]: updated } };
        }
      }
      return s;
    }),
  setStreamingContent: (streamingContent) => set({ streamingContent }),
  addSystemMessage: (sessionId, content) =>
    set((s) => {
      const sessionMessages = s.messages[sessionId] ?? [];
      return {
        messages: {
          ...s.messages,
          [sessionId]: [
            ...sessionMessages,
            {
              id: `system-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
              role: "system",
              content,
              timestamp: Date.now(),
              sessionId,
            },
          ],
        },
      };
    }),
  clearSession: (sessionId) =>
    set((s) => {
      const { [sessionId]: _, ...rest } = s.messages;
      return { messages: rest };
    }),
  setSessionMessages: (sessionId, messages) =>
    set((s) => ({ messages: { ...s.messages, [sessionId]: messages } })),
  getSessionMessages: (sessionId) => get().messages[sessionId] ?? [],
}));
