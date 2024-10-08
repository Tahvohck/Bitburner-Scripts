import { NS } from "@ns";
const {React} = globalThis;


////////////////////////////////
////////////////////////////////
// Actual functions/constants
////////////////////////////////
////////////////////////////////
/** Common style components for BIOS JSX tags */
const BIOS_TermMsgStyleCommon: React.CSSProperties = {}
/** Common arguments for JSX tags */
interface BIOS_TerminalMessageArg {}
/** JSX tag for warning messages from the BIOS */
function BIOS_TermWarn({}: BIOS_TerminalMessageArg): void {}
/** JSX tag for info messages from the BIOS */
function BIOS_TermInfo({}: BIOS_TerminalMessageArg): void {}

let crackers: number;
/** find out how many crackers are currently working */
export declare function getCrackerCount(): number;
/** Attempt to nuke a server, running any prequisite crackers. Updates cracker count. */
export declare function tryNuke(ns: NS, target: string): boolean


////////////////////////////////
////////////////////////////////
// These functions are listed separately in the design document, but will likely be declared inside 
// of the main() function in the actual development code to take advantage of scope closures.
////////////////////////////////
////////////////////////////////
/** Run after initial setup is done. Continuously monitor the system and fix issues.
 *  Respond to system calls.
 */
async function mainLoop() {
    // In production, this true is actually a flag that allows for clean exit from the loop.
    // it can be set by sending a command over the network port
    while (true) {
        NETWORK_findNewServers()
        NETWORK_findNewBackdoors()
        RAM_FindNewSources()
        RAM_UpdatePersonalServers()
        readNetworkMessages()
                
        /**
         * wait for some amount of time before running the next loop iteration.
         */
    }
}

/** helper function to add an S where needed */
function pluralize() {}

/** Find all possible new sources of networked RAM and add them to RAM_SOURCES */
function RAM_FindNewSources() {
    /**
     * Map RAM_SOURCES to just hostnames
     * Reduce ALL_SERVERS to those with any RAM that are not already in RAM_SOURCES
     * for each entry remaining:
     *      tryNuke()
     *      if that fails, skip this entry
     *      if it doesn't fail, create a new SRU and push it to RAM_SOURCES
     */
}

/** Iterate over every allocation and sum up actual usage. */
function RAM_RebuildUsage() {
    /**
     * Reduce RAM_ALLOCATIONS to those with no associated script, or an associated script that's still running
     * use Array.reduce() fuckery to convert that to a Map<string, number> that is the real, in-use amount
     * set each source that exists usage to that value
     * free any allocations that no longer have a source
     */
}

/** Update information for all personal servers */
function RAM_UpdatePersonalServers() {
    /**
     * for every server in ALL_SERVERS that is a personal server:
     *      get live data
     *      update live data
     *      update the max RAM
     */
}

/** Find servers that are now backoored but weren't previously */
function NETWORK_findNewBackdoors() {
    /**
     * Reduce ALL_SERVERS to those not in home's network links
     * for each entry remaining:
     *      get live server data
     *      if server is backdoored, add a bidirectional link to home
     */
}

function NETWORK_findNewServers() {
    /**
     * perfom new network scan
     * reduce results to those not in ALL_SERVERS
     * for each entry remaining:
     *      create new SSI and add it to ALL_SERVERS
     *      if the server is backdoored, add a bidirectional link to home
     *      push server links to NETWORK_LINKS
     */
}

function readNetworkMessages() {
    /**
     * While BIOS port has data
     * read data
     * validate data
     * switch on data, run one of the following:
     *      handleEchoRequest()
     *      handleKillOrphanAllocations()
     *      handleResetAllocationAmount()
     *      handleUpdateServer()
     */
}

/** Called when script exits, cleans up background tasks. */
function cleanup() {
    /**
     * Remove current PID from core allocation, but leave it in the pagefile
     */
}


////////////////////////////////
////////////////////////////////
// Program entrypoint.
////////////////////////////////
////////////////////////////////
/** Main function. Initial setup and gating.
 * @param ns 
 */
export async function main(ns:NS) {
    /** initial setup
     * 
     * Imports bloat the RAM size, so override the static analyzer right off the bat.
     * check for other running BIOS files and exit if needed
     * disable logging
     * set up exit catch
     * nuke home to establish cracker count
     * initialize BIOS port
     * set BIOS running flag to true
     */

    /** Network initialization
     * 
     * Reset {@link ALL_SERVERS}, {@link NETWORK_LINKS}
     * Add home to the initial network with no links
     * NETWORK_findNewServers()
     */

    /** RAM initialization
     * 
     * store the current size of RAM_SOURCES (it will be changing as we operate on it)
     * for each index in RAM_SOURCES, do this:
     *      pop a source from RAM_SOURCES
     *      skip any undefined or null values (cleaning pass)
     *      get SSI for current source
     *      skip any undefined or null SSI (this gets rid of any nonexistant servers, i.e. after an aug)
     *      skip any SSI that are not owned by us and need more open ports than we have crackers
     *      tryNuke() - do this in case it's a fresh aug
     *      create a new ServerRamUsage from the current SSI
     *      unshift new SRU into RAM_SOURCES
     */

    /** Add any unknown sources */
    RAM_FindNewSources()
    RAM_RebuildUsage();

    /** Home server RAM reservation
     * 
     * Initialize {@link Pagefile}
     * Reserve 16 GiB for the BIOS and any manually-run scripts
     */
    
    /** initialization done. Sit in the main loop. */
    await mainLoop()
}
