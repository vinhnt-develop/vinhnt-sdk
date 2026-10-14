/**
 * Browser driver seam (P2-8 / G7.3).
 *
 * This package ships the TOOL LAYER only — no browser backend. Consumers
 * inject any automation backend (Playwright, Puppeteer, raw CDP, a remote
 * browser service) that implements {@link BrowserDriver}. Fail-closed by
 * default: without a driver there are no browser tools to register.
 */

/**
 * When navigation is considered complete — driver-defined capability, so the
 * union is open (`(string & {})`) and unknown values pass through to the
 * backend instead of being rejected here.
 */
export type BrowserWaitUntil = "commit" | "domcontentloaded" | "load" | "networkidle" | (string & {});

/** Options forwarded to {@link BrowserDriver.navigate}. */
export interface BrowserNavigateOptions {
  /** Completion condition — semantics depend on the driver. */
  readonly waitUntil?: BrowserWaitUntil;
  /** Driver-specific navigation timeout in ms (driver decides defaults). */
  readonly timeoutMs?: number;
}

/** Result of a successful navigation. */
export interface BrowserNavigationResult {
  /** Final URL after redirects (driver-reported). */
  readonly url: string;
  readonly title?: string | undefined;
  /** HTTP status of the main document when the driver exposes one. */
  readonly status?: number | undefined;
}

/** Page state captured by {@link BrowserDriver.snapshot}. */
export interface BrowserSnapshot {
  readonly url: string;
  readonly title?: string | undefined;
  /**
   * Serialized page content in whatever form the driver provides —
   * accessibility tree, HTML, or markdown. Consumers treat it as opaque text.
   */
  readonly content: string;
}

/** Options forwarded to {@link BrowserDriver.type}. */
export interface BrowserTypeOptions {
  /** Clear the field before typing. Default: driver's behavior. */
  readonly clear?: boolean | undefined;
}

/**
 * Injection seam for browser automation. Implement this over your backend of
 * choice and pass it to `createBrowserTools({ driver })`.
 *
 * @example
 * ```typescript
 * import type { BrowserDriver } from "@vinhnt-sdk/tools-browser";
 *
 * const driver: BrowserDriver = {
 *   async navigate(url, options) { /* wrap Playwright *\/ return { url, title }; },
 *   async snapshot() { return { url, content: await page.content() }; },
 *   async click(selector) { await page.click(selector); },
 *   async type(selector, text) { await page.fill(selector, text); },
 * };
 * ```
 */
export interface BrowserDriver {
  navigate(url: string, options?: BrowserNavigateOptions): Promise<BrowserNavigationResult>;
  snapshot(): Promise<BrowserSnapshot>;
  click(selector: string): Promise<void>;
  type(selector: string, text: string, options?: BrowserTypeOptions): Promise<void>;
  /** Optional cleanup — invoked by `browser_close` when the driver provides it. */
  close?(): Promise<void>;
}
