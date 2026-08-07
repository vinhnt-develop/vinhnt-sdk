export type ContextSourceKey = string & { readonly __brand: unique symbol };

export interface ContextSnapshot {
  readonly key: ContextSourceKey;
  readonly value: unknown;
  readonly rendered: string;
}

export interface SystemContext {
  readonly baseline: string;
  readonly snapshots: ReadonlyMap<ContextSourceKey, ContextSnapshot>;
}

export type ReconcileResult =
  | { readonly type: "unchanged" }
  | { readonly type: "updated"; readonly update: string; readonly snapshot: ContextSnapshot }
  | { readonly type: "replaced"; readonly systemContext: SystemContext };

export interface ContextRegistry {
  register(source: ContextSourceValue): void;
  unregister(key: ContextSourceKey): void;
  initialize(): Promise<SystemContext>;
  reconcile(): Promise<ReconcileResult>;
}

export interface ContextSourceValue<T = unknown> {
  readonly key: ContextSourceKey;
  readonly priority?: number;
  load(): Promise<T>;
  renderBaseline(value: T): string;
  renderUpdate(value: T, previous: T): string | null;
  renderRemoval(): string;
}
