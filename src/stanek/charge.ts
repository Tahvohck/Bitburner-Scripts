import { ActiveFragment, Fragment, NS } from "@ns";
import { free, halloc } from "/lib/ram";

export async function main(ns:NS) {
    const thisScript = ns.ps().find(x => x.pid == ns.pid)!
    const script_memory = halloc(thisScript.threads, 7.2, "home")!
    ns.atExit(() => free(script_memory))
    while (true) {
        const frags = ns.stanek.activeFragments() as CustomActiveFragment[]
        for (const frag of frags) {
            if (frag.type == 18) { continue }
                await ns.stanek.chargeFragment(frag.x, frag.y)
        }
        await ns.asleep(1)
    }
}

interface CustomActiveFragment extends ActiveFragment {
    type: number
}