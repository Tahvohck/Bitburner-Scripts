declare global {
    function nativeTimeout(h:TimerHandler, t: number | undefined, ...a:any[]): void
}

/** return an awaitable promise that resolves after a certain number of milliseconds
 * @param ms How long to sleep for (in milliseconds)
 */
export function sleep(ms: number): Promise<void> {
    return new Promise(resolve => {
        (nativeTimeout ?? setTimeout)(resolve, ms)
    })
}