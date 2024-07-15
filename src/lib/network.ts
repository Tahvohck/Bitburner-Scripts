import { NS, Server } from "@ns";

/**
 * Details about a Server that do not change between polling and are thus safe to grab once and never update.
 */
export class StaticServerInfo {
    /** Server's installed RAM */
    maxRam: number;
    /** Maximum money */
    moneyMax: number;
    /** Minimum security level*/
    minSec: number;
    /** Number of ports needed to NUKE */
    neededOpenPorts: number;
    /** Needed hack skill to hack */
    hackRequirement: number;
    /** Growth factor*/
    serverGrowth: number;

    /** Server IP */
    ip: string;
    /** Owning organization */
    owner: string;
    /** hostname (you probably have this already) */
    hostname: string;

    /** Server is owned by the player*/
    personal: boolean;

    /**
     * @param server
     */
    constructor(server: Server) {
        this.maxRam             = server.maxRam;
        this.moneyMax           = server.moneyMax || -1;
        this.minSec             = server.minDifficulty || -1;
        this.neededOpenPorts    = server.numOpenPortsRequired || -1;
        this.hackRequirement    = server.requiredHackingSkill || -1;
        this.serverGrowth       = server.serverGrowth || -1;

        this.ip         = server.ip;
        this.owner      = server.organizationName;
        this.hostname   = server.hostname;

        this.personal   = server.purchasedByPlayer;
    }
}

/**
 * @param ns A NetScript library
 * @param startServer Where to start the scan from
 * @returns A map of all found servers and their network links
 */
export function scanRecursive(ns: NS, startServer = "home"): Map<string, Set<string>> {
    /** @type {Map<string, Set<string>>} */
    let network: Map<string, Set<string>> = new Map();
    let to_scan: string[] = [startServer];

    while (to_scan.length > 0) {
        let host = to_scan.shift();
        if (!host) { break; }
        network.set(host, new Set(ns.scan(host)));
        
        for (const newHost of network.get(host)!) {
            if (network.has(newHost)) { continue; }
            to_scan.push(newHost);
        }
    }
    return network;
}