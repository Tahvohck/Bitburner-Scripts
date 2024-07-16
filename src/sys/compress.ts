import { NS } from "@ns";

declare global {
    function nativeTimeout(h:TimerHandler, t: number | undefined, ...a:any[]): void
}

export async function main(ns:NS) {
    const nativeMatcher = /\[native code\]/
    const timeNormal = nativeMatcher.test(setTimeout.toString())

    switch (timeNormal) {
        case true: {
            ns.tprint("Compressing time!")
            globalThis.nativeTimeout = setTimeout;
            //@ts-expect-error Suppress whining about assigning to functions
            setTimeout = overwrittenTimeout
            break;
        }
        case false: {
            //@ts-expect-error Suppress whining about assigning to functions
            setTimeout = globalThis.nativeTimeout;
            ns.tprint("Time reverted.")
            break;
        }
    }
}

function overwrittenTimeout(h: TimerHandler, t: number | undefined, ...a:any[]) {
    const compressedTime = (!!t) ? Math.ceil(t / 100) : t
    globalThis.nativeTimeout(h, compressedTime, ...a)
}