/** @param {NS} ns **/
export async function main(ns) {
    const args = ns.flags([["help", false]]);
    if (args.help || args._.length < 4) {
        ns.tprint("This script buys and upgrades HackNet nodes.");
        ns.tprint("The first argument is the number of extra nodes to buy. Input 0 if you do not wish to buy new nodes.");
        ns.tprint(`Usage: run ${ns.getScriptName()} nodes level RAM cores`);
        ns.tprint("Example:");
        ns.tprint(`> run ${ns.getScriptName()} 10 100 32 10`);
        return;
    }

    const nodes = args._[0];
    const lvl = args._[1];
    const ram = args._[2];
    const cpu = args._[3];
    const cnodes = ns.hacknet.numNodes();
    var tnodes = cnodes + nodes;

    if (lvl > 200 || lvl < 1){
        ns.tprint("Invalid node level! Must be between 1 and 200!");
        ns.tprint("Try again with a valid number!");
        return;
    }
    const validram = [1, 2, 4, 8, 16, 32, 64];
    if (!(validram.includes(ram))){
        ns.tprint("Invalid RAM amount! Must be strictly either 1, 2, 4, 8, 16, 32, 64!");
        ns.tprint("Try again with a valid number!");
        return;
    }
    if (cpu > 16 || cpu < 1){
        ns.tprint("Invalid core amount! Must be between 1 and 16!");
        ns.tprint("Try again with a valid number!");
        return;
    }

    if (tnodes > ns.hacknet.maxNumNodes()) {
        ns.tprint("Maximum number of nodes reached!");
        tnodes = ns.hacknet.maxNumNodes();        
    }
    ns.tprint("Puchasing " + nodes + " new nodes")

    while (ns.hacknet.numNodes() < tnodes) {
        let cost = ns.hacknet.getPurchaseNodeCost();
            while (ns.getServerMoneyAvailable("home") < cost) {
                ns.print("Need $" + cost + " . Have $" + ns.getServerMoneyAvailable("home"));
                await ns.sleep(3000);
            }
            let res = ns.hacknet.purchaseNode();
            ns.toast("Purchased HackNet node with index " + res);       
    }

    for (let i = 0; i < tnodes; i++) {
        if (ns.hacknet.getNodeStats(i).level == 200){
            continue;
        }
        while (ns.hacknet.getNodeStats(i).level < lvl) {
            let cost = ns.hacknet.getLevelUpgradeCost(i, 1);
            while (ns.getServerMoneyAvailable("home") < cost) {
                ns.print("Need $" + cost + " . Have $" + ns.getServerMoneyAvailable("home"));
                await ns.sleep(3000);
            }
                let res = ns.hacknet.upgradeLevel(i, 1);
        }

    }
    ns.tprint("All nodes upgraded to level " + lvl);

    for (let i = 0; i < tnodes; i++) {
        if (ns.hacknet.getNodeStats(i).ram == 64){
            continue;
        }
        while (ns.hacknet.getNodeStats(i).ram < ram) {
            let cost = ns.hacknet.getRamUpgradeCost(i, 1);
            while (ns.getServerMoneyAvailable("home") < cost) {
                ns.print("Need $" + cost + " . Have $" + ns.getServerMoneyAvailable("home"));
                await ns.sleep(3000);
            }
            let res = ns.hacknet.upgradeRam(i, 1);
        }
    }
    ns.tprint("All nodes upgraded to " + ram + "Gb RAM");

    for (let i = 0; i < tnodes; i++) {
        if (ns.hacknet.getNodeStats(i).cores == 16){
            continue;
        }
        while (ns.hacknet.getNodeStats(i).cores < cpu) {
            let cost = ns.hacknet.getCoreUpgradeCost(i, 1);
            while (ns.getServerMoneyAvailable("home") < cost) {
                ns.print("Need $" + cost + " . Have $" + ns.getServerMoneyAvailable("home"));
                await ns.sleep(3000);
            }
            let res = ns.hacknet.upgradeCore(i, 1);
        }
    }
    ns.tprint("All nodes upgraded to " + cpu + " cores");
    ns.tprint("HackNet upgrade finished!");
}