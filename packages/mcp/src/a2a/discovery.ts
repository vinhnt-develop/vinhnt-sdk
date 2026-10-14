/**
 * A2A v1.0 discovery — Agent Card over `/.well-known/agent-card.json`
 * with HTTP caching (ETag / `If-None-Match` → 304).
 *
 * Source: `.agents/research/a2a-protocol-research.md` (2026-08-08),
 * section "Discovery".
 */

import { NetworkError, ValidationError } from "@vinhnt-sdk/schema";
import type { AgentCard } from "./types.js";

/** Primary discovery path (A2A v1.0). */
export const A2A_AGENT_CARD_WELL_KNOWN_PATH = "/.well-known/agent-card.json";

/** Options for {@link discoverAgentCard}. */
export interface DiscoverAgentCardOptions {
  /** fetch implementation seam (defaults to global fetch). */
  readonly fetchImpl?: typeof fetch;
  /** Previous ETag — issues a conditional `If-None-Match` request. */
  readonly etag?: string;
  /** Abort signal (passed through to fetch). */
  readonly signal?: AbortSignal;
}

/** Result of an agent-card discovery request. */
export interface AgentCardDocument {
  /** Canonical card — absent on `304 Not Modified`. */
  readonly card?: AgentCard;
  /** Effective document URL that was requested. */
  readonly url: string;
  /** ETag from the response (or the one sent, on 304). */
  readonly etag?: string;
  /** True when the server answered 304 — reuse the cached card. */
  readonly notModified?: boolean;
}

function resolveCardUrl(target: string): string {
  let url: URL;
  try {
    url = new URL(target);
  } catch {
    throw new ValidationError(
      `discoverAgentCard: invalid target URL: ${target}`,
    );
  }
  if (url.pathname === "/" || url.pathname === "") {
    url.pathname = A2A_AGENT_CARD_WELL_KNOWN_PATH;
  }
  return url.toString();
}

function validateAgentCard(value: unknown): asserts value is AgentCard {
  const missing: string[] = [];
  if (typeof value !== "object" || value === null) {
    throw new ValidationError("invalid A2A agent card: not an object");
  }
  const card = value as Record<string, unknown>;
  for (const field of ["name", "description", "version"] as const) {
    if (typeof card[field] !== "string" || card[field] === "") {
      missing.push(field);
    }
  }
  for (const field of [
    "supportedInterfaces",
    "skills",
    "defaultInputModes",
    "defaultOutputModes",
  ] as const) {
    if (!Array.isArray(card[field])) {
      missing.push(field);
    }
  }
  if (typeof card["capabilities"] !== "object" || card["capabilities"] === null) {
    missing.push("capabilities");
  }
  if (missing.length > 0) {
    throw new ValidationError(
      `invalid A2A agent card: missing or invalid ${missing.join(", ")}`,
      missing,
    );
  }
}

/**
 * Discover an A2A agent card.
 *
 * - Bare origin (`https://host/`) → GET `/.well-known/agent-card.json`.
 * - Full URL (curated registry entry) → requested as-is.
 * - `options.etag` → conditional request; `304` resolves with
 *   `{ notModified: true }` and no `card`.
 *
 * @throws {ValidationError} target URL or card payload invalid.
 * @throws {NetworkError} transport / HTTP / JSON parse failure.
 */
export async function discoverAgentCard(
  target: string,
  options: DiscoverAgentCardOptions = {},
): Promise<AgentCardDocument> {
  const url = resolveCardUrl(target);
  const fetchImpl = options.fetchImpl ?? fetch;
  const headers: Record<string, string> = { accept: "application/json" };
  if (options.etag !== undefined) {
    headers["if-none-match"] = options.etag;
  }

  let response: Response;
  try {
    response = await fetchImpl(url, {
      method: "GET",
      headers,
      ...(options.signal !== undefined ? { signal: options.signal } : {}),
    });
  } catch (cause) {
    throw new NetworkError(`A2A agent card fetch failed: ${url}`, cause);
  }

  const etag = response.headers.get("etag");
  if (response.status === 304) {
    return {
      url,
      notModified: true,
      ...(etag !== null
        ? { etag }
        : options.etag !== undefined
          ? { etag: options.etag }
          : {}),
    };
  }
  if (!response.ok) {
    throw new NetworkError(
      `A2A agent card fetch failed: HTTP ${response.status} for ${url}`,
    );
  }

  let payload: unknown;
  try {
    payload = await response.json();
  } catch (cause) {
    throw new NetworkError(
      `A2A agent card fetch failed: invalid JSON from ${url}`,
      cause,
    );
  }
  validateAgentCard(payload);

  return {
    card: payload,
    url,
    ...(etag !== null ? { etag } : {}),
  };
}
