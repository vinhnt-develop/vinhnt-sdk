/**
 * @module test-utils
 * Shared test utilities for vinhnt-sdk packages.
 */

/**
 * Create a mock RunUsage for testing.
 */
export function createMockUsage(overrides?: { inputTokens?: number; outputTokens?: number; totalTokens?: number }): { inputTokens: number; outputTokens: number; totalTokens: number } {
  return {
    inputTokens: 100,
    outputTokens: 50,
    totalTokens: 150,
    ...overrides,
  };
}

/**
 * Create a mock ChatMessage for testing.
 */
export function createMockMessage(
  role: "system" | "user" | "assistant" | "tool",
  content: string | Array<{ type: string; text?: string }>,
  extra?: Record<string, unknown>,
): { role: string; content: string | Array<{ type: string; text?: string }>; [key: string]: unknown } {
  return {
    role,
    content,
    ...extra,
  };
}

/**
 * Create a mock abort controller for testing.
 */
export function createMockAbortController(): AbortController {
  return new AbortController();
}

/**
 * Wait for a specified number of milliseconds.
 */
export function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Create a mock function that returns a sequence of values.
 */
export function createSequence<T>(values: T[]): () => T {
  let index = 0;
  return () => values[index++ % values.length] as T;
}

/**
 * Assert that a function throws an error with a specific message.
 */
export async function assertThrows(
  fn: () => Promise<void>,
  expectedMessage?: string,
): Promise<void> {
  try {
    await fn();
    throw new Error("Expected function to throw");
  } catch (err) {
    if (err instanceof Error && expectedMessage) {
      if (!err.message.includes(expectedMessage)) {
        throw new Error(`Expected error message to contain "${expectedMessage}", got "${err.message}"`);
      }
    }
  }
}
