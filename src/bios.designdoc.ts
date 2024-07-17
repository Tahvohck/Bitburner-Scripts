import { NS } from "@ns";
const {React} = globalThis;


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


/** Main function. Initial setup and gating.
 * @param ns 
 */
export async function main(ns:NS) {
    /** initial setup
     * 
     * check for other running BIOS files and exit if needed
     * disable logging
     * set up exit catch
     * nuke home to establish cracker count
     * Initialize {@link Pagefile}
     */

    /** Network initialization
     * 
     * Reset {@link ALL_SERVERS}, {@link NETWORK_LINKS}
     * Add home to the initial network with no links
     * Recursively scan the network, for each result:
     *      get the server
     *      Set the Static Server Info for the server and add to ALL_SERVERS
     *      Add the links for the server to NETWORK_LINKS
     *      if the server is backdoored: add home to the links, add a link to it from home
     */

    /** RAM initialization
     * store the current size of RAM_SOURCES (it will be changing as we operate on it)
     * for each index in RAM_SOURCES, do this:
     *      pop a source from RAM_SOURCES
     *      skip any undefined or null values (cleaning pass)
     *      get SSI for current source
     *      skip any undefined or null SSI (this gets rid of any nonexistant servers, i.e. after an aug)
     *      skip any SSI that are not owned by us and need more open ports than we have crackers
     *      create a new ServerRamUsage from the current SSI
     *      delete max ram from stale SRU
     *      Assign stale SRU to new SRU
     *      unshift new SRU into RAM_SOURCES
     * Reduce ALL_SERVERS to just those with more than zero RAM, use in this block
     * for each server in red
     */

    /** Add any unknown sources */
    updateRamSources(ns)

    /** initialization done. Sit in the main loop. */
    await mainLoop(ns)
}

/** Run after initial setup is done. Continuously monitor the system and fix issues.
 *  Respond to system calls.
 */
async function mainLoop(ns:NS) {
    while (true) {
        updateRamSources(ns)
        
        await ns.sleep(400)     // Run this loop five times in two seconds.
    }
}

/** Find all possible new sources of networked RAM and add them to RAM_SOURCES
 * @param ns 
 */
function updateRamSources(ns: NS) {
    /**
     * Map RAM_SOURCES to just hostnames
     * Reduce ALL_SERVERS to those with any RAM that are not already in RAM_SOURCES
     * for each entry remaining:
     *      tryNuke()
     *      if that fails, skip this entry
     *      if it doesn't fail, create a new SRU and push it to RAM_SOURCES
     */
}