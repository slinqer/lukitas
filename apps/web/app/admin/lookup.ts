/**
 * What the look-up box sends to `GET /v1/admin/users`: the trimmed input as `email` when it has an
 * `@`, else as `id`; nothing for an empty input.
 */
export function lookupQuery(input: string): { email: string } | { id: string } | null {
  const text = input.trim();
  if (!text) return null;
  return text.includes("@") ? { email: text } : { id: text };
}
