/**
 * The headers the web and the app send about the client: the page's language (`locale`), where to
 * go after signing in (`next`), the device's time zone (`timezone`), `client: android`, and
 * `background: 1` for jobs the person did not start.
 */
export type ClientHeaderName = "locale" | "next" | "timezone" | "client" | "background";

const NAMES: readonly ClientHeaderName[] = ["locale", "next", "timezone", "client", "background"];

/**
 * A client header: `x-wambito-<name>`, else the old `x-lukas-<name>` that the installed APK still
 * sends. One prefix per request: if any `x-wambito-*` header is present, only that prefix is read
 * (never a mix inside one request). 2b: remove the `x-lukas-*` fallback once every phone runs the
 * renamed app.
 */
export function clientHeader(
  headers: Headers | undefined,
  name: ClientHeaderName,
): string | undefined {
  if (!headers) return undefined;
  const newPrefix = NAMES.some((n) => headers.has(`x-wambito-${n}`));
  return headers.get(newPrefix ? `x-wambito-${name}` : `x-lukas-${name}`) ?? undefined; // 2b: remove the x-lukas fallback
}
