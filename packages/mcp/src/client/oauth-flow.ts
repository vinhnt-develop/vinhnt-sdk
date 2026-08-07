import { createHash, randomBytes } from "node:crypto";
import { createServer } from "node:http";
import type { McpTokenStore, OAuthTokens } from "./token-store.js";

const DEFAULT_SCOPES = "openid email profile";

function base64URLEncode(buffer: Buffer): string {
  return buffer
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function generateCodeVerifier(): string {
  return base64URLEncode(randomBytes(32));
}

function generateCodeChallenge(verifier: string): string {
  return base64URLEncode(createHash("sha256").update(verifier).digest());
}

export interface OAuthMetadata {
  authorizationEndpoint: string;
  tokenEndpoint: string;
  registrationEndpoint?: string;
}

function waitForCallback(port: number): Promise<string> {
  return new Promise((resolve, reject) => {
    const server = createServer((req, res) => {
      const url = new URL(req.url ?? "/", `http://localhost:${port}`);
      const code = url.searchParams.get("code");
      const error = url.searchParams.get("error");

      if (error) {
        res.writeHead(400, { "Content-Type": "text/plain" });
        res.end(`OAuth error: ${error}`);
        reject(new Error(`OAuth authorization error: ${error}`));
        return;
      }

      if (code) {
        res.writeHead(200, { "Content-Type": "text/html" });
        res.end("<html><body><h1>Authorization successful!</h1><p>You can close this window.</p></body></html>");
        server.close();
        resolve(code);
      } else {
        res.writeHead(400, { "Content-Type": "text/plain" });
        res.end("Missing authorization code");
        reject(new Error("Missing authorization code in callback"));
      }
    });

    server.listen(port, () => {
      console.log(`[oauth] Listening for OAuth callback on http://localhost:${port}`);
    });

    server.on("error", reject);
  });
}

export interface OAuthFlowOptions {
  clientId: string;
  clientSecret?: string;
  authorizationUrl: string;
  tokenUrl: string;
  redirectPort?: number;
  scopes?: string;
  tokenStore: McpTokenStore;
  serverName: string;
}

async function exchangeCodeForTokens(
  code: string,
  verifier: string,
  redirectUri: string,
  tokenUrl: string,
  clientId: string,
  clientSecret?: string,
): Promise<OAuthTokens> {
  const body = new URLSearchParams({
    grant_type: "authorization_code",
    code,
    redirect_uri: redirectUri,
    client_id: clientId,
    code_verifier: verifier,
  });

  if (clientSecret) {
    body.set("client_secret", clientSecret);
  }

  const resp = await fetch(tokenUrl, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });

  if (!resp.ok) {
    const errText = await resp.text();
    throw new Error(`Token exchange failed: ${resp.status} ${resp.statusText} — ${errText}`);
  }

  const data = await resp.json() as {
    access_token: string;
    refresh_token?: string;
    expires_in?: number;
    token_type?: string;
    scope?: string;
  };

  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresAt: data.expires_in ? Date.now() + data.expires_in * 1000 : undefined,
    tokenType: data.token_type ?? "Bearer",
    scope: data.scope,
  };
}

async function refreshTokens(
  refreshToken: string,
  tokenUrl: string,
  clientId: string,
  clientSecret?: string,
): Promise<OAuthTokens> {
  const body = new URLSearchParams({
    grant_type: "refresh_token",
    refresh_token: refreshToken,
    client_id: clientId,
  });

  if (clientSecret) {
    body.set("client_secret", clientSecret);
  }

  const resp = await fetch(tokenUrl, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });

  if (!resp.ok) {
    throw new Error(`Token refresh failed: ${resp.status} ${resp.statusText}`);
  }

  const data = await resp.json() as {
    access_token: string;
    refresh_token?: string;
    expires_in?: number;
    token_type?: string;
    scope?: string;
  };

  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token ?? refreshToken,
    expiresAt: data.expires_in ? Date.now() + data.expires_in * 1000 : undefined,
    tokenType: data.token_type ?? "Bearer",
    scope: data.scope,
  };
}

export async function runOAuthFlow(options: OAuthFlowOptions): Promise<string> {
  const { tokenStore, serverName, authorizationUrl, tokenUrl, clientId, clientSecret } = options;
  const redirectPort = options.redirectPort ?? 31415;
  const scopes = options.scopes ?? DEFAULT_SCOPES;
  const redirectUri = `http://localhost:${redirectPort}/callback`;

  const verifier = generateCodeVerifier();
  const challenge = generateCodeChallenge(verifier);

  const authUrl = new URL(authorizationUrl);
  authUrl.searchParams.set("response_type", "code");
  authUrl.searchParams.set("client_id", clientId);
  authUrl.searchParams.set("redirect_uri", redirectUri);
  authUrl.searchParams.set("code_challenge", challenge);
  authUrl.searchParams.set("code_challenge_method", "S256");
  authUrl.searchParams.set("scope", scopes);
  authUrl.searchParams.set("access_type", "offline");

  console.log(`[oauth] Opening browser for authorization: ${authUrl.toString()}`);

  // Try to open the browser
  const { execFile } = await import("node:child_process");
  const platform = process.platform;
  const browserCmd = platform === "win32" ? "start" : platform === "darwin" ? "open" : "xdg-open";
  try {
    if (platform === "win32") {
      execFile("cmd.exe", ["/c", "start", "", authUrl.toString()]);
    } else {
      execFile(browserCmd, [authUrl.toString()]);
    }
  } catch {
    console.log(`[oauth] Please open this URL in your browser:\n${authUrl.toString()}`);
  }

  const authCode = await waitForCallback(redirectPort);

  const tokens = await exchangeCodeForTokens(authCode, verifier, redirectUri, tokenUrl, clientId, clientSecret);

  await tokenStore.save(serverName, tokens);

  return tokens.accessToken;
}

export async function getValidAccessToken(
  serverName: string,
  tokenStore: McpTokenStore,
  config: { tokenUrl: string; clientId: string; clientSecret?: string },
): Promise<{ accessToken: string; isNew: boolean }> {
  const stored = await tokenStore.load(serverName);

  if (stored) {
    if (!tokenStore.isExpired(stored)) {
      return { accessToken: stored.accessToken, isNew: false };
    }

    if (stored.refreshToken) {
      try {
        const refreshed = await refreshTokens(stored.refreshToken, config.tokenUrl, config.clientId, config.clientSecret);
        await tokenStore.save(serverName, refreshed);
        return { accessToken: refreshed.accessToken, isNew: false };
      } catch {
        // Refresh failed, fall through to full re-auth
      }
    }
  }

  throw new Error("No valid token available — run runOAuthFlow() first");
}
