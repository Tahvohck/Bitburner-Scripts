import { NS } from "@ns";

import { AutocompleteData, ScriptArg } from "@ns";

export const Options = {
    noRevert: false
}
const FLAGS = [...Object.entries(Options)]

export function autocomplete(data: AutocompleteData, args: ScriptArg[]) {
    data.flags(FLAGS)
    return [];
}

declare global {
    function nativeTimeout(h:TimerHandler, t: number | undefined, ...a:any[]): void
}

export async function main(ns:NS) {
    const nativeMatcher = /\[native code\]/
    const timeNormal = nativeMatcher.test(setTimeout.toString())
    const options = ns.flags(FLAGS) as typeof Options

    switch (timeNormal) {
        case true: {
            ns.tprint("Compressing time!")
            globalThis.nativeTimeout = setTimeout;
            //@ts-expect-error Suppress whining about assigning to functions
            setTimeout = overwrittenTimeout
            break;
        }
        case false: {
            if (options.noRevert) { break; }
            //@ts-expect-error Suppress whining about assigning to functions
            setTimeout = globalThis.nativeTimeout ?? setTimeout;
            ns.tprint("Time reverted.")
            break;
        }
    }
}

function overwrittenTimeout(h: TimerHandler, t: number | undefined, ...a:any[]) {
    const compressedTime = (!!t) ? Math.ceil(t / 100) : t
    globalThis.nativeTimeout(h, compressedTime, ...a)
}