import { NS } from "@ns";
import { AutocompleteData, ScriptArg } from "@ns";

const Options = {
    revert: false
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
    const options = ns.flags(FLAGS) as typeof Options
    const timeNormal = nativeMatcher.test(setTimeout.toString())

    switch (options.revert) {
        case false: {
            if (timeNormal) {
                ns.tprint("Compressing time!")
                globalThis.nativeTimeout = setTimeout;
                //@ts-expect-error Suppress whining about assigning to functions
                setTimeout = overwrittenTimeout
            } else {
                ns.tprint("Time is already compressed")
            }
            break;
        }
        case true: {
            if (!timeNormal) {
                //@ts-expect-error Suppress whining about assigning to functions
                setTimeout = globalThis.nativeTimeout;
                ns.tprint("Time reverted.")
            } else {
                ns.tprint("Time is already normal")
            }
            break;
        }
    }
}

function overwrittenTimeout(h: TimerHandler, t: number | undefined, ...a:any[]) {
    const compressedTime = (!!t) ? Math.ceil(t / 100) : t
    globalThis.nativeTimeout(h, compressedTime, ...a)
}