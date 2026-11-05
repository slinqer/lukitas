import { BlockList, isIP } from "node:net";
import type { Config } from "../config.ts";

/** "::ffff:1.2.3.4" is 1.2.3.4 (Better Auth maps it the same way). */
function normalize(ip: string): string {
  const mapped = /^::ffff:(\d{1,3}(?:\.\d{1,3}){3})$/i.exec(ip);
  return mapped?.[1] && isIP(mapped[1]) === 4 ? mapped[1] : ip.toLowerCase();
}

function blockList(entries: string[]): BlockList {
  const list = new BlockList();
  for (const entry of entries) {
    const [addr, prefix] = entry.split("/");
    const family = addr ? isIP(addr) : 0;
    if (!addr || !family) continue;
    const type = family === 6 ? "ipv6" : "ipv4";
    const bits = prefix === undefined ? undefined : Number(prefix);
    if (bits === undefined) list.addAddress(normalize(addr), type);
    else if (bits <= (family === 6 ? 128 : 32)) list.addSubnet(normalize(addr), bits, type);
  }
  return list;
}

/**
 * The client address the way Better Auth's `advanced.ipAddress` picks it (rate limits use it):
 * from the right of `CLIENT_IP_HEADER`, skipping our trusted proxies; with none configured only a
 * single-valued header is believed. `null` when no address can be trusted.
 */
export function clientIp(
  headers: Headers,
  config: Pick<Config, "CLIENT_IP_HEADER" | "TRUSTED_PROXIES">,
): string | null {
  const value = headers.get(config.CLIENT_IP_HEADER);
  if (typeof value !== "string") return null;
  const hops = value
    .split(",")
    .map((hop) => hop.trim())
    .filter(Boolean);
  if (hops.length === 0) return null;
  const proxies = config.TRUSTED_PROXIES.filter((p) => isCidrEntry(p));
  if (proxies.length > 0) {
    const trusted = blockList(proxies);
    for (let i = hops.length - 1; i >= 0; i--) {
      const hop = hops[i];
      const family = hop ? isIP(hop) : 0;
      if (!hop || !family) return null;
      const ip = normalize(hop);
      if (trusted.check(ip, isIP(ip) === 6 ? "ipv6" : "ipv4")) continue;
      return ip;
    }
    return null;
  }
  const only = hops[0];
  if (hops.length !== 1 || !only || !isIP(only)) return null;
  return normalize(only);
}

function isCidrEntry(entry: string): boolean {
  const [addr, prefix] = entry.split("/");
  return Boolean(addr && isIP(addr)) && (prefix === undefined || /^\d{1,3}$/.test(prefix));
}

/** Whether `ip` is one of the addresses or CIDR ranges in `allowed` (IPv4 and IPv6). */
export function ipAllowed(ip: string | null, allowed: string[]): boolean {
  if (!ip || !isIP(ip)) return false;
  const addr = normalize(ip);
  return blockList(allowed).check(addr, isIP(addr) === 6 ? "ipv6" : "ipv4");
}
