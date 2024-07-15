import { RAM_SOURCES } from "sys/memory";
import { AutocompleteData, NS, ScriptArg } from "@ns";
import { free, getFreeThreads } from "lib/ram";
const {React} = globalThis;

const Options = {
    all: false
}
let FLAGS = [...Object.entries(Options)]

export function autocomplete(data: AutocompleteData, args: ScriptArg[]) {
    data.flags(FLAGS)
    return [];
}

export async function main(ns:NS) {
    let options = ns.flags(FLAGS) as typeof Options

    let sortedSources = RAM_SOURCES.sort((a, b) => b.max - a.max)
    let usage = sortedSources
        .filter((x) => x.used > 0 || options.all)
        .map(x => <li>{x.toString()}</li>)
    let unused = sortedSources
        .filter((x) => x.used == 0 && !options.all)
        .length
    let style: React.CSSProperties = {
        font: "0.9rem Input",
        color: ns.ui.getTheme().infolight
    }
    let freeThreads;
    try {
        freeThreads = getFreeThreads()
    } catch {
        ns.print("ERRROR: Couldn't get free threads")
        freeThreads = -1
    }
    ns.tprintRaw(
        <div style={style}>
            <ul>{usage}</ul>
            <div>Hiding {unused} servers with no usage</div>
            <span>Estimated total threads: {freeThreads.toLocaleString()}</span>
        </div>
    )
}