import { NS } from "@ns";
import { optionsObjectToArgArray, sleep } from "/lib/std";
import { Options as CompressOptions } from "/sys/compress";
import { BIOS_READY } from "/bios_v1.1";

export async function main(ns:NS) {
    ns.disableLog("sleep")
    let runningScripts: number[] = []
    async function waitForDone () {
        await sleep(0)
        ns.print(runningScripts)
        while(runningScripts.length > 0 && runningScripts.some(x => ns.getRunningScript(x))) {
            await ns.sleep(1)
        }
    }

    function allCrackers(): boolean {
        return [
            ns.fileExists("BruteSSH.exe"),
            ns.fileExists("FTPCrack.exe"),
            ns.fileExists("RelaySMTP.exe"),
            ns.fileExists("HTTPWorm.exe"),
            ns.fileExists("SQLInject.exe"),
        ].every(x => x)
    }

    ns.kill("bios_v1.1.js")
    ns.run("bios_v1.1.js")
    while(!BIOS_READY()) {
        await ns.asleep(10)
    }
    ns.singularity.purchaseTor()

    // Get some hacking levels
    const compressOptions = optionsObjectToArgArray({noRevert: true} as typeof CompressOptions)
    runningScripts.push(ns.run("/sys/compress.js", 1, ...compressOptions))
    runningScripts.push(ns.run("/n00dles/deploy.js"))
    await waitForDone()

    while(!allCrackers()) {
        let pid = ns.run("/n00dles/deploy.js")
        runningScripts.push(pid)
        await sleep(500)
        ns.singularity.purchaseProgram("BruteSSH.exe")
        ns.singularity.purchaseProgram("FTPCrack.exe")
        ns.singularity.purchaseProgram("RelaySMTP.exe")
        ns.singularity.purchaseProgram("HTTPWorm.exe")
        ns.singularity.purchaseProgram("SQLInject.exe")
    }
    for (const pid of runningScripts) {
        ns.closeTail(pid)
    }

    // Do a backdoor sweep
    runningScripts.push(ns.run("/singularity/backdoor-all.js"))
    await waitForDone()

    // Join all available factions (again)
    for (const faction of ns.singularity.checkFactionInvitations()) {
        ns.singularity.joinFaction(faction)
    }

    // Keep running until we hit the needed level
    if (ns.getPlayer().skills.intelligence < 121) {
        ns.singularity.softReset(ns.getScriptName())
    } else {
        // Decompress time
        ns.run("/sys/compress.js")
        ns.tprint("Done power leveling")
        ns.singularity.softReset("")
    }
}