import { AutocompleteData, BasicHGWOptions, NS, ScriptArg } from "@ns";
import { sleep } from "/lib/std";

const Options = {
    threads: 1,
    target: "n00dles",
    delay: 0,
    action: Actions.NONE
}
export type Options = typeof Options
const FLAGS = [...Object.entries(Options)]

export function autocomplete(data: AutocompleteData, args: ScriptArg[]) {
    data.flags(FLAGS)
    return [];
}

export async function main(ns:NS) {
    const options = ns.flags(FLAGS) as typeof Options
    ns.ramOverride(RAMAmounts[options.action])
    const hgwOptions = {
        additionalMsec: options.delay
    } as BasicHGWOptions

    switch (options.action) {
        case Actions.HACK:
            await ns.hack(options.target, hgwOptions)
            break;
        case Actions.GROW:
            await ns.grow(options.target, hgwOptions)
            break;
        case Actions.WEAKEN:
            await ns.weaken(options.target, hgwOptions)
            break;
        default:
            return; // Return early if action is not set correctly
    }
}

export const enum Actions {
    NONE,
    HACK,
    GROW,
    WEAKEN,
}

export class RAMAmounts {
    static [Actions.NONE] = 1.6
    static [Actions.HACK] = 1.7
    static [Actions.GROW] = 1.75
    static [Actions.WEAKEN] = 1.75
}