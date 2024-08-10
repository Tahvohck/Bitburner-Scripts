import { NS } from "@ns";
import { ALL_SERVERS } from "/sys/network";
import { StaticServerInfo } from "/lib/network";
const {React} = globalThis

const cellStyle: React.CSSProperties = {
    textAlign: "right",
    paddingLeft: "1ch",
    paddingRight: "1ch",
}

interface TableRowData {
    hostname: string,
    moneyPerHackStr: string,
    moneyHackRateStr: string,
    moneyMaxStr: string,
    hackRequirement: number,
}
function TableRow(data: TableRowData) {
    return (
        <tr>
            <td>{data.hostname}</td>
            <td style={cellStyle}>{data.moneyPerHackStr}</td>
            <td style={cellStyle}>{data.moneyHackRateStr}</td>
            <td style={cellStyle}>{data.moneyMaxStr}</td>
            <td style={cellStyle}>{data.hackRequirement.toLocaleString()}</td>
        </tr>
    )
}

function TableHeader() {
    return (
        <tr>
            <th style={{textAlign:"left"}}>Server Name</th>
            <th style={cellStyle}>Hack Gain</th>
            <th style={cellStyle}>Time/Million</th>
            <th style={cellStyle}>Max Money</th>
            <th style={cellStyle}>Hack Level</th>
        </tr>
    )
}

export async function main(ns:NS) {
    ns.disableLog("ALL")
    let incomeSources = [...ALL_SERVERS.values()]
        .filter(s => s.hackRequirement < ns.getHackingLevel() && s.moneyMax > 0)
        .sort((a, b) => { 
            const aRate = ns.getServerMoneyAvailable(a.hostname) / ns.getHackTime(a.hostname)
            const bRate = ns.getServerMoneyAvailable(b.hostname) / ns.getHackTime(b.hostname)
            return bRate - aRate
        })
    const incomeData = incomeSources
        .map((s) => <TableRow {...parseRelevantData(ns, s)} />)
    let table = <table>
        <TableHeader />
        {incomeData}
    </table>
    ns.tail()
    ns.resizeTail(640,190)
    ns.clearLog()
    ns.printRaw(table)
}

function parseRelevantData(ns: NS, ssi: StaticServerInfo): TableRowData {
    const {hostname, moneyMax, hackRequirement } = ssi
    const hackTime = ns.getHackTime(hostname)
    const hackAmountNow = ns.getServerMoneyAvailable(hostname) * 0.2
    const moneyPerHackStr = ns.formatNumber(hackAmountNow).padStart(8)
    const moneyHackRateStr = convertMsToReadable(1e6 / (hackAmountNow / hackTime)).padStart(8)
    const moneyMaxStr = ns.formatNumber(moneyMax)
    return {
        hostname,
        moneyHackRateStr,
        moneyMaxStr,
        moneyPerHackStr,
        hackRequirement,
    } as TableRowData
}

function convertMsToReadable(ms: number): string {
    const threshMs = 1500
    const threshS = 300
    const threshMin = 100
    const threshHr = 96
    const threshDay = 28
    ms = Math.floor(ms)
    if (ms < threshMs) {
        return ms.toLocaleString() + " ms"
    }
    const sec = Math.floor(ms/ 100) / 10
    if (sec < threshS) {
        return sec.toLocaleString() + " sec"
    }
    const min = Math.floor(sec / 6) / 10
    if (min < threshMin) {
        return min.toLocaleString() + " min"
    }
    const hour = Math.floor(min / 6) / 10
    if (hour < threshHr) {
        return hour.toLocaleString() + " hr"
    }
    const day = Math.floor(hour / 2.4) / 10
    if (day < threshDay) {
        return day.toLocaleString() + " day"
    }
    const week = Math.floor(day / 0.7) / 10
    return week.toLocaleString() + " week"
}