import type { A2AClientConfig, A2ATaskRequest, A2ATaskResponse, A2ATaskUpdate } from "./types.js";

/** A2A client for sending tasks to remote agents. */
export class A2AClient {
  private readonly config: Required<A2AClientConfig>;

  constructor(config: A2AClientConfig) {
    this.config = {
      agentCard: config.agentCard,
      timeoutMs: config.timeoutMs ?? 30_000,
      headers: config.headers ?? {},
    };
  }

  /** Get the remote agent's card. */
  getAgentCard() {
    return this.config.agentCard;
  }

  /** Send a task to the remote agent. */
  async sendTask(request: A2ATaskRequest): Promise<A2ATaskResponse> {
    const url = `${this.config.agentCard.endpoint}/tasks`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.config.timeoutMs);

    try {
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...this.config.headers,
        },
        body: JSON.stringify({
          taskId: request.taskId,
          message: request.message,
          context: request.context,
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new Error(`A2A request failed: ${response.status} ${response.statusText}`);
      }

      return (await response.json()) as A2ATaskResponse;
    } finally {
      clearTimeout(timeout);
    }
  }

  /** Poll for task updates (long-polling). */
  async pollTask(taskId: string, onUpdate?: (update: A2ATaskUpdate) => void): Promise<A2ATaskResponse> {
    const url = `${this.config.agentCard.endpoint}/tasks/${taskId}`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.config.timeoutMs);

    try {
      const response = await fetch(url, {
        method: "GET",
        headers: this.config.headers,
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new Error(`A2A poll failed: ${response.status} ${response.statusText}`);
      }

      const result = (await response.json()) as A2ATaskResponse;

      if (onUpdate && result.status !== "completed" && result.status !== "failed") {
        onUpdate({
          taskId,
          status: result.status,
          message: result.result,
          timestamp: new Date().toISOString(),
        });
      }

      return result;
    } finally {
      clearTimeout(timeout);
    }
  }

  /** Cancel a running task. */
  async cancelTask(taskId: string): Promise<void> {
    const url = `${this.config.agentCard.endpoint}/tasks/${taskId}/cancel`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.config.timeoutMs);

    try {
      await fetch(url, {
        method: "POST",
        headers: this.config.headers,
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timeout);
    }
  }
}
