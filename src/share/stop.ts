import { NS } from "../../NetscriptDefinitions";
import { Pagefile, free } from "/lib/ram";

export async function main(ns:NS) {
    let page = new Pagefile("share/page", ns)
    page.read()
    for (const block of page.getAll()) {
        free(block)
        for (const pid of block.pids) {
            ns.kill(pid)
        }
    }
    page.clear()
}