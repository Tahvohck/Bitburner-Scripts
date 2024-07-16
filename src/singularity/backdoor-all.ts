import { NS } from "@ns";
import { NETWORK_LINKS } from "/sys/network";
export async function main(ns:NS) {
    ns.disableLog("ALL")
    ns.clearLog()
    ns.enableLog("singularity.installBackdoor")
    ns.enableLog("singularity.connect")
    await recursiveBackdoor(ns, [ns.singularity.getCurrentServer()])
}

async function recursiveBackdoor(ns:NS, alreadyVisited: string[]) {
    const currentServer = ns.singularity.getCurrentServer()

    for (const link of NETWORK_LINKS.get(currentServer)!) {
        if (alreadyVisited.includes(link)) continue;
        if (ns.getServer(link).backdoorInstalled) {
            alreadyVisited.push(link)
            ns.print("No need to backdoor " + link)
            continue
        }
        try { ns.brutessh (link) } catch {}
        try { ns.ftpcrack (link) } catch {}
        try { ns.relaysmtp(link) } catch {}
        try { ns.httpworm (link) } catch {}
        try { ns.sqlinject(link) } catch {}
        try { 
            ns.nuke(link);
            ns.scp([ns.getScriptName(), "sys/network.js"], link)
            ns.singularity.connect(link)
            ns.tprint(`Connected to ${link}, backdooring`)
            await ns.singularity.installBackdoor()
            ns.tprint("Backdoor complete.")
            alreadyVisited.push(link)
            ns.print(`${currentServer} -> ${link}`)
            await recursiveBackdoor(ns, alreadyVisited)
        } catch {
        } finally {
            ns.singularity.connect(currentServer);
        }
    }
}