import { NS } from "@ns";
import { StaticServerInfo, scanRecursive } from "/lib/network";
import { Pagefile, ServerRamUsage, free, halloc } from "/lib/ram";
import { RAM_ALLOCATIONS, RAM_SOURCES, getSource } from "/sys/memory";
import { ALL_SERVERS, NETWORK_LINKS } from "/sys/network";
import { NullPort, Ports } from "/sys/ports";
const { React, ReactDOM } = globalThis;

const CORE_SCRIPTS = [
    'tools/monitor-all.js'
];

let crackers = 0;
let infoColor: string;
let warnColor: string;

interface BIOSTerminalMessageProps {
    children?: React.ReactNode
}
function BIOSTermMsg({children}: BIOSTerminalMessageProps) {
    const biosTextAttrib: React.CSSProperties = {
        color: infoColor,
        font: "0.8rem Input",
    }
    return <span style={biosTextAttrib}>{children}</span>
}
function BIOSTermWarn({children}: BIOSTerminalMessageProps) {
    const biosTextAttrib: React.CSSProperties = {
        color: warnColor,
        font: "0.8rem Input",
    }
    return <span style={biosTextAttrib}>{children}</span>
}

/** Attempt to nuke a server, running any prerequisite crackers. 
 * @param ns
 * @param target
 * @returns true if successful, false if not enough ports can be opened or if your hack level is too low.
 */
export function tryNuke (ns: NS, target: string): boolean {
    crackers = 0;
    try { ns.brutessh (target); crackers++; } catch {}
    try { ns.ftpcrack (target); crackers++; } catch {}
    try { ns.relaysmtp(target); crackers++; } catch {}
    try { ns.httpworm (target); crackers++; } catch {}
    try { ns.sqlinject(target); crackers++; } catch {}
    try { 
        ns.nuke(target);
        return true;
    } catch {
        return false;
    }
}

/** Disable script logs (but not everything, just spammed items) */
function disableLogs(ns: NS) {
    ns.disableLog("brutessh");
    ns.disableLog("ftpcrack");
    ns.disableLog("relaysmtp");
    ns.disableLog("httpworm");
    ns.disableLog("sqlinject");
    ns.disableLog("nuke");
    ns.disableLog("scan");
    ns.disableLog("asleep");
}

/** Clean stale blocks from pagefile */
function cleanPagefile(ns: NS, page: Pagefile) {
    page.read()
    // Map the list of PIDs to true/false: true if the script is complete
    // Then flatten to a single boolean: true if all scripts are done
    // Stale blocks are those that are freed, or with no associated processes, or where all processes are finished.
    page.clean((x) => {
        let allFinished = x.pids
            .map((x) => !ns.getRunningScript(x))
            .reduce((p, v) => p && v, true)
        return x.freed || x.pids.length == 0 || allFinished
    })
    page.write()
}

/** Catch the exit signal and clean up the bios */
function catchExit(ns: NS, page: Pagefile) {
    ns.tprintRaw(<BIOSTermWarn>WARNING: BIOS is shutting down</BIOSTermWarn>)
    for (const alloc of page.getAll()) {
        // kill everything assigned to this allocation except for this script
        for (const pid of free(alloc)) {
            if (pid == ns.pid) continue
            ns.kill(pid);
        }
    }
    page.clear();
    page.write();
    ns.tprintRaw(<BIOSTermMsg>BIOS shutdown complete</BIOSTermMsg>)
}

export async function main(ns: NS) {
    ns.ramOverride(4.4)
    // First setup: self-terminate if another BIOS is running. Disable logs. Set up kill-catch.
    if (ns.getRunningScript(ns.getScriptName())?.pid != ns.getRunningScript()?.pid) {
        throw new Error("Cannot run more than one BIOS at a time. Kill the old one first.")
    }
    disableLogs(ns);
    ns.atExit(() => catchExit(ns, MEM_MAP), "bios_memclear");
    console.clear();
    
    // Nuke home to set up the number of crackers.
    tryNuke(ns, "home")
    // Clear terminal and prep styles
    ns.ui.clearTerminal();
    infoColor = ns.ui.getTheme().info
    warnColor = ns.ui.getTheme().warning

    // Initialize pagefile
    let MEM_MAP = new Pagefile("bios/page", ns);
    cleanPagefile(ns, MEM_MAP)

    ns.tprintRaw(<BIOSTermMsg>Initializing BIOS...</BIOSTermMsg>);

    ////////////////
    // Network setup
    ns.tprintRaw(<BIOSTermMsg>Initializing Network...</BIOSTermMsg>)
    // Rebuild these entirely from scratch each time
    ALL_SERVERS.clear();
    NETWORK_LINKS.clear();
    NETWORK_LINKS.set("home", new Set())
    for (const [name, links] of scanRecursive(ns)) {
        let server = ns.getServer(name)
        ALL_SERVERS.set(name, new StaticServerInfo(server));
        if (server.backdoorInstalled) {
            links.add("home");
            NETWORK_LINKS.get("home")!.add(name);
        }
        NETWORK_LINKS.set(name, links);
    };
    ns.tprintRaw(<BIOSTermMsg>{ALL_SERVERS.size} nodes in the network.</BIOSTermMsg>);

    ////////////////
    // Networked RAM setup.
    ns.tprintRaw(<BIOSTermMsg>Initializing networked RAM...</BIOSTermMsg>);
    let runnable = [...ALL_SERVERS].filter(([s, info]) => info.maxRam > 0);
    let potentialSources: StaticServerInfo[] = [];
    ns.tprintRaw(<BIOSTermMsg>{runnable.length} nodes have runspace</BIOSTermMsg>);

    // Update object for all known sources (in case underlying code, OR status has changed)
    // the way we do this will change the length of the source array, so we need to grab that first.
    let startingLength = RAM_SOURCES.length
    for (let i = 0; i < startingLength; i++) {
        // take a source off the end of the array.
        let staleSource = RAM_SOURCES.pop()
        if (!staleSource) continue
        // If the source is undefined somehow, ask for a hostname that definitely doesn't exist.
        let ssi = ALL_SERVERS.get(staleSource?.hostname || "DOES NOT EXIST");

        // Check gates: If the server doesn't exist, or we don't have enough crackers and it's not ours, skip.
        if (!ssi) continue;
        if (ssi.neededOpenPorts > crackers && !ssi.personal) continue;
        // Generate a replacement object, then delete the max RAM off the stale object (so it properly updates)
        let newSRU = new ServerRamUsage(ssi)
        //@ts-expect-error We're doing some fucky things here, so ignore the error
        delete staleSource.max
        newSRU = Object.assign(newSRU, staleSource)
        // now put it back into the sources array.
        RAM_SOURCES.unshift(newSRU)
    }
    // Now add any more that we didn't know about
    for (const [server, info] of runnable) {
        if(tryNuke(ns, info.hostname)) {
            if (getSource(server)) {continue; }
            RAM_SOURCES.push(new ServerRamUsage(info));
        } else {
            potentialSources.push(info)
        };
    };
    ns.tprintRaw(<BIOSTermMsg>{RAM_SOURCES.length} nodes available for allocation</BIOSTermMsg>);

    cleanPagefile(ns, MEM_MAP)
    for (const alloc of MEM_MAP.getAll()) {
        free(alloc)
    }
    // This is the first allocation: We definitely have enough space to allocate this.
    MEM_MAP.push(
        halloc(1, 16,"home")!.associate(ns.pid)
    );

    ////////////////
    // BIOS standby loop
    let port = ns.getPortHandle(Ports.BIOS);
    while (true) {
        // BIOS is a slow file, no need to be checking regularly
        await ns.asleep(500);

        // check for any new viable networked RAM
        let newSources: StaticServerInfo[] = [];
        for (const ssi of potentialSources) {
            ns.print(`Probing ${ssi.hostname.padEnd(18)} [${ssi.neededOpenPorts}]`)
            if (tryNuke(ns, ssi.hostname)) {
                RAM_SOURCES.push(new ServerRamUsage(ssi));
                newSources.push(ssi);
                ns.tprintRaw(<BIOSTermMsg>New server added to network ({ssi.hostname})</BIOSTermMsg>)
            }
        }
        // Remove any new sources from the potential sources list
        potentialSources = potentialSources.filter(x => !newSources.includes(x));

        // Check for updated ram counts on personal servers
        for (const ssi of [...ALL_SERVERS.values()].filter(x => x.personal)) {
            let sru = getSource(ssi.hostname)
            // Server is new, add it to the list
            if (!sru) {
                RAM_SOURCES.push(new ServerRamUsage(ssi))
                continue;
            }
            // Server is not new, but it has more RAM.
            if (sru.max < ssi.maxRam * 1024 ) {
                sru.max = new ServerRamUsage(ssi).max;
                ns.tprintRaw(<BIOSTermMsg>Updated RAM amount on {sru.hostname}</BIOSTermMsg>)
            }
        }

        for (const [server, links] of NETWORK_LINKS) {
            if (ns.getServer(server).backdoorInstalled && !links.has("home")) {
                links.add("home");
                NETWORK_LINKS.get("home")!.add(server);
                ns.tprintRaw(<BIOSTermMsg>Adding direct link to {server}</BIOSTermMsg>)
            }
        }

        // Clear out any stale reservations
        let badBlocks = RAM_ALLOCATIONS.filter(x => x != null && !x.freed && x.pids.length > 0)
        let didCleanup = false;
        for (const badBlock of badBlocks) {
            let scriptsRunning = false;
            for (const pid of badBlock!.pids) {
                if (!!ns.getRunningScript(pid)) {
                    scriptsRunning = true;
                    break;
                }
            }
            if (!scriptsRunning) {
                free(badBlock!)
                didCleanup = true;
            };
        }
        if (didCleanup) {
            ns.tprintRaw(<BIOSTermWarn>Freed stale allocations</BIOSTermWarn>)
        }

        while (!port.empty()) {
            let rawData = port.read()
            // Just in case it somehow gets read off the stack before we consume it
            if (rawData == NullPort) continue;
            let data = rawData as BIOSNetworkMessage;
            switch (data.type) {
                case BIOSNetworkMessageType.ECHO: {
                    ns.tprintRaw(<BIOSTermMsg>BIOS Echo: {data.message}</BIOSTermMsg>)
                    break;
                }
                case BIOSNetworkMessageType.KILL_ORPHAN_ALLOCATIONS: {
                    let orphans = RAM_ALLOCATIONS.filter(x => x != undefined && x.pids.length == 0)
                    for (const alloc of orphans) {
                        free(alloc!);
                    }
                    break;
                }
                case BIOSNetworkMessageType.RESET_ALLOCATION_AMOUNT: {
                    for (const sru of RAM_SOURCES) {
                        sru.used = RAM_ALLOCATIONS
                            .filter(x => !!x && x!.host == sru.hostname)
                            .map(x => x?.size)
                            .reduce((p, c) => p! + c!, 0)!
                    }
                    break;
                }
                case BIOSNetworkMessageType.UPDATE_SERVER: {
                    try {
                        const server = ns.getServer(data.message)
                        ALL_SERVERS.set(data.message, new StaticServerInfo(server))
                    } catch {
                        ns.tprintRaw(<BIOSTermWarn>Sent a bad server to update: {data.message}</BIOSTermWarn>)    
                    }
                    break;
                }
            }
        }
    }
    // End BIOS standby loop
    ////////////////
}

export const enum BIOSNetworkMessageType {
    DEFAULT = 1,
    ECHO,
    KILL_ORPHAN_ALLOCATIONS,
    RESET_ALLOCATION_AMOUNT,
    UPDATE_SERVER
}

export class BIOSNetworkMessage {
    type: BIOSNetworkMessageType = BIOSNetworkMessageType.DEFAULT;
    message: string = "";
    extraData: any = {};
}