import type { NS } from "@ns";
import type { StaticServerInfo } from "/lib/network";

/** Static information about all known servers */
export const ALL_SERVERS: Map<string, StaticServerInfo> = new Map();
/** Network links for all known servers */
export const NETWORK_LINKS: Map<string, Set<string>> = new Map();

export async function main(ns:NS) {
    console.log({
        ALL_SERVERS,
        NETWORK_LINKS
    })
}