import { NS } from "@ns";
import { sleep } from "/lib/std";

export async function main(ns:NS) {
    while(true) {
        await sleep(5000)
        while (ns.bladeburner.getSkillPoints() < ns.bladeburner.getSkillUpgradeCost("Overclock")) {
            ns.bladeburner.upgradeSkill("Overclock")
        }
    }
}