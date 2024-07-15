import type { NS } from '@ns';
import type { ServerRamUsage, ReservedRAM } from '/lib/ram';


export const RAM_SOURCES: ServerRamUsage[] = [];
/** Sparse Array of all allocations. */
export const RAM_ALLOCATIONS: (ReservedRAM | undefined)[] = [];

export function getSource(hostname: string) {
    return RAM_SOURCES.find((source) => source?.hostname == hostname)
}

export async function main(ns: NS) {
    for (const source of RAM_SOURCES) {
        if (RAM_SOURCES.filter(x => x.hostname == source.hostname).length > 1) {
            //@ts-ignore
            delete RAM_SOURCES[RAM_SOURCES.findLastIndex(x => x.hostname == source.hostname)]
        }
    }
    console.log({
        RAM_SOURCES,
        RAM_ALLOCATIONS
    })
}