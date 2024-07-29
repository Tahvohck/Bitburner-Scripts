import { NS } from "@ns";

export async function main(ns:NS) {
    try {
        ns.singularity.softReset("bios_v1.1.js")
    } catch {
        ns.tprint("ERROR: Could not soft reset. You probably don't have singularity access")
        ns.tprint("ERROR: Or you might not have enough free RAM to run this script")
    }
}