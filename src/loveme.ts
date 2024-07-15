import {NS} from '@ns';
export async function main(ns: NS) {
    ns.tprintRaw(`Your heart is this broken: ${ns.formatNumber(ns.heart.break(), 1)}`)
}