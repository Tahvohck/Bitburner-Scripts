import { NS } from "@ns"
import { optionsObjectToArgArray } from "/lib/std"
import { Options as WorkerOptions } from "spicy-n00dles/worker"
import { HWGWCycle, SuppressionCycle } from "/spicy-n00dles/cycle-manager"

export async function main(ns:NS) {
    ns.tail()
    ns.clearLog()
    ns.disableLog("ALL")
    
    ns.print("INFO Test suppression cycle on strong server")
    ns.print(new SuppressionCycle(ns, "megacorp").prepare().details())
    
    ns.print("INFO Test suppression cycle on weak server")
    ns.print(new SuppressionCycle(ns, "n00dles").prepare().details())

    ns.print("INFO Test freshly created cycle")
    let cycle = new HWGWCycle(ns, "joesguns")
    ns.print(cycle.details())
    ns.print("INFO Test prepared cycle")
    cycle.prepare(0.1)
    ns.print(cycle.details())
    await ns.asleep(0)

    ns.print("INFO Test cycle with 50% consumption")
    ns.print(new HWGWCycle(ns, "joesguns").prepare(0.5).details())
    await ns.asleep(0)

    ns.print("INFO Test cycle with 90% consumption \n(close to threshold of issus)")
    ns.print(new HWGWCycle(ns, "joesguns").prepare(0.9).details())
    await ns.asleep(0)
    
    ns.print("INFO Test cycle with far too much consumption \n(should be reduced to slightly less than 100%)")
    ns.print(new HWGWCycle(ns, "joesguns").prepare(2).details())
    await ns.asleep(0)
    
    ns.print("INFO Test cycle barely any consumption (0.1%)")
    ns.print(new HWGWCycle(ns, "joesguns").prepare(0.001).details())
    await ns.asleep(0)

    ns.print("INFO Let's run an actual cycle")
    cycle = new HWGWCycle(ns, "megacorp").prepare(0.5)
    let waiter: Promise<void>;
    try{
        waiter = cycle.execute()
    } catch {
        cycle = new HWGWCycle(ns, "n00dles").prepare(0.1)
        waiter =  cycle.execute()
    }

    ns.print(cycle.details())
    await waiter;
    let stats = ns.getRunningScript()!
    
    ns.print(
        `Time:  ${ns.formatNumber(stats.onlineRunningTime + stats.offlineRunningTime, 2)} seconds\n` +
        `Money: \$${ns.formatNumber(stats.onlineMoneyMade + stats.offlineMoneyMade, 2)}\n` +
        `EXP:   ${ns.formatNumber(stats.onlineExpGained + stats.offlineExpGained)}`
    )

}