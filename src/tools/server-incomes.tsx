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
            <td style={cellStyle}>{data.moneyHackRateStr} sec</td>
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
        .sort((a, b) => { return (
            1_000_000 / (a.moneyMax / ns.getHackTime(a.hostname)) -
            1_000_000 / (b.moneyMax / ns.getHackTime(b.hostname))
        )})
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
    const hackTime = ns.getHackTime(hostname) / 1000
    const hackAmountNow = ns.getServerMoneyAvailable(hostname) * 0.2
    const moneyPerHackStr = ns.formatNumber(hackAmountNow).padStart(8)
    const moneyHackRateStr = ns.formatNumber(1e6 / (hackAmountNow / hackTime),1).padStart(8)
    const moneyMaxStr = ns.formatNumber(moneyMax)
    return {
        hostname,
        moneyHackRateStr,
        moneyMaxStr,
        moneyPerHackStr,
        hackRequirement,
    } as TableRowData
}