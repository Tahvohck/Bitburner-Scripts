let FLAGS = [
    ["nodes", 1],
    ["level", 10],
    ["ram", 1],
    ["cores", 1]
]

const validram = [1, 2, 4, 8, 16, 32, 64];

/**
 * @param {{scripts: string[], servers: string[], texts: string[], flags: function}} data
 * @param {string[]} args
 */
export function autocomplete(data, args) {
    /** @type {string} */
    let previousflag = args.at(-1)
    switch (previousflag) {
        case "--cores": return [...new Array(16).keys()]
        case "--ram": return validram
        default: {
            data.flags(FLAGS);
            return []
        }
    }
}

/** @param {NS} ns */
export async function main(ns) {
    ns.disableLog("ALL")
    let options = ns.flags(FLAGS)
    if (!validram.includes(options.ram)) {
        ns.tprint("ERROR: RAM must be a power of 2")
        return;
    }

    ns.print(JSON.stringify(options));

    let upgradesComplete = false;

    while (!upgradesComplete) {
        await ns.sleep(3);
        upgradesComplete = true;
        let cheapestCost;
        let upgradeType;
        if (ns.hacknet.numNodes() < options.nodes) {
            cheapestCost = ns.hacknet.getPurchaseNodeCost();
            upgradeType = "NEW_NODE";
            upgradesComplete = false;
        } else {
            cheapestCost = Number.MAX_SAFE_INTEGER;
            upgradeType = "NO_UPGRADE"
        }
        let upgradeIndex = 0;
        for (let i = 0; i < ns.hacknet.numNodes() && i < options.nodes; i++) {
            let hackNode = ns.hacknet.getNodeStats(i);
            let upgradeLVL = 0, upgradeRAM = 0, upgradeCPU = 0;

            if (hackNode.level < options.level) {
                upgradeLVL = ns.hacknet.getLevelUpgradeCost(i);
                if (upgradeLVL < cheapestCost) {
                    upgradeIndex = i;
                    cheapestCost = upgradeLVL;
                    upgradeType = "LEVEL";
                    upgradesComplete = false;
                }
            }
            if (hackNode.ram < options.ram){
                upgradeRAM = ns.hacknet.getRamUpgradeCost(i);
                if (upgradeRAM < cheapestCost) {
                    upgradeIndex = i;
                    cheapestCost = upgradeRAM;
                    upgradeType = "RAM";
                    upgradesComplete = false;
                }
            }
            if (hackNode.cores < options.cores) {
                upgradeCPU = ns.hacknet.getCoreUpgradeCost(i);
                if (upgradeCPU < cheapestCost) {
                    upgradeIndex = i;
                    cheapestCost = upgradeCPU;
                    upgradeType = "CORE";
                    upgradesComplete = false;
                }
            }
            /**
            ns.print(
                `${upgradeIndex} - ` + 
                `L${ns.formatNumber(upgradeLVL,1)} ` +
                `R${ns.formatNumber(upgradeRAM,1)} ` +
                `C${ns.formatNumber(upgradeLVL,1)}`
            );
            /**/
        }

        if (upgradesComplete) {
            continue;
        }

        let cost = ns.formatNumber(cheapestCost);
        if (cheapestCost > ns.getServerMoneyAvailable("home")) {
            ns.print(`Not enough money to buy: ${upgradeType} for \$${cost} [${upgradeIndex}]`);
            await ns.sleep(10_000);
            continue;
        } else {
            ns.print(`${upgradeType} for \$${cost} [${upgradeIndex}]`);
        }

        //await ns.sleep(1000); continue;
        switch (upgradeType) {
            case "NEW_NODE": {
                ns.hacknet.purchaseNode();
                break;
            }
            case "LEVEL": {
                ns.hacknet.upgradeLevel(upgradeIndex);
                break;
            }
            case "RAM": {
                ns.hacknet.upgradeRam(upgradeIndex);
                break;
            }
            case "CORE": {
                ns.hacknet.upgradeCore(upgradeIndex);
                break;
            }
            default: {
                await ns.sleep(25);
            }
        }
    }

    ns.toast("Finished upgrading hacknet.","success",10_000)
}