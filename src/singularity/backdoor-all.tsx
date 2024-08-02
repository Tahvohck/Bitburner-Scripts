import { NS } from "@ns";
import { NETWORK_LINKS } from "/sys/network";
const {React} = globalThis

export async function main(ns:NS) {
    ns.disableLog("ALL")
    ns.clearLog()
    ns.enableLog("singularity.installBackdoor")
    //ns.enableLog("singularity.connect")
    await recursiveBackdoor(ns, ns.getHostname(), new Set([ns.getHostname()]))
    ns.tprint("INFO: Backdoor session complete.")
}

async function recursiveBackdoor(ns:NS, root: string, alreadyVisited: Set<string>) {
    if (root == "w0r1d_d43m0n") {
        ns.tprintRaw("REFUSING TO BACKDOOR THE WORLD DAEMON AUTOMATICALLY")
        return
    }
    await ns.asleep(20)
    let server = ns.getServer(root)!
    if (
        !server.purchasedByPlayer &&
        !server.backdoorInstalled &&
        (server.requiredHackingSkill || 0) < ns.getHackingLevel()
    ) {
        let running = {value: true}
        ns.tprintRaw(<BackdoorEntry name={root} running={running} />)
        await ns.singularity.installBackdoor()
        ns.singularity.connect(root);   // User can connect to other servers during backdoor, reconnect just in case.
        running.value = false
    }
    
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
            ns.print(`${root.padEnd(19)}-> ${link}`)
            alreadyVisited.add(link)
            await recursiveBackdoor(ns, link, alreadyVisited)
        } catch {
        } finally {
            ns.print(`${root.padEnd(19)} <-`)
            ns.singularity.connect(root);
        }
    }
}

function BackdoorEntry({name, running}: {
    name:string, 
    running: {value: boolean}
}){
    const spinnerArray = ['/', ...Array(2).fill('-'), '\\', '|']
    const [spinnerIDX, updateSpinnerIDX] = React.useState(0)
    const cycleTime = 125
    const spin = () => {updateSpinnerIDX((spinnerIDX + 1) % spinnerArray.length)}

    if (running.value) { setTimeout(spin, 200); }
    const spinnerState = (running.value) ? spinnerArray[spinnerIDX] : "Complete"
    return <span>Backdooring {name}... {spinnerState}</span>
}