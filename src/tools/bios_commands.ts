import { AutocompleteData, NS, ScriptArg } from '@ns'
import { BIOSNetworkMessage, BIOSNetworkMessageType } from '/bios'
import { Ports } from '/sys/ports'

const Options = {
    KILL_ORPHAN_ALLOCATIONS: false,
    RESET_ALLOCATION_AMOUNT: false,
    ECHO: "",
}

let FLAGS = [...Object.entries(Options)]

export function autocomplete (data: AutocompleteData, args: ScriptArg[]) {
    data.flags(FLAGS)
    return [];
}

export async function main(ns:NS) {
    let options = ns.flags(FLAGS) as typeof Options;
    let port = ns.getPortHandle(Ports.BIOS)
    if (options.KILL_ORPHAN_ALLOCATIONS) {
        port.write({
            type: BIOSNetworkMessageType.KILL_ORPHAN_ALLOCATIONS
        } as BIOSNetworkMessage)
    }
    if (options.RESET_ALLOCATION_AMOUNT) {
        port.write({
            type: BIOSNetworkMessageType.RESET_ALLOCATION_AMOUNT
        } as BIOSNetworkMessage)
    }
    if (options.ECHO != "") {
        port.write({
            type: BIOSNetworkMessageType.ECHO,
            message: options.ECHO
        } as BIOSNetworkMessage)
    }
}