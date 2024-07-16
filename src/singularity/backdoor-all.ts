import { NS } from "@ns";
import { NETWORK_LINKS } from "/sys/network";
export async function main(ns:NS) {
    ns.disableLog("ALL")
    ns.clearLog()
    ns.enableLog("singularity.installBackdoor")
    ns.enableLog("singularity.connect")
    await recursiveBackdoor(ns, new Set([ns.singularity.getCurrentServer()]))
}

async function recursiveBackdoor(ns:NS, alreadyVisited: Set<string>) {
    const currentServer = ns.singularity.getCurrentServer()
    
    for (const link of NETWORK_LINKS.get(currentServer)!) {
        if (alreadyVisited.has(link)) continue
        try { ns.brutessh (link) } catch {}
        try { ns.ftpcrack (link) } catch {}
        try { ns.relaysmtp(link) } catch {}
        try { ns.httpworm (link) } catch {}
        try { ns.sqlinject(link) } catch {}
        try { 
            ns.nuke(link);
            ns.scp([ns.getScriptName(), "sys/network.js"], link)
            ns.singularity.connect(link)
            let server = ns.getServer(link)!
            if (!server.backdoorInstalled && (server.requiredHackingSkill || 0) < ns.getHackingLevel()) {
                ns.tprint(`Connected to ${link}, backdooring`)
                await ns.singularity.installBackdoor()
                ns.tprint("Backdoor complete.")
            }
            alreadyVisited.add(link)
            ns.print(`${currentServer} -> ${link}`)
            await recursiveBackdoor(ns, alreadyVisited)
        } catch {
        } finally {
            ns.singularity.connect(currentServer);
        }
    }
}