import { AutocompleteData, NS, ScriptArg } from "../../NetscriptDefinitions";
import { BIOSNetworkMessage, BIOSNetworkMessageType } from "/bios";
import { Ports } from "/sys/ports";

const Options = {
    noautoname: false,
    maxram: false
}

const FLAGS = [...Object.entries(Options)]
const ram_amounts = [...Array(20).keys()].map(k => 2 ** (k + 1))

export function autocomplete(data: AutocompleteData, args: ScriptArg[]) {
    data.flags(FLAGS)
    return [];
}

export async function main(ns:NS) {
    const cost_array = ram_amounts.map(n => ns.getPurchasedServerCost(n))
    const options = ns.flags(FLAGS) as typeof Options;
    const ram_strings = ram_amounts.map(n => ns.formatRam(n, 0))
    const cost_strings = cost_array.map(n => ns.formatNumber(n))
    let name;
    if (options.noautoname) {
        name = await ns.prompt("=".repeat(35) + "\nServer name?", {type: "text"});
    }
    name = `${name || "chef"}-${ns.getPurchasedServers().length}`

    //@ts-ignore linter can't realize findLastIndex exists
    let maxindex = cost_array.findLastIndex(
        (x: number) => x < ns.getServerMoneyAvailable("home")
    );

    let ramChoice: string;
    if (options.maxram) {
        ramChoice = ram_strings[maxindex]
    } else {
        ramChoice = await ns.prompt("=".repeat(35) + "\nHow much RAM?", {
            type: "select",
            choices: ram_strings.slice(0, maxindex + 1)
        }) as string;
        if (ramChoice == "") {
            ns.tprint("WARNING: Aborting purchase")
            return;
        }
    }

    let idx = ram_strings.indexOf(ramChoice);
    let confirmString = 
        "=".repeat(35) + "\n" +
        `Confirm purchase of [${name}]?\n` +
        `Cost: ${cost_strings[idx]}\n` +
        `RAM:  ${ram_strings[idx]}` 
    if (await ns.prompt(confirmString)) {
        ns.purchaseServer(name, ram_amounts[idx]);
        ns.tprint(`Purchase server ${name}: ${ramChoice} @ ${cost_strings[ram_strings.indexOf(ramChoice)]}`)
        ns.writePort(Ports.BIOS, {
            type: BIOSNetworkMessageType.UPDATE_SERVER,
            message: name
        } as BIOSNetworkMessage)
    }
}