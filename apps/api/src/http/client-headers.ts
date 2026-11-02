/**
 * The headers the web and the app send about the client: the page's language (`locale`), where to
 * go after signing in (`next`), the device's time zone (`timezone`), `client: android`, and
 * `background: 1` for jobs the person did not start.
 */
export type ClientHeaderName = "locale" | "next" | "timezone" | "client" | "background";

/**
 * A client header: `x-wambito-<name>`, else the old `x-lukas-<name>` that the installed APK still
 * sends. 2b: remove the `x-lukas-*` fallback once every phone runs the renamed app.
 */
export function clientHeader(
  headers: Headers | undefined,
  name: ClientHeaderName,
): string | undefined {
  return headers?.get(`x-wambito-${name}`) ?? headers?.get(`x-lukas-${name}`) ?? undefined; // 2b: remove the x-lukas fallback
}
