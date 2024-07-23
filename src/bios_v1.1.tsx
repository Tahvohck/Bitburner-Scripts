import { NS } from "@ns";
import { ALL_SERVERS, NETWORK_LINKS } from "/sys/network";
import { StaticServerInfo, scanRecursive } from "/lib/network";
import { RAM_ALLOCATIONS, RAM_SOURCES } from "/sys/memory";
import { Pagefile, ReservedRAM, ServerRamUsage, free, halloc } from "/lib/ram";
import { Ports } from "/sys/ports";
const { React } = globalThis;

let biosMatcher = /bios.*?\.js/;

/** "Term Message Style Common" */
const BIOS_TMSC: React.CSSProperties = {
    fontSize: "0.8em",
    fontFamily: "'Cascadia Code', monospace",
    //fontVariant: "small-caps",
    fontWeight: "bold",
}
/** "Term Message Style Warning" - this is a clone of TMSC with a different color */
const BIOS_TMSW: React.CSSProperties = { ...BIOS_TMSC }
interface BIOS_TermMsgArguments {
    children: React.ReactNode
}
function BIOS_TermInfo({children}: BIOS_TermMsgArguments): React.JSX.Element {
    return <span style={BIOS_TMSC}>{children}</span>
}
function BIOS_TermWarn({children}: BIOS_TermMsgArguments): React.JSX.Element {
    return <span style={BIOS_TMSW}>{children}</span>
}

let crackers:number | undefined;
/** Get  */
export function getCrackerCount():number {
    return crackers || 0
}
/** Attempt to nuke a server, running any prequisite crackers. Updates cracker count.
 * @param ns Netscript 2 library
 * @param target Server to nuke
 * @returns true if successful
*/
export function tryNuke(ns:NS, target:string): boolean {
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


export async function main(ns:NS) {
    
    const runningBIOSes = ns.ps().filter(x => biosMatcher.test(x.filename))
    if(runningBIOSes.length > 1) {
        throw new Error(`Cannot run more than one BIOS at the same time. Kill PID ${runningBIOSes[0].pid} first.`)
    }

    //#region internal functions
    /** helper function to dynamically add an S */
    function pluralize(num: number): string {
        if (num == 1) {
            return "s"
        } else {
            return ""
        }
    }

    /** Called when script exits, cleans up background tasks. */
    function cleanup(): void {
        ns.tprintRaw(<BIOS_TermWarn>BIOS shutting down</BIOS_TermWarn>)

        try {
            if (!!biosAlloc) { biosAlloc.pids = [] }
        } catch {
            ns.tprintRaw(<BIOS_TermWarn>BIOS shut down before memory allocation completed.</BIOS_TermWarn>)
        }
        BIOS_PAGE.write()
        
        ns.tprintRaw(<BIOS_TermInfo>BIOS shutdown complete</BIOS_TermInfo>)
    }

    /** Find all possible new sources of networked RAM and add them to RAM_SOURCES */
    function RAM_FindNewSources(): void {
        const sourceNames = new Set(RAM_SOURCES.map(x => x.hostname))
        const validSources = [...ALL_SERVERS.values()].filter(
            x =>
            x.maxRam > 0 && !sourceNames.has(x.hostname)
        )

        let newSourceCount = 0
        for (const ssi of validSources) {
            // Gate: skip any servers that are too difficult to nuke right now.
            if (!tryNuke(ns, ssi.hostname)) { continue; }
            RAM_SOURCES.push(new ServerRamUsage(ssi))
            newSourceCount++;
        }
        if (newSourceCount > 0) {
            ns.tprintRaw(<BIOS_TermInfo>Added {newSourceCount} networked RAM source{pluralize(newSourceCount)}</BIOS_TermInfo>)
        }
    }

    /** Iterate over every allocation and sum up actual usage. */
    function RAM_RebuildUsage(): void {
        const sourceNames = RAM_SOURCES.map(x => x.hostname)
        const usageMap = new Map(sourceNames.map(x => [x, 0]))
        let staleCount = 0;
        let nonRunningCount = 0;
        for (const alloc of RAM_ALLOCATIONS) {
            if (!alloc) { continue; }
            if (alloc.freed) { continue; } // not sure how tf but do this anyway
            if (!sourceNames.includes(alloc.host)) {
                free(alloc)
                staleCount++
                continue;
            }
            if (alloc.pids.length == 0) {
                free(alloc);
                continue;
            }
            if (alloc.pids.every(pid => !ns.getRunningScript(pid))) {
                free(alloc)
                nonRunningCount++
                continue
            }

            usageMap.set(alloc.host, usageMap.get(alloc.host)! + alloc.size)
        }
        if (staleCount > 0) {
            ns.tprintRaw(<BIOS_TermWarn>Freed {staleCount.toLocaleString()} stale alloc</BIOS_TermWarn>)
        }
        if (nonRunningCount > 0) {
            ns.tprintRaw(<BIOS_TermWarn>Freed {nonRunningCount.toLocaleString()} non-consumed alloc</BIOS_TermWarn>)
        }

        for (const [host, value] of usageMap) {
            RAM_SOURCES.find(x => x.hostname == host)!.used = value
        }
    }

    function RAM_UpdatePersonalServers(): void {
        for (const ssi of [...ALL_SERVERS.values()].filter(x => x.personal)) {
            const server = ns.getServer(ssi.hostname)
            if (!server) { throw new Error("A personal server vanished while BIOS was running")}
            ALL_SERVERS.set(server.hostname, new StaticServerInfo(server))
            const freshData = new ServerRamUsage(new StaticServerInfo(server))
            RAM_SOURCES.find(x => x.hostname == ssi.hostname)!.max = freshData.max
        }
    }

    /** Find servers that are now backoored but weren't previously */
    function NETWORK_findNewBackdoors(): void {
        const homeLinks = NETWORK_LINKS.get("home")!
        const notBackdoored = [...ALL_SERVERS.keys()].filter(x => !homeLinks.has(x))
        for (const hostname of notBackdoored) {
            if (ns.getServer(hostname).backdoorInstalled) {
                homeLinks.add(hostname)
                NETWORK_LINKS.get(hostname)!.add("home")
                ns.tprintRaw(<BIOS_TermInfo>
                    Added direct network link to {hostname}
                </BIOS_TermInfo>)
            }
        }
    }

    /** Find new servers on the network */
    function NETWORK_findNewServers() {
        let newServersCount = 0;
        for (const [hostname, links] of scanRecursive(ns)) {
            if (ALL_SERVERS.has(hostname)) { continue; }    // skip this one, we already know it
            newServersCount++

            const server = ns.getServer(hostname)
            ALL_SERVERS.set(hostname, new StaticServerInfo(server))
            
            if (server.backdoorInstalled) {
                links.add("home")
                NETWORK_LINKS.get("home")!.add(hostname)
            }
            // Merge any existing links with those in `links`
            // This is mostly just done this way for the case of home, which may have links already due to 
            // backdoor servers, depending on the return order of scanRecursive.
            NETWORK_LINKS.set(hostname, new Set([
                ...(NETWORK_LINKS.get(hostname) || []),
                ...links
            ]))
        }

        if (newServersCount > 0) {
            ns.tprintRaw(<BIOS_TermInfo>
                Added {newServersCount} server{pluralize(newServersCount)} to the network cache
            </BIOS_TermInfo>)
        }
    }

    async function mainLoop(): Promise<void> {
        while (BIOS_RUNNING) {

            NETWORK_findNewServers();
            NETWORK_findNewBackdoors();

            RAM_FindNewSources();
            RAM_UpdatePersonalServers();

            await ns.asleep(750)
        }
    }
    //#endregion

    BIOS_TMSC.color = ns.ui.getTheme().info
    BIOS_TMSW.color = ns.ui.getTheme().warning
    ns.tprintRaw(<BIOS_TermInfo>BIOS Initializing...</BIOS_TermInfo>)
    ns.disableLog("ALL")
    ns.atExit(cleanup, "bios_cleanup")
    ns.ramOverride(5)
    tryNuke(ns, "home")
    const BIOS_PORT = ns.getPortHandle(Ports.BIOS);
    let BIOS_RUNNING = true;

    ////////////////////////////////
    // Network init
    ns.tprintRaw(<BIOS_TermInfo>Initializing Network...</BIOS_TermInfo>)
    ALL_SERVERS.clear()
    NETWORK_LINKS.clear()
    NETWORK_LINKS.set("home", new Set())
    NETWORK_findNewServers()
    
    ////////////////////////////////
    // RAM init
    ns.tprintRaw(<BIOS_TermInfo>Initializing Networked RAM...</BIOS_TermInfo>)
    const startingRAMSourcesSize = RAM_SOURCES.length
    for (let i = 0; i < startingRAMSourcesSize; i++) {
        const staleSRU = RAM_SOURCES.pop()
        // GATE: skip any undefineds
        if (!staleSRU) { continue; }
        const currSSI = ALL_SERVERS.get(staleSRU.hostname)

        // GATE: This matches all servers that exist, that we can get admin access to
        // Admin access is determined by it being a personal server or having fewer ports than we have crackers
        if (!currSSI) { continue };
        if (!currSSI.personal && currSSI.neededOpenPorts > getCrackerCount()) { continue; }

        // Re-nuke the server, in case this is post-aug and we haven't yet gotten access.
        tryNuke(ns, currSSI.hostname)

        RAM_SOURCES.unshift(new ServerRamUsage(currSSI))
    }

    RAM_FindNewSources()
    RAM_RebuildUsage()

    ns.tprintRaw(<BIOS_TermInfo>Reserving core RAM...</BIOS_TermInfo>)
    const BIOS_PAGE = new Pagefile("bios/page", ns)
    BIOS_PAGE.read()
    let biosAlloc = BIOS_PAGE.getAll().find(a => a.pids.length == 0 && a.threads == 1) as ReservedRAM | null
    if (!biosAlloc) {
        biosAlloc = halloc(1, 16, "home");
        if (!biosAlloc) { throw new Error("Unable to restore or allocate BIOS reservation"); }
        BIOS_PAGE.push(biosAlloc)
    }
    biosAlloc.associate(ns.pid) // associate the allocation with this BIOS
    BIOS_PAGE.write()

    await mainLoop();
}
