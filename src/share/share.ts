import { malloc, free, Pagefile } from "/lib/ram";
import { NS } from "@ns";
import { AutocompleteData, ScriptArg } from "@ns";

const Options = {
    threads: 10_000
}

const FLAGS = [...Object.entries(Options)]

export function autocomplete(data: AutocompleteData, args: ScriptArg[]) {
    data.flags(FLAGS)
    return [];
}

export async function main(ns: NS) {
    const page = new Pagefile("share/page", ns)
    const shareworkerFile = "share/worker.js"

    ns.clearLog()
    ns.disableLog("ALL")

    let options = ns.flags(FLAGS) as typeof Options;
    if (options.threads < 1 || options.threads != Math.floor(options.threads)) {
        ns.tprint("ERROR: invalid threadcount. Must be an integer greater than zero.")
        return;
    }

    page.read()
    // Map the list of PIDs to true/false: true if the script is complete
    // Then flatten to a single boolean: true if all scripts are done
    // Stale blocks are those that are freed, or with no associated processes, or where all processes are finished.
    let staleMemory = page.clean((x) => {
        let allFinished = x.pids
            .map((x) => !ns.getRunningScript(x))
            .reduce((p, v) => p && v, true)
        return x.freed || x.pids.length == 0 || allFinished
    })
    // Free all unused memory (the bios probably already handled this for us)
    for (const mem of staleMemory) { free(mem) }
    page.write()

    let neededThreads = options.threads - page.getAll().reduce((p, v) => p + v.threads, 0)
    if (neededThreads < 1) {
        ns.tprint("WARNING: There are already enough threads running. Abort.")
        return;
    }
    ns.print(`Starting ${neededThreads} threads of share.`)

    let allocations = malloc(neededThreads, ns.getScriptRam(shareworkerFile))
    let processes: number[] = []

    for (const alloc of allocations) {
        if (alloc.host != "home") {
            ns.scp(shareworkerFile, alloc.host)
        }
        let pid = ns.exec(shareworkerFile, alloc.host, {
            threads: alloc.threads,
            temporary: true
        })
        page.push(alloc.associate(pid))
        processes.push(pid)
    }

    // continue running while any share scripts are running.
    while (processes.map(x => !!ns.getRunningScript(x)).reduce((p,v) => (p || v), false)) {
        await ns.asleep(1000)
    }

    for (const alloc of page.getAll()) {
        free(alloc)
    }
}