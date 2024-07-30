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

export function optionsObjectToArgArray(options: object): any[] {
    return Object.entries(options)
        .map(([k, v]) => {
            const prefix: string = (k.length > 1) ? "--" : "-"
            if (typeof(v) == "boolean") {
                return [prefix + k]
            } else {
                return [prefix + k, v]
            }
        })
        .flat(1)
}

/**
 * Number to base 64 code.
 * Taken from https://stackoverflow.com/questions/6213227/fastest-way-to-convert-a-number-to-radix-64-in-javascript
 */
export class Base64 {
    static _Rixits = "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ+/"
    //         ^       ^       ^       ^       ^       ^       ^       ^      ^
    //         0       8       16      24      32      40      48      56     63
    
    static fromNumber(number: number) {
        if (isNaN(Number(number)) || number === null ||
            number === Number.POSITIVE_INFINITY)
            throw "The input is not valid";

        const isNegative = number < 0
        number = Math.abs(number)
        var rixit; // like 'digit', only in some non-decimal radix 
        var residual = Math.floor(number);
        var result = '';
        while (true) {
            rixit = residual % 64
            result = this._Rixits.charAt(rixit) + result;
            residual = Math.floor(residual / 64);

            if (residual == 0)
                break;
            }
        return ((isNegative) ? "-" : "") + result;
    }

    static toNumber(rixits: string) {
        var result = 0;
        const rixitArray = rixits.split('');
        for (var e = 0; e < rixitArray.length; e++) {
            result = (result * 64) + this._Rixits.indexOf(rixitArray[e]);
        }
        return result;
    }
}