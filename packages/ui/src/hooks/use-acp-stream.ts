import { useEffect, useRef, useState } from "react";
import { useConnectionStore, subscribeToAcpEvents } from "../stores/connection-store";
import { useMessageStore } from "../stores/message-store";
import type { TaskStreamNotification, ChatRunMode } from "../lib/acp-client";

interface AcpStreamState {
  isStreaming: boolean;
  taskId: string | null;
  error: string | null;
}

export function useAcpStream(sessionId: string) {
  const [state, setState] = useState<AcpStreamState>({
    isStreaming: false,
    taskId: null,
    error: null,
  });

  const connect = useConnectionStore((s) => s.connect);
  const disconnect = useConnectionStore((s) => s.disconnect);
  const startTask = useConnectionStore((s) => s.startTask);
  const cancelTask = useConnectionStore((s) => s.cancelTask);
  const status = useConnectionStore((s) => s.status);
  const serverUrl = useConnectionStore((s) => s.serverUrl);

  const addMessage = useMessageStore((s) => s.addMessage);
  const addSystemMessage = useMessageStore((s) => s.addSystemMessage);
  const appendToMessage = useMessageStore((s) => s.appendToMessage);
  const setMessageToolCalls = useMessageStore((s) => s.setMessageToolCalls);
  const setStreamingContent = useMessageStore((s) => s.setStreamingContent);
  const get = useMessageStore.getState;

  const currentMsgRef = useRef<string | null>(null);
  const currentMsgIsStreaming = useRef(false);
  const onDoneRef = useRef<((content: string) => void) | null>(null);

  // Subscribe to ACP events
  useEffect(() => {
    const unsub = subscribeToAcpEvents((event: TaskStreamNotification) => {
      handleEvent(event);
    });
    return unsub;
  }, [sessionId]);

  const startStream = async (prompt: string, opts?: { model?: string; mode?: ChatRunMode; onDone?: (content: string) => void }) => {
    onDoneRef.current = opts?.onDone ?? null;
    // Add user message
    addMessage({
      id: `user-${Date.now()}`,
      role: "user",
      content: prompt,
      timestamp: Date.now(),
      sessionId,
    });

    setState((prev) => ({ ...prev, isStreaming: true, error: null }));

    // Connect if not connected
    if (status === "disconnected") {
      try {
        await connect(serverUrl ?? undefined);
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Connection failed";
        setState((prev) => ({ ...prev, isStreaming: false, error: msg }));
        return;
      }
    }

    // Start a new assistant message for streaming
    const msgId = `assistant-${Date.now()}`;
    currentMsgRef.current = msgId;
    currentMsgIsStreaming.current = true;

    addMessage({
      id: msgId,
      role: "assistant",
      content: "",
      timestamp: Date.now(),
      isStreaming: true,
      sessionId,
    });

    try {
      const result = await startTask(prompt, opts);
      setState((prev) => ({ ...prev, taskId: result.taskId }));
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Task start failed";
      currentMsgIsStreaming.current = false;
      setState((prev) => ({ ...prev, isStreaming: false, error: msg }));
    }
  };

  const cancelStream = async () => {
    try {
      await cancelTask();
    } catch {
      // ignore
    }
    if (currentMsgIsStreaming.current) {
      currentMsgIsStreaming.current = false;
      setStreamingContent(null);
    }
    setState((prev) => ({ ...prev, isStreaming: false, taskId: null }));
  };

  const handleEvent = (event: TaskStreamNotification) => {
    switch (event.type) {
      case "token": {
        const token = String(event.data ?? "");
        if (currentMsgIsStreaming.current && currentMsgRef.current) {
          appendToMessage(currentMsgRef.current, token);
        }
        break;
      }

      case "tool_call": {
        const data = event.data as { name?: string; arguments?: string } | undefined;
        if (data && currentMsgRef.current) {
          setMessageToolCalls(currentMsgRef.current, [
            { name: data.name ?? "unknown", arguments: data.arguments ?? "{}" },
          ]);
        }
        break;
      }

      case "tool_result": {
        const data = event.data as { name?: string; result?: string; isError?: boolean } | undefined;
        if (data && currentMsgRef.current) {
          setMessageToolCalls(currentMsgRef.current, [
            { name: data.name ?? "unknown", arguments: "{}", result: data.result, isError: data.isError },
          ]);
        }
        break;
      }

      case "tool_error": {
        const data = event.data as { toolName?: string; error?: string } | undefined;
        if (currentMsgRef.current) {
          const toolName = data?.toolName ?? "unknown";
          const errMsg = data?.error ?? "Unknown error";
          setMessageToolCalls(currentMsgRef.current, [
            { name: toolName, arguments: "{}", result: errMsg, isError: true },
          ]);
        }
        break;
      }

      case "tool_self_correct": {
        const data = event.data as { toolName?: string; error?: string; attempt?: number } | undefined;
        if (currentMsgRef.current) {
          addSystemMessage(sessionId, `🔄 \`${data?.toolName ?? "tool"}\` self-correcting (attempt ${data?.attempt ?? "?"})`);
        }
        break;
      }

      case "run_start": {
        const data = event.data as { prompt?: string; model?: string } | undefined;
        if (data?.model) {
          addSystemMessage(sessionId, `🤖 Running with **${data.model}**`);
        }
        break;
      }

      case "step_start": {
        const data = event.data as { step?: number } | undefined;
        addSystemMessage(sessionId, `📝 Step ${data?.step ?? "?"}`);
        break;
      }

      case "step_end": {
        const data = event.data as { step?: number; toolCallCount?: number } | undefined;
        if (data?.toolCallCount !== undefined) {
          addSystemMessage(sessionId, `✅ Step ${data.step} complete (${data.toolCallCount} tool calls)`);
        }
        break;
      }

      case "thinking": {
        const content = String(event.data ?? "");
        if (currentMsgRef.current) {
          appendToMessage(currentMsgRef.current, content);
        }
        break;
      }

      case "thinking_start": {
        addSystemMessage(sessionId, "🤔 Thinking...");
        break;
      }

      case "thinking_end": {
        addSystemMessage(sessionId, "✅ Thinking complete");
        break;
      }

      case "context_compressed": {
        const data = event.data as { originalCount?: number; compressedCount?: number } | undefined;
        if (data) {
          addSystemMessage(sessionId, `📦 Context compressed: ${data.originalCount} → ${data.compressedCount} messages`);
        }
        break;
      }

      case "done": {
        currentMsgIsStreaming.current = false;
        setStreamingContent(null);
        setState((prev) => ({ ...prev, isStreaming: false, taskId: null }));
        if (currentMsgRef.current && onDoneRef.current) {
          const content = get().messages[sessionId]?.find((m) => m.id === currentMsgRef.current)?.content ?? "";
          onDoneRef.current(content);
        }
        currentMsgRef.current = null;
        break;
      }

      case "error": {
        const msg = String(event.data ?? "Unknown error");
        if (currentMsgIsStreaming.current && currentMsgRef.current) {
          appendToMessage(currentMsgRef.current, `\n\n**Error:** ${msg}`);
        }
        currentMsgIsStreaming.current = false;
        setStreamingContent(null);
        if (currentMsgRef.current && onDoneRef.current) {
          const content = get().messages[sessionId]?.find((m) => m.id === currentMsgRef.current)?.content ?? "";
          onDoneRef.current(content);
        }
        currentMsgRef.current = null;
        setState((prev) => ({ ...prev, isStreaming: false, error: msg }));
        break;
      }
    }
  };

  return {
    ...state,
    connect: () => connect(serverUrl ?? undefined),
    disconnect,
    startStream,
    cancelStream,
  };
}
