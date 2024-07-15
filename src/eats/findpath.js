import { getServerGraph } from "eats/utils.js";
import { scanRecursive } from "lib/scan";

/**
 * @param {{scripts: string[], servers: string[], texts: string[], flags: function}} data
 * @param {string[]} args
 */
export function autocomplete(data, args) {
    //data.flags(FLAGS);
    return [...data.servers]
}

/**
 * @param { Map<string, string> } cameFrom
 * @param { string } from
 * @param { string } to; 
 */
function reconstruct(cameFrom, from, to) {
    const path = [];

    let current = cameFrom.get(to);
    while (!!current) {
        if (current === from) return path.reverse();
        path.push(current);

        const next = cameFrom.get(current);

        if (next === current) throw new Error(`next === current; Aborting.`);

        current = next;
    }

    return null;
}

/**
 * @param {NS} ns
 * @param {string} from
 * @param {to} to
 */
export function findPath(ns, from, to) {
    const graph = scanRecursive(ns, from);

    const cameFrom = new Map();

    const queue = [from];

    while (queue.length > 0) {
        const node = queue.shift();
        if (node === to) return reconstruct(cameFrom, from, to);

        for (const neighbor of graph.get(node)) {
            if (cameFrom.has(neighbor)) continue;

            cameFrom.set(neighbor, node);
            queue.push(neighbor);
        }
    }

}

/** @param {NS} ns */
export async function main(ns) {
    const to = ns.args[0];
    if (!to || !ns.serverExists(to)) {
        ns.tprint(`ERROR No such server: ${to}`);
    }

    const from = ns.args[1] ?? ns.getHostname();
    if (!ns.serverExists(from)) {
        ns.tprint(`ERROR No such server: ${from}`);
    }

    const path = findPath(ns, from, to);

    if (!path) {
        ns.tprint(`Couldn't find path from ${from} to ${to}.`);
        return;
    }

    ns.tprint("Found path:");
    ns.tprint(`\x1b[1m${from}\x1b[0m => ` + path.join(" => ") + ` => \x1b[1m${to}\x1b[0m`);
    ns.tprint("Copied connection string to clipboard.");
    navigator.clipboard.writeText([...path, to].map(node => `connect ${node}`).join(";"));
}