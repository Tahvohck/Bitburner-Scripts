import { NS } from "@ns";
import { NETWORK_LINKS } from "/sys/network";
export async function main(ns:NS) {
    ns.disableLog("ALL")
    ns.clearLog()
    ns.enableLog("singularity.installBackdoor")
    ns.enableLog("singularity.connect")
    await recursiveBackdoor(ns, ns.getHostname(), new Set([ns.getHostname()]))
    ns.tprint("Backdoor session complete.")
}

async function recursiveBackdoor(ns:NS, root: string, alreadyVisited: Set<string>) {
    
    for (const link of NETWORK_LINKS.get(root)!) {
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
            ns.print(`${root} -> ${link}`)
            if (!server.backdoorInstalled && (server.requiredHackingSkill || 0) < ns.getHackingLevel()) {
                ns.tprint(`Connected to ${link}, backdooring`)
                await ns.singularity.installBackdoor()
                ns.tprint("Backdoor complete.")
            }
            await ns.asleep(20)
            alreadyVisited.add(link)
            await recursiveBackdoor(ns, link, alreadyVisited)
        } catch {
        } finally {
            ns.print(`${root} <-`)
            ns.singularity.connect(root);
        }
    }
}