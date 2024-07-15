import { AutocompleteData, NS, ScriptArg } from "../../NetscriptDefinitions";
import { BIOSNetworkMessage, BIOSNetworkMessageType } from "/bios";
import { ALL_SERVERS } from "/sys/network";
import { Ports } from "/sys/ports";

const Options = {
    all: false,
    maxram: false
}

const FLAGS = [...Object.entries(Options)]
const ram_amounts = [...Array(20).keys()].map(k => 2 ** (k + 1))
const base_cost = 55_000
const cost_array = ram_amounts.map(n => n * base_cost)

export function autocomplete(data: AutocompleteData, args: ScriptArg[]) {
    data.flags(FLAGS)
    return [];
}

export async function main(ns:NS) {
    const options = ns.flags(FLAGS) as typeof Options;
    let servers = []
    let boughtServers = ns.getPurchasedServers()

    if (options.all || boughtServers.length == 1) {
        servers = boughtServers
    } else { 
        servers = [await ns.prompt("\n" + "Upgrade which server?".padEnd(35), {
            type: "select",
            choices: boughtServers
        }) as string]
        if (servers[0] == "") {
            ns.tprint("ERROR: No server picked. Aborting.")
            return;
        }
    }

    for (const server of servers) {
        const serverData = ALL_SERVERS.get(server)!
        let idxMinRam = ram_amounts.indexOf(serverData.maxRam) + 1
        let baseCost = cost_array[idxMinRam - 1]
        let playerMoney = ns.getServerMoneyAvailable("home")
        //@ts-ignore current compiler doesn't know about findLastIndex
        let idxMaxCost = cost_array.findLastIndex((x: number) => x < playerMoney)

        // get the subset of upgrads and costs that are possible for this server.
        // The cost to upgrade is (cost to purchase server with upgraded amount) - (cost to purchase this server)
        let viableUpgrades = ram_amounts.slice(idxMinRam, idxMaxCost + 1)
        let viableCosts = cost_array.slice(idxMinRam, idxMaxCost + 1).map(x => (x - baseCost))
        let choices: string[] = []
        viableUpgrades.forEach((v, i, a) => {
            choices.push(`${ns.formatRam(v)} for \$${ns.formatNumber(viableCosts[i])}`)
        })

        if (viableUpgrades.length == 0) {
            // no viable upgrades, skip
            ns.tprint("No upgrades for " + server)
            continue;
        }

        let idxChoice = 0;
        if (options.maxram || choices.length == 1) {
            idxChoice = idxMaxCost - idxMinRam;
        } else {
            let response = await ns.prompt("\n" + `Select upgrade for ${server}`.padEnd(35), {
                type: "select",
                choices: choices
            }) as string
            if (response == "") {
                ns.tprint(`Skipping upgrade for server ${server}`);
                continue;
            }
            idxChoice = choices.indexOf(response);
        }

        let confirmString = 
            "=".repeat(35) + "\n" +
            `Confirm upgrade for [${server}]?\n` +
            `RAM:  ${ns.formatRam(viableUpgrades[idxChoice])}\n` +
            `Cost: \$${ns.formatNumber(viableCosts[idxChoice])}`
        if (await ns.prompt(confirmString)) {
            ns.upgradePurchasedServer(server, viableUpgrades[idxChoice]);
            ns.writePort(Ports.BIOS, {
                type: BIOSNetworkMessageType.UPDATE_SERVER,
                message: server
            } as BIOSNetworkMessage)
        } else {
            ns.tprint("WARNING: Upgrade cancelled for " + server)
        }
    }
}