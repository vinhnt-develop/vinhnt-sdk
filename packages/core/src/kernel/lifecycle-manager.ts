export interface LifecycleResource {
  readonly id: string;
  readonly type: "mcp" | "lsp" | "database" | "plugin" | "other";
  readonly shutdown: () => Promise<void>;
  readonly timeoutMs?: number;
}

export interface LifecycleManagerConfig {
  readonly defaultTimeoutMs?: number;
  readonly forceExitTimeoutMs?: number;
}

export class LifecycleManager {
  private readonly resources = new Map<string, LifecycleResource>();
  private readonly config: Required<LifecycleManagerConfig>;
  private isShuttingDown = false;

  constructor(config?: LifecycleManagerConfig) {
    this.config = {
      defaultTimeoutMs: config?.defaultTimeoutMs ?? 5000,
      forceExitTimeoutMs: config?.forceExitTimeoutMs ?? 10000,
    };
  }

  register(resource: LifecycleResource): void {
    this.resources.set(resource.id, resource);
  }

  unregister(id: string): void {
    this.resources.delete(id);
  }

  getRegistered(): readonly LifecycleResource[] {
    return [...this.resources.values()];
  }

  async shutdown(): Promise<{ success: string[]; failed: { id: string; error: unknown }[] }> {
    if (this.isShuttingDown) {
      return { success: [], failed: [] };
    }

    this.isShuttingDown = true;
    const success: string[] = [];
    const failed: { id: string; error: unknown }[] = [];

    const shutdownPromises = [...this.resources.values()].map(async (resource) => {
      const timeout = resource.timeoutMs ?? this.config.defaultTimeoutMs;
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error(`Shutdown timeout for ${resource.id}`)), timeout);
      });

      try {
        await Promise.race([resource.shutdown(), timeoutPromise]);
        success.push(resource.id);
      } catch (error) {
        failed.push({ id: resource.id, error });
      }
    });

    await Promise.allSettled(shutdownPromises);

    const forceTimeout = this.config.forceExitTimeoutMs;
    if (failed.length > 0) {
      await new Promise((resolve) => setTimeout(resolve, Math.min(forceTimeout, 1000)));
    }

    return { success, failed };
  }

  isShutdownInProgress(): boolean {
    return this.isShuttingDown;
  }
}
