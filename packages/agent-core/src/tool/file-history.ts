export interface FileVersion {
  readonly filePath: string;
  readonly sessionId: string;
  readonly originalContent: string;
  readonly newContent: string;
  readonly timestamp: number;
  readonly toolName: string;
}

export interface UndoEntry {
  readonly filePath: string;
  readonly originalContent: string;
  readonly newContent: string;
  readonly toolName: string;
  readonly timestamp: number;
  readonly versionId: number;
}

export interface FileHistory {
  recordVersion(version: Omit<FileVersion, "timestamp"> & { timestamp?: number }): Promise<void>;
  listVersions(filePath: string): Promise<readonly FileVersion[]>;
  getLatestVersion(filePath: string): Promise<FileVersion | null>;
  rollbackTo(filePath: string, targetVersion: number): Promise<string>;
  getAllChanges(): Promise<readonly FileVersion[]>;
  undo(): Promise<UndoEntry | null>;
  redo(): Promise<UndoEntry | null>;
}

export class InMemoryFileHistory implements FileHistory {
  private versions: FileVersion[] = [];
  private undoStack: UndoEntry[] = [];
  private redoStack: UndoEntry[] = [];
  private versionCounter = 0;

  async recordVersion(version: Omit<FileVersion, "timestamp"> & { timestamp?: number }): Promise<void> {
    const entry: FileVersion = {
      ...version,
      timestamp: version.timestamp ?? Date.now(),
    } as FileVersion;
    entry satisfies FileVersion;
    this.versions.push(entry);
    this.undoStack.push({
      filePath: entry.filePath,
      originalContent: entry.originalContent,
      newContent: entry.newContent,
      toolName: entry.toolName,
      timestamp: entry.timestamp,
      versionId: this.versionCounter++,
    });
    this.redoStack = [];
  }

  async listVersions(filePath: string): Promise<readonly FileVersion[]> {
    return this.versions.filter((v) => v.filePath === filePath);
  }

  async getLatestVersion(filePath: string): Promise<FileVersion | null> {
    const matches = this.versions.filter((v) => v.filePath === filePath);
    return matches.length > 0 ? matches[matches.length - 1]! : null;
  }

  async rollbackTo(filePath: string, versionIndex: number): Promise<string> {
    const matches = this.versions.filter((v) => v.filePath === filePath);
    if (versionIndex < 0 || versionIndex >= matches.length) {
      throw new Error(`Version index ${versionIndex} out of range (0-${matches.length - 1})`);
    }
    return matches[versionIndex]!.originalContent;
  }

  async getAllChanges(): Promise<readonly FileVersion[]> {
    return [...this.versions];
  }

  async undo(): Promise<UndoEntry | null> {
    const entry = this.undoStack.pop();
    if (!entry) return null;
    this.redoStack.push(entry);
    return entry;
  }

  async redo(): Promise<UndoEntry | null> {
    const entry = this.redoStack.pop();
    if (!entry) return null;
    this.undoStack.push(entry);
    return entry;
  }
}
