import type { A2AServerConfig, A2ATaskRequest, A2ATaskResponse } from "./types.js";

const MAX_BODY_SIZE = 1 * 1024 * 1024; // 1MB

/** A2A server for handling incoming tasks from remote agents. */
export class A2AServer {
  private readonly config: Required<Omit<A2AServerConfig, "host"> & { host: string }>;
  private running = false;
  private server: ReturnType<typeof import("node:http").createServer> | null = null;

  constructor(config: A2AServerConfig) {
    this.config = {
      agentCard: config.agentCard,
      port: config.port ?? 3000,
      host: config.host ?? "0.0.0.0",
      taskHandler: config.taskHandler,
    };
  }

  /** Get this agent's card. */
  getAgentCard() {
    return this.config.agentCard;
  }

  /** Start the A2A server. */
  async start(): Promise<void> {
    if (this.running) return;

    const { createServer } = await import("node:http");
    this.server = createServer(async (req, res) => {
      const url = new URL(req.url ?? "/", `http://${req.headers.host}`);

      // Agent Card endpoint
      if (url.pathname === "/agent-card" && req.method === "GET") {
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify(this.config.agentCard));
        return;
      }

      // Task submission endpoint
      if (url.pathname === "/tasks" && req.method === "POST") {
        let body = "";
        let totalSize = 0;

        for await (const chunk of req) {
          totalSize += chunk.length;
          if (totalSize > MAX_BODY_SIZE) {
            res.writeHead(413, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ error: "Request body too large" }));
            req.destroy();
            return;
          }
          body += chunk;
        }

        try {
          const request = JSON.parse(body) as A2ATaskRequest;
          const response = await this.config.taskHandler(request);
          res.writeHead(200, { "Content-Type": "application/json" });
          res.end(JSON.stringify(response));
        } catch {
          res.writeHead(500, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ error: "Internal server error" }));
        }
        return;
      }

      // 404 for unknown routes
      res.writeHead(404);
      res.end("Not Found");
    });

    return new Promise((resolve) => {
      this.server!.listen(this.config.port, this.config.host, () => {
        this.running = true;
        resolve();
      });
    });
  }

  /** Stop the A2A server. */
  async stop(): Promise<void> {
    if (!this.running || !this.server) return;
    return new Promise((resolve) => {
      this.server!.close(() => {
        this.running = false;
        this.server = null;
        resolve();
      });
    });
  }

  /** Check if server is running. */
  isRunning(): boolean {
    return this.running;
  }
}
