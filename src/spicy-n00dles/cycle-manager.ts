import type { NS, RunOptions } from "@ns";
import { free, malloc, Pagefile, type ReservedRAM } from "/lib/ram";
import { Actions, RAMAmounts, Options as WorkerOptions } from "spicy-n00dles/worker"
import { Base64, optionsObjectToArgArray, sleep } from "/lib/std";
import { ALL_SERVERS } from "/sys/network";

const workerFile = "spicy-n00dles/worker.js"
const requiredWorkerFiles = [
    workerFile, "/lib/std.js"
]
const secChangeHack =   0.002;
const secChangeWeaken = 0.05;

/** Base class for a unified cycle that has a way to prepare and execute without needing user setup. */
abstract class Cycle {
    delays = new HWGWData<number>(0)
    threads = new HWGWData<number>(0)
    protected allocations: ReservedRAM[] = []

    protected cycleID: string;
    ready = false
    totalTime = 0
    protected expectedPayout = 0
    protected valid = true
    protected prefix = "base"

    /**
     * @param ns Internal copy of netscript libaray
     * @param target Server to cycle on
     * @param tolerance Time between the completion of each component (ms)
     * @param extraDelay Time to wait before starting the cycle (ms)
     */
    constructor(
        protected readonly ns: NS,
        readonly target: string,
        protected readonly tolerance: number = 100,
        protected readonly extraDelay: number = 0,
        protected readonly page: Pagefile | undefined = undefined
    ) {
        // Set up cycle ID string. Has the current ms as a 64-radix string to semi-uniquely identify it.
        // Add additional uniqueness with a 64-radix generated from a random number up to 0xFFF_FFF (encoded ////)
        this.cycleID = `${this.ns.pid}_${Base64.fromNumber(Date.now())}_`
        this.cycleID += Base64.fromNumber(Math.random() * 0xFFF_FFF).padStart(4, "0")
        this.cycleID += `_${this.target}`
    }

    /** Prepare the cycle for execution
     * @returns the current object, to allow a new().prepare().execute() chain if desired.
     */
    abstract prepare(): Cycle;

    /**
     * Internal code used to execute, defined by the child
     */
    protected abstract executeLogic(): any

    /** Execute the cycle
     * @returns An awaitable promise
     */
    async execute(): Promise<any> {
        this.readyGate()
        this.executeLogic()
        const associatedPIDs: Set<number> = new Set(this.allocations.flatMap(x => x.pids))
        let runningPIDs;
        while(this.valid && [...associatedPIDs].some(x => this.ns.isRunning(x))) {
            await sleep(this.tolerance)
        } 
        this.cleanup()
    }
    
    abstract priorityScore(): number
    /**
     * @param [moneyNormalizer=1] A value to normalize the money across multiple cycles, probably the max income value 
     * @returns Income rate in money per millisecond-thread
    */

    getExpectedPayout() {
        return this.expectedPayout
    }

    /**
     * Deploys to the worker server.
     * @param totalThreads Total number of threads needed
     * @param execOptions script run options (see ns.exec)
     * @param scriptOptions Script flags object from the worker
     * @throws An error if not enough threads can be reserved.
     */
    protected deploy(totalThreads: number, execOptions: RunOptions, scriptOptions: WorkerOptions) {
        const ns = this.ns;
        const allocations = malloc(totalThreads, RAMAmounts[scriptOptions.action])
        if (allocations.reduce((p,v) => p += v.threads, 0) < totalThreads) {
            this.cleanup(true)
            throw new Error(`Unable to reserve enough threads to run cycle on ${this.target}`)
        }
        for (const alloc of allocations) {
            if (alloc.host != "home") { ns.scp(requiredWorkerFiles, alloc.host) }
            
            execOptions.threads = alloc.threads;
            execOptions.ramOverride = RAMAmounts[scriptOptions.action]
            let pid = ns.exec(workerFile, alloc.host, execOptions, ...optionsObjectToArgArray(scriptOptions))
            alloc.associate(pid)
            if (this.page != null) {
                this.page.push(alloc)
            }
            
            this.allocations.push(alloc)
        }
    }

    toString() { return `${this.prefix}_${this.cycleID}` }

    details() { return `${this.toString()}\nDEL ${this.delays}\nTHR ${this.threads}\n` }

    /**
     * Clean up this cycle.
     * @param printMessage Print message about early cleanup if true
     */
    protected cleanup(printMessage = false) {
        for (const alloc of this.allocations) { 
            for (const pid of free(alloc)) {
                this.ns.kill(pid)
            }
        }
        if (printMessage) { this.ns.print("ERROR: " + this.toString() + " cleaned up early") }
        this.ns.atExit(() => {}, this.cycleID)
    }

    protected readyGate() {
        if (!this.ready) { throw new Error("Cycle is not ready to execute. Hack level might not be high enough") }
        this.ns.atExit(() => {
            this.cleanup(true)
        }, this.cycleID)
    }

    invalidate() {
        this.valid = false;
    }
}
export type BaseCycle = InstanceType<typeof Cycle>

/** Full HWGW cycle. */
export class HWGWCycle extends Cycle {
    prefix: string = "cycle"

    override prepare(skimFraction = 0.1): HWGWCycle {
        // clamp fraction to reasonable bounds
        skimFraction = Math.min(1, Math.max(0, skimFraction))
        const ns = this.ns;
        const currentMoney  = ns.getServerMoneyAvailable(this.target)
        const timeHack      = ns.getHackTime(this.target)
        const timeGrow      = ns.getGrowTime(this.target)
        const timeWeaken    = ns.getWeakenTime(this.target)

        const estimatedHackAmount = currentMoney * skimFraction
        const growRatio = Math.min(1.1 / (1 - skimFraction), 10)

        const sanitize = (x: number) => Math.max(1, Math.ceil(x))
    
        // Set up delay baselines.
        // Three tolerance gaps per cycle: hack -> weaken -> grow -> weaken
        // The first weaken is baseline, hack is -1 tolerance, grow is +1, and the second weaken is +2
        // Extra delay is also assigned here.
        this.delays.bite = this.extraDelay - this.tolerance;
        this.delays.biteClean = this.extraDelay;
        this.delays.serve = this.extraDelay + this.tolerance;
        this.delays.serveClean = this.extraDelay + this.tolerance * 2;

        // Delay for bite and serve (hack and grow) is weaken time - actual time: they should finish at the same time
        // In actual practice, the cycle's tolerance value will spread them back out so they finish in order.
        this.delays.bite += timeWeaken - timeHack
        this.delays.serve += timeWeaken - timeGrow
        this.delays.adjustAll(Math.ceil)

        // Sanity check to make sure that no thread tries to start with a negative delay. 
        // With high enough hacking, the time to complete a weaken can be shorter than the tolerance value.
        let shift = Math.min(...Object.values(this.delays))
        this.delays.adjustAll(x => x - shift)

        // Calculate threads needed for each part of the cycle. All calculations will result in decimals,
        // so truncate them with the sanitze() lambda 
        // The hack process gets a special clamping - it gets floored first, because using ceil might hack TOO MUCH
        // money from the server. Doing this allows us to get rid of a 1GB hackAnalyze call we might otherwise use.
        this.threads.bite = ns.hackAnalyzeThreads(this.target, currentMoney * skimFraction)
        // We can't hack from the server, return a very high thread requirement
        if (this.threads.bite == -1) { this.threads.bite = 1e40 }
        this.threads.bite = sanitize(Math.floor(this.threads.bite))
        //this.threads.bite = Math.max(1, this.threads.bite)

        this.threads.biteClean = secChangeHack * this.threads.bite / secChangeWeaken
        this.threads.biteClean = sanitize(this.threads.biteClean)

        this.threads.serve = ns.growthAnalyze(this.target, growRatio)
        this.threads.serve = sanitize(this.threads.serve)

        this.threads.serveClean = ns.growthAnalyzeSecurity(this.threads.serve) / secChangeWeaken
        this.threads.serveClean = sanitize(this.threads.serveClean)
        
        // Set the total time the cycle would take.
        this.totalTime = Math.ceil(this.delays.serveClean + timeWeaken)
        this.expectedPayout = estimatedHackAmount

        // Cycle is now ready.
        this.ready = true
        return this
    }

    protected override executeLogic() {
        const workerOptions = { target: this.target } as WorkerOptions
        const execOptions = { temporary: true } as RunOptions

        workerOptions.action = Actions.HACK
        workerOptions.delay = this.delays.bite
        this.deploy(this.threads.bite, execOptions, workerOptions)

        workerOptions.action = Actions.WEAKEN
        workerOptions.delay = this.delays.biteClean
        this.deploy(this.threads.biteClean, execOptions, workerOptions)

        workerOptions.action = Actions.GROW
        workerOptions.delay = this.delays.serve
        this.deploy(this.threads.serve, execOptions, workerOptions)

        workerOptions.action = Actions.WEAKEN
        workerOptions.delay = this.delays.serveClean
        this.deploy(this.threads.serveClean, execOptions, workerOptions)
    }

    override priorityScore(moneyNormalizer = 1) {
        let totalThreads = 0
        this.threads.adjustAll(x => {totalThreads += x; return x})
        if (this.ready) {
            return Math.log1p(this.expectedPayout / (this.totalTime * totalThreads * moneyNormalizer))
        } else {
            return Number.NEGATIVE_INFINITY;
        }
    }

    optimize(maxThreads = Number.MAX_SAFE_INTEGER): this {
        const spread = [...Array(100).keys()].map(x => {
            const priority = this.prepare( x/100 ).priorityScore()
            const threadsNeeded = this.threads.toArray().reduce((p,v) => p + v)
            if ( threadsNeeded > maxThreads) {
                return 0
            } else {
                return priority
            }
        })
        const best = Math.max(...spread)
        const ratio = spread.findIndex(x => x == best) / 100
        this.prepare(ratio/100)
        return this
    }
}

/** Cycle that only grows and weakens */
export class SuppressionCycle extends Cycle {
    prefix: string = "suppression"

    override prepare(growth = 1.5): SuppressionCycle {
        const ns = this.ns;
        const timeGrow = ns.getGrowTime(this.target)
        const timeWeaken = ns.getWeakenTime(this.target)

        // Set up delays
        this.delays.serve = this.extraDelay - this.tolerance
        this.delays.serve += Math.floor(timeWeaken - timeGrow)
        this.delays.serveClean = this.extraDelay

        // Sanity check to make sure that no thread tries to start with a negative delay. 
        // With high enough hacking, the time to complete a weaken can be shorter than the tolerance value.
        let shift = Math.min(...Object.values(this.delays))
        this.delays.adjustAll(x => x - shift)

        // Set up the threads for growing
        this.threads.serve = Math.ceil(ns.growthAnalyze(this.target, growth))

        // Set up the threads for weakening. Weaken is so cheap we might as well do it all at once.
        this.threads.serveClean = Math.min(
            ns.growthAnalyzeSecurity(this.threads.serve) * 20,
            ns.getServerSecurityLevel(this.target) - ALL_SERVERS.get(this.target)!.minSec
        )
        this.threads.serveClean /= secChangeWeaken
        this.threads.serveClean =  Math.max(1, Math.ceil(this.threads.serveClean))

        this.ready = true
        this.totalTime = Math.ceil(this.delays.serveClean + timeWeaken)
        return this
    }

    protected override executeLogic(): void {
        const workerOptions = { target: this.target } as WorkerOptions
        const execOptions = { temporary: true } as RunOptions

        workerOptions.action = Actions.GROW
        workerOptions.delay = this.delays.serve
        this.deploy(this.threads.serve, execOptions, workerOptions)

        workerOptions.action = Actions.WEAKEN
        workerOptions.delay = this.delays.serveClean
        this.deploy(this.threads.serveClean, execOptions, workerOptions)
    }

    /**
     * @returns A priority score based on statically-available information. Higher is better.
     */
    override priorityScore(): number {
        const ssi = ALL_SERVERS.get(this.target)
        if (ssi == undefined) {
            return Number.NEGATIVE_INFINITY
        }

        return ssi.moneyMax * ssi.serverGrowth * (100 - ssi.minSec)
    }
}

/** Unified structure for storing the same type of data for all parts of a HWGW cycle */
class HWGWData<T> {
    bite:       T
    biteClean:  T
    serve:      T
    serveClean: T

    /** */
    constructor(defaultValue: T) {
        this.bite = defaultValue
        this.biteClean = defaultValue
        this.serve = defaultValue
        this.serveClean = defaultValue
    }

    /** Apply an adjustment function to all values */
    adjustAll(adjustFunction: (value: T) => T) {
        this.bite = adjustFunction(this.bite)
        this.biteClean = adjustFunction(this.biteClean)
        this.serve = adjustFunction(this.serve)
        this.serveClean = adjustFunction(this.serveClean)
    }

    toString() {
        const width = 7
        const biteString =          `${this.bite}`.padStart(width)
        const biteCleanString =     `${this.biteClean}`.padStart(width)
        const serveString =         `${this.serve}`.padStart(width)
        const serveCleanString =    `${this.serveClean}`.padStart(width)
        return `HK: ${biteString} WE: ${biteCleanString} GR:${serveString} WE: ${serveCleanString}`
    }

    toArray() {
        return [
            this.bite,
            this.biteClean,
            this.serve,
            this.serveClean,
        ]
    }
}
