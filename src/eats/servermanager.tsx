import { NS } from "../../NetscriptDefinitions";
import { BIOSNetworkMessage, BIOSNetworkMessageType } from "/bios";
import { Ports } from "/sys/ports";
const { React } = globalThis;

interface DashboardProps {
    ns: NS;
    initialAuto?: boolean;
    onToggleAuto: () => void;
    onSetMinRam: (ramExp: number) => void;
    onSetMinMoney: (money: number) => void;
}

function Dashboard(props: DashboardProps) {
    const { ns, onToggleAuto, onSetMinRam, onSetMinMoney } = props;

    return <div>
        <AutoBuyConfiguration 
            ns={ns}
            onToggleAuto={onToggleAuto}
            onSetMinMoney={onSetMinMoney}
            onSetMinRam={onSetMinRam}
        />
        <hr style={{width: "100%"}}/>
        <ManualBuyMenu ns={ns}/>
    </div>
}

interface AutobuyProps {
    ns: NS;
    initialAuto?: boolean;
    onToggleAuto: () => void;
    onSetMinRam: (ramExp: number) => void;
    onSetMinMoney: (money: number) => void;
}

function AutoBuyConfiguration(props: AutobuyProps) {
    const { ns, onToggleAuto, initialAuto, onSetMinRam, onSetMinMoney } = props;

    const [auto, setAuto] = React.useState(initialAuto ?? false);
    const [minRam, setMinRam] = React.useState(0);
    const [minMoney, setMinMoney] = React.useState(0);

    return <div style={{
        display: "flex",
        flexDirection: "column",
        padding: "0.25rem",
        margin: "5px",
        fontSize: "16pt",
    }}>
        <button 
            style={{
                backgroundColor: auto ? "green" : "red",
                padding: "0.25rem",
            }} 
            onClick={() => {
                setAuto(!auto);
                //onToggleAuto();
            }}
        >Automatically buy new servers: {auto ? "Enabled" : "Disabled"}</button>
        <label htmlFor="min-ram">`Minimum RAM for new servers: {ns.formatRam(2 ** minRam)}</label>
        <input 
            type="range" 
            id="min-ram" 
            min={0} 
            max={0} 
            value={minRam} 
            onInput={(event) => {
                const exp = Number(event.currentTarget.value);
                setMinRam(exp);
                //onSetMinRam(exp);
            }}
        />
        <label htmlFor="min-money">Keep at least ${ns.formatNumber(minMoney)}</label>
        <input 
            type="number" 
            min={0} 
            onInput={(event) => {
                const money = Number(event.currentTarget.value);
                setMinMoney(money);
                //onSetMinMoney(money);
            }}
        />
    </div>
}

interface ManualBuyProps {
    ns: NS;
}

/**
 * Manual buy menu, because the tech store one sucks even more.
 */
function ManualBuyMenu(props: ManualBuyProps) {
    const { ns } = props;

    const [ramExp, setRamExponent] = React.useState(0);
    const [name, setName] = React.useState<undefined | string>(undefined);

    function buy() {
        const serverName = ns.purchaseServer(
            name ?? `home${ns.getPurchasedServers().length}`,
            2 ** ramExp,
        );
        if (!serverName || serverName === "") {
            ns.toast(
                `Failed to buy server. This might mean that you don't have enough money.`,
                "error",
                5000,
            );
        } else {
            ns.toast(
                `Bough server ${name} with ${ns.formatRam(2 ** ramExp)}.`,
                "success",
                5000,
            );

            register(ns, name!);
        }
    }

    return <form 
        onSubmit={e => {
            e.preventDefault();
            //buy();
            return false;
        }}
        style={{
            display: "flex",
            flexDirection: "column",
            padding: "0.25rem",
            margin: "5px",
            fontSize: "16pt",
        }}
    >
        <label htmlFor="server-ram">RAM: {typeof ramExp == "number" ? ns.formatRam(2 ** ramExp) : "? GB"} | Price: ${ns.formatNumber(ns.getPurchasedServerCost(2 ** ramExp))}</label>
        <input id="server-ram" type="range" min={0} max={20} step={1} value={ramExp} onInput={event => setRamExponent(Number(event.currentTarget.value))}/>
        <input id="server-name" type="text" placeholder="Server Name (defaults to home)" value={name} onInput={e => setName(e.currentTarget.value)}/>
        <input type="submit" value="Manually Buy"/>
    </form>
}

function register(ns: NS, name: string) {
    ns.writePort(Ports.BIOS, {
        type: BIOSNetworkMessageType.UPDATE_SERVER,
        message: name
    } as BIOSNetworkMessage)
}

export async function main(ns: NS) {
    ns.disableLog("ALL")
    ns.clearLog()
    ns.printRaw(<Dashboard ns={ns} 
        onSetMinMoney={ns.print} 
        onSetMinRam={ns.print} 
        onToggleAuto={() => ns.print("toggled")}/>)

    while (true) {
        await ns.asleep(20)
    }
}