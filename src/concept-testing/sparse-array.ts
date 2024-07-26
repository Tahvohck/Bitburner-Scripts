import { NS } from "@ns";

export async function main(ns:NS) {
    const size = 1.2e6
    const holes = 7.5e5
    const fills = 1e4
    const cycles = 20000
    const times:any[] = []
    const assignTimes:any[] = []
    let k = 0

    const summary = () => {
        let totalTime = times.reduce((p, v) => p + v, 0)
        let avg = ~~(totalTime / times.length)
        let max = times.sort((a, b) => b - a)[0]
        let min = times.sort((a, b) => a - b)[0]
        
        let aTotalTime = assignTimes.reduce((p, v) => p + v, 0)
        let aAvg = ~~(aTotalTime / assignTimes.length)
        let aMax = assignTimes.sort((a, b) => b - a)[0]
        let aMin = assignTimes.sort((a, b) => a - b)[0]
        let sos = assignTimes
            .map(x => (x - aAvg) ** 2)
            .reduce((p, v) => p + v, 0)
        let variance = sos / (assignTimes.length - 1)
        let sDev = Math.sqrt(variance)
        let withinSDev1 = assignTimes.reduce((p, v) => p += (Math.abs(v - aAvg) < sDev) ? 1 : 0, 0) / assignTimes.length
        let withinSDev2 = assignTimes.reduce((p, v) => p += (Math.abs(v - aAvg) < (sDev * 2)) ? 1 : 0, 0) / assignTimes.length
        let withinSDev3 = assignTimes.reduce((p, v) => p += (Math.abs(v - aAvg) < (sDev * 3)) ? 1 : 0, 0) / assignTimes.length
        
        const localeOpts: [Intl.LocalesArgument, Intl.NumberFormatOptions] = [
            undefined,
            {maximumFractionDigits: 1}
        ]
        ns.clearLog()
        ns.print(
            `Total ${(totalTime / 1000).toLocaleString(...localeOpts)} s\n`+
            `max ${max} ms / avg ${avg} ms / min ${min} ms\n` +
            `Assign ${(aTotalTime / 1000).toLocaleString(...localeOpts)} s\n`+
            `max ${aMax} ms / avg ${aAvg} ms / min ${aMin} ms\n` +
            `Variance: ${variance.toLocaleString(...localeOpts)} sDev ${sDev.toLocaleString(...localeOpts)}\n` +
            `1 std Dev: ${withinSDev1.toLocaleString(undefined, {style: "percent", maximumFractionDigits: 5, minimumFractionDigits: 5})}\n` +
            `2 std Dev: ${withinSDev2.toLocaleString(undefined, {style: "percent", maximumFractionDigits: 5, minimumFractionDigits: 5})}\n` +
            `3 std Dev: ${withinSDev3.toLocaleString(undefined, {style: "percent", maximumFractionDigits: 5, minimumFractionDigits: 5})}\n` +
            `Array Size: ${size.toLocaleString(...localeOpts)}\n`+
            `Hole count: ${holes.toLocaleString(...localeOpts)}\n`+
            `Fill count: ${fills.toLocaleString(...localeOpts)}\n`+
            `Cycles: ${k.toLocaleString(...localeOpts)} / ${cycles.toLocaleString(...localeOpts)}`)
    }

    ns.atExit(summary)

    ns.clearLog()
    ns.tail()
    for (k = 1; k < cycles; k++) {
        ns.disableLog("ALL")
        await ns.sleep(5)

        const deleteSet = new Set<number>()
        while (deleteSet.size < holes) {
            deleteSet.add(~~(Math.random() * size))
        }

        const start = Date.now()
        const test:any[] = Array(size).fill(0)
        const getID = () => {
            let potential = test.findIndex(x => x == undefined)
            return (potential >= 0) ? potential : test.length
        }

        for (const i of deleteSet) {
            delete test[i]
        }

        const startAssign = Date.now()
        for (let i = 0; i < fills; i++) {
            test[getID()] = 2
        }
        let end = Date.now()
        let total = end - start
        let assign = end - startAssign

        times.push(total)
        assignTimes.push(assign)
        summary()
        ns.print(`Setup took ${total - assign} ms `)
    }
}