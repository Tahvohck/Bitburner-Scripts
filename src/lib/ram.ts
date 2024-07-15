import type { NS } from '@ns';
import type { StaticServerInfo } from 'lib/network';
import { RAM_ALLOCATIONS, RAM_SOURCES, getSource } from '/sys/memory';

/** Default size of the space reserved for threads in GiB */
const DEFAULT_BLOCK_SIZE = 4

//#region Utility functions
/**
 * Converts a number in GiB to MiB. Always returns an integer large enough to fit the conversion, i.e. 90.1 MiB gets
 * rounded up to 91 MiB.
 * @param gib 
 * @returns 
 */
function gibToMib(gib: number) {
    return Math.ceil(gib * 1024)
}

function mibToGiB(mib: number) {
    return Math.floor(mib / 1024 * 100) / 100
}

const prefixArray = [null, "ki", "Mi", "Gi", "Ti", "Pi", "Ei", "Zi", "Yi"]
export function formatBytes(amount: number, prefixIndex: number = 2): string {
    while (amount > 9000 && prefixIndex < prefixArray.length - 1) {
        amount /= 1024;
        prefixIndex ++;
    }
    let amountStr = amount.toLocaleString(undefined, {
        maximumFractionDigits: 2,
        minimumFractionDigits: 0
    })
    let unit = prefixArray[prefixIndex] || "";
    return `${amountStr} ${unit}B`;
}

export function assertNetworkedRAMReady() {
    if (RAM_SOURCES.length < 1) {
        throw new Error("Networked RAM is not ready. Is the BIOS initialized?")
    }
}

export function getFreeThreads(threadSize: number = DEFAULT_BLOCK_SIZE) {
    threadSize = gibToMib(threadSize)
    let threads = 0
    for (const source of RAM_SOURCES) {
        if (!source) continue;
        threads += Math.floor(source.freeSpace() / threadSize);
    }
    return threads
}
//#endregion

//#region Allocation functions
export function free(mem: ReservedRAM): number[] {
    assertNetworkedRAMReady();
    let source = getSource(mem.host)
    if (!source) {
        delete RAM_ALLOCATIONS[mem.id]
    } else {
        getSource(mem.host)?.free(mem);
    }
    return mem.pids;
}

/** Request networked RAM on a specific server
 * @param threads number of threads the allocation needs
 * @param threadSize Size in GiB of each thread
 * @param hostname networked server to allocate on
 */
export function halloc(threads: number, threadSize: number = DEFAULT_BLOCK_SIZE, hostname: string): ReservedRAM | null {
    assertNetworkedRAMReady();
    threadSize = gibToMib(threadSize)
    let source = getSource(hostname);
    if (!source) {
        throw new Error(`Could not find source ${hostname} - are you sure that server exists?`)
    }
    return source.reserve(threads, threadSize)
}
/** Request networked RAM on any server in any number of chunks
 * @param threads number of threads the allocation needs
 * @param threadSize Size in GiB of each thread
 */
export function malloc(threads: number, threadSize: number = DEFAULT_BLOCK_SIZE): ReservedRAM[] {
    assertNetworkedRAMReady();
    threadSize = gibToMib(threadSize)
    let sortedSources = RAM_SOURCES.sort((a, b) => b.freeSpace() - a.freeSpace())
    let allocations = []
    let remainingThreads = threads
    while (sortedSources[0].freeSpace() > threadSize && remainingThreads > 0) {
        let source = sortedSources.shift()!
        let alloc = source.reserve(remainingThreads, threadSize)
        if (alloc) {
            remainingThreads -= alloc?.threads;
            allocations.push(alloc);
        }
        sortedSources.push(source)
    }
    if (remainingThreads > 0) {
        for (const alloc of allocations) { free(alloc) }
        allocations = []
    }
    return allocations;
}
/** Request networked RAM on any server in a single chunk
 * @param threads number of threads the allocation needs
 * @param threadSize Size in GiB of each thread
 */
export function calloc(threads: number, threadSize: number = DEFAULT_BLOCK_SIZE): ReservedRAM | null {
    assertNetworkedRAMReady();
    threadSize = gibToMib(threadSize)
    let sortedSources = RAM_SOURCES.sort((a, b) => b.freeSpace() - a.freeSpace())
    let allocation = sortedSources[0].reserve(threads, threadSize)

    if (allocation?.threads != threads) {
        free(allocation!);
        allocation = null;
    }

    return allocation
}
//#endregion

//#region Classes
/** Stripped down server information specifically about RAM usage */
export class ServerRamUsage {
    /** Server name*/
    hostname: string
    /** Total RAM on the system in MiB */
    max: number;
    /** Current RAM usage in MiB */
    used: number;

    /** @param server Static information to create the {@link ServerRamUsage} from. */
    constructor(server: StaticServerInfo){
        this.max = gibToMib(server.maxRam);
        this.hostname = server.hostname;
        this.used = 0;
    }

    /** How much space is free on this server, in MiB */
    freeSpace(): number {
        return this.max - this.used;
    }
    
    /** Reserve networked RAM from a specific host
     * @param threads How many threads the reservation will be run with
     * @param threadsize How large each thread of the reservation will be in MiB
     */
    reserve(threads: number, threadSize: number = 4 * 1024): ReservedRAM | null {
        let realThreadAmount = Math.min(threads, Math.floor(this.freeSpace() / threadSize))
        let allocationSize = realThreadAmount * threadSize;

        if (allocationSize == 0) { 
            console.log({threads, threadSize, realThreadAmount, allocationSize})
            return null; 
        }
        
        this.used += allocationSize;
        let reservation = new ReservedRAM(this.hostname, allocationSize, realThreadAmount);
        return reservation;
    }

    free(mem: ReservedRAM) {
        // skip if this allocation is already freed
        if (mem.freed) { return }
        // Sanity check: is this allocation actually for this system? Should not ever throw if called using the main
        // free() command (i.e. if memory is freed correctly.)
        if (mem.host != this.hostname) {
            throw new Error(`Tried to free on the wrong host. [${mem.id}, ${mem.host} -> ${this.hostname}]`)
        }
        // Sanity check: is this memory actually what we have stored in the allocations?
        if (RAM_ALLOCATIONS[mem.id] != mem) {
            mem.freed = true;
            return;
        }

        // restore free space to the server, then delete the allocation from the global map.
        this.used = Math.max(0, this.used - mem.size)
        delete RAM_ALLOCATIONS[mem.id];
        mem.freed = true;
    }

    toString() {
       let hostname = this.hostname.padEnd(20)
       let used = formatBytes(this.used).padStart(12);
       let max =  formatBytes(this.max).padStart(9);
       return `${hostname}${used} / ${max}`
    }

    static Empty() {
        return new ServerRamUsage({
            maxRam: 0,
            hostname: ""
        } as StaticServerInfo);
    }
}

/** Represents a block of reserved memory from the network. */
export class ReservedRAM {
    /** a unique number that identifies the allocation */
    id: number;
    /** Host associated with the allocation */
    host: string;
    /** Size of the allocation in MiB */
    size: number;
    /** Expected number of threads */
    threads: number;
    /** Allocation is no longer in use */
    freed: boolean = false;
    /** Any associated pids, will be returned when {@link free} is called */
    pids: number[] = []

    static #nextID = 0;

    static generateID(): number {
        // Find first location in the allocation array that's empty, or return the length of the array (final index)
        let potential = RAM_ALLOCATIONS.findIndex(x => x == undefined)
        return (potential >= 0) ? potential : RAM_ALLOCATIONS.length;
    }

    /** Create a new reservation. Automatically tracked by networked RAM structures.
     * @param host Hostname that the reservation is on.
     * @param size How big the reservation is in MiB
     * @param threads The expected number of threads
     */
    constructor(host: string, size: number, threads: number) {
        this.id = ReservedRAM.generateID();
        this.host = host;
        this.size = size;
        this.threads = threads;
        RAM_ALLOCATIONS[this.id] = this;
    }

    /** Associate a process ID to this block of RAM 
     * @returns self, to allow chaining.
     */
    associate(pid: number): ReservedRAM {
        if (!this.pids.includes(pid)) { this.pids.push(pid); }
        return this;
    }

    /** Try to restore a reservation from a {@link ReservedRAM}-like object
     * @param obj An object that has the same properties as a {@link ReservedRAM}
     * @throws An error if the allocation doesn't exist and can't be generated on the target
     */
    static revive(obj : {id: number, host: string, size: number, threads: number}): ReservedRAM {
        let revived = 
            RAM_ALLOCATIONS[obj.id] ||
            getSource(obj.host)?.reserve(obj.threads, obj.size)
        if (!revived) {
            console.log(obj);
            throw new Error(`Could not revive allocation ID ${obj.id} on ${obj.host}`)
        }
        return revived;
    }

    toString(): string {
        return `[${this.id.toLocaleString().padStart(5)}] ${this.host}: ${this.threads}T, ${formatBytes(this.size)}`
    }
}

/**
 * Standardized method to save blocks of reserved RAM to disk, to more stably persist through script iterations.
 */
export class Pagefile {
    #blocks: ReservedRAM[] = [];
    #ns: NS;
    name: string;

    /**
     * @param ns
     * @param identifier Name of the file on disk, without the extension. Will automatically have .txt appended.
     */
    constructor(identifier: string, ns: NS) {
        this.name = `${identifier}.txt`;
        this.#ns = ns;
    }

    /** Write pagefile to disk 
     */
    write() {
        this.#ns.write(this.name, JSON.stringify(this.#blocks), "w")
    }

    /** Read pagefile from disk. Stable: will NOT overwrite existing blocks if unable to read the file.
     * @returns true if successful, false if not.
     */
    read() {
        let data = this.#ns.read(this.name)
        try {
            this.#blocks = JSON.parse(data);
            this.#blocks.forEach((v, i, a) => {
                a[i] = ReservedRAM.revive(v);
            })
            return true;
        } catch {
            return false;
        }
    }

    /** Cleans the pagefile using a cleaning function.
     * @param condition The function to evaluate for each block. Items that match the condition are "stale"
     * @returns Any stale blocks.
     */
    clean(condition: (block: ReservedRAM) => boolean) {
        let stale = this.#blocks.filter(condition)
        this.#blocks = this.#blocks.filter(x => !condition(x))
        return stale;
    }

    /** Clears all reserved RAM blocks. It is YOUR responsibility to free/kill them first. */
    clear() {
        this.#blocks = [];
        this.write();
    }

    /** Add a reservation to the pagefile */
    push(mem: ReservedRAM) {
        this.#blocks.push(mem)
        this.write()
    }

    /** Get the array of reserved blocks. Provided as a more semantic way to get them. */
    getAll(): ReservedRAM[] {
        return this.#blocks;
    }
}
//#endregion

export async function main(ns: NS) {
    ns.clearLog()
    let page = new Pagefile("sys/ram.debug", ns);
    // Do allocation tests
    for (const i of Array(50)) {
        page.push(halloc(1, 0.01, "home")!.associate(ns.pid))
    }
    for (const alloc of malloc(1, 2 * 1024)) {
        page.push(alloc.associate(ns.pid))
    }
    page.push(calloc(1, 0.01)!.associate(ns.pid))

    // print network use
    for (const src of RAM_SOURCES.sort((a,b) => b.max - a.max)) {
        ns.print(src.toString());
    }

    console.log(page)

    for (const pow of [...Array(9).keys()]){
        ns.print(formatBytes(
            1024 ** (pow + 1), 0
        ))
    }

    await ns.sleep(2000)
    // cleanup
    for (const alloc of page.getAll()) { free(alloc); }
    page.clear()
}