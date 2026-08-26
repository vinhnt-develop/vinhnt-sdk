/** Line-level unified diff with add/remove counts. */
export interface UnifiedDiff {
  readonly diff: string;
  readonly additions: number;
  readonly removals: number;
}

/** Generate a line-level diff between old and new content for a file. */
export function generateDiff(
  filePath: string,
  oldContent: string,
  newContent: string,
): UnifiedDiff {
  const oldLines = oldContent.split("\n");
  const newLines = newContent.split("\n");
  const maxLen = Math.max(oldLines.length, newLines.length);

  const result: string[] = [];
  let additions = 0;
  let removals = 0;

  for (let i = 0; i < maxLen; i++) {
    const oldLine = i < oldLines.length ? oldLines[i] : "";
    const newLine = i < newLines.length ? newLines[i] : "";

    if (oldLine !== newLine) {
      if (oldLines[i] !== undefined) {
        result.push(`-${i + 1}: ${oldLine}`);
        removals++;
      }
      if (newLines[i] !== undefined) {
        result.push(`+${i + 1}: ${newLine}`);
        additions++;
      }
    }
  }

  result.unshift(`--- a/${filePath}`);
  result.unshift(`+++ b/${filePath}`);

  return { diff: result.join("\n"), additions, removals };
}
