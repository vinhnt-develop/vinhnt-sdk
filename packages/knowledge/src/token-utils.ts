/** Approximate token count from text length. */
export function approximateTokens(text: string, charsPerToken = 4): number {
  return Math.ceil(text.length / charsPerToken);
}
