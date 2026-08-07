import type { LspClient } from "./client.js";
import { getLanguageId } from "./server-registry.js";

export function uriFromPath(filePath: string): string {
  const normalized = filePath.replace(/\\/g, "/");
  return normalized.startsWith("/") ? `file://${normalized}` : `file:///${normalized}`;
}

export function pathFromUri(uri: string): string {
  const decoded = decodeURIComponent(uri);
  const match = decoded.match(/^file:\/\/(?:\/([a-zA-Z]:))?(.*)$/);
  if (match) {
    const drive = match[1] as string | undefined;
    const absPath = match[2] ?? "";
    return drive ? `${drive}${absPath}` : absPath;
  }
  return decoded.replace(/^file:\/\//, "");
}

export function notifyOpen(client: LspClient, filePath: string, content: string): void {
  const uri = uriFromPath(filePath);
  const ext = filePath.match(/\.[^.]+$/)?.[0] ?? "";
  const languageId = getLanguageId(ext);
  client.openFile(uri, languageId, content);
}

export function notifyChange(client: LspClient, filePath: string, content: string): void {
  const uri = uriFromPath(filePath);
  client.changeFile(uri, content);
}

export function notifyClose(client: LspClient, filePath: string): void {
  const uri = uriFromPath(filePath);
  client.closeFile(uri);
}

export function pathToUri(filePath: string): string {
  return uriFromPath(filePath);
}
