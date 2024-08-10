import { AutocompleteData, NS, ScriptArg } from "@ns";
import { getFreeThreads } from "lib/ram";
import { RAM_SOURCES } from "sys/memory";
const {React} = globalThis;

const Options = {
    all: false,
    printToLog: false
}
let FLAGS = [...Object.entries(Options)]
let infoLight: string;
let infoText: string;
let infoDark: string;

export function autocomplete(data: AutocompleteData, args: ScriptArg[]) {
    data.flags(FLAGS)
    return [];
}

function Slider({value}: {value: number}) {
    const sliderBoxStyle: React.CSSProperties = {
        width: "20em",
        display: "inline-flex",
        backgroundColor: infoText,
        position: "relative"
    }
    const sliderStyle: React.CSSProperties = {
        flexGrow: `${value}`,
        display: "inline-block"
    }
    const textStyle: React.CSSProperties = {
        position: "absolute",
        right: "1ch",
        color: infoDark,
    }
    const valueText = value.toLocaleString(undefined, {maximumFractionDigits: 2, minimumFractionDigits: 2})
    return <span style={sliderBoxStyle}>
        <span style={{...sliderStyle, backgroundColor: infoLight}}>{"\u200B"}</span>
        <span style={{...sliderStyle, flexGrow: `${100 - value}`}}>{"\u200B"}</span>
        <span style={textStyle}>{valueText}%</span>
    </span>
}

export async function main(ns:NS) {
    let options = ns.flags(FLAGS) as typeof Options
    infoLight = ns.ui.getTheme().infolight
    infoText = ns.ui.getTheme().info
    infoDark = ns.ui.getTheme().infodark

    let sortedSources = RAM_SOURCES.sort((a, b) => b.max - a.max)
    let usage = sortedSources
        .filter((x) => x.used > 0 || options.all)
        .map(x => {
            const percentageUsed = x.used / x.max * 100
            return <li>{x.toString()} <Slider value={percentageUsed}/></li>
        })
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
    let printfunc: typeof ns.printRaw;
    if (options.printToLog) {
        ns.tail()
        ns.resizeTail(700, 400)
        printfunc = ns.printRaw
    } else {
        printfunc = ns.tprintRaw
    }
    printfunc(
        <div style={style}>
            <ul>{usage}</ul>
            <div>Hiding {unused} servers with no usage</div>
            <span>Estimated total threads: {freeThreads.toLocaleString()}</span>
        </div>
    )
}