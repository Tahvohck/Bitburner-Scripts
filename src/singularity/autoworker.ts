import { CompanyName, CompanyPositionInfo, JobField, JobName, NS, WorkStats } from "@ns";
import { AutocompleteData, ScriptArg } from "@ns";

const Options = {
    company: "default"
}

const FLAGS = [...Object.entries(Options)]

export function autocomplete(data: AutocompleteData, args: ScriptArg[]) {
    const options = data.flags(FLAGS) as typeof Options
    return [];
}

export async function main(ns: NS) {
    if (!ns.fileExists("Formulas.exe")) {
        ns.tprint("ERROR: You need Formulas.exe to use this script.")
        return
    }
    const options = ns.flags(FLAGS) as typeof Options;
    console.clear()
    const {CompanyName, FactionWorkType, JobName} = ns.enums
    ns.formulas.work.companyGains(ns.formulas.mockPerson(), "ECorp", JobName.IT0, 0)
    ns.singularity.getCompanyPositionInfo("ECorp", JobName.IT0)
    const {getCompanyPositionInfo: PositionInfo} = ns.singularity
    const { companyGains: Gains } = ns.formulas.work

    let company = CompanyName.OmniTekIncorporated
    if (options.company != "default") {
        company = options.company as CompanyName
    }

    ns.clearLog()
    let jobs = new Map<string, WorkStats>()
    for (const position of ns.singularity.getCompanyPositions(company)) {
        try {
            jobs.set(position, Gains(ns.getPlayer(), company, position, 100))
        } catch (e) { }
    }
    console.log(jobs);

    const filterPosition = ([pos, workstat]: [string, WorkStats]): boolean => {
        let pi = PositionInfo(company, pos as JobName)
        let player = ns.getPlayer()
        return [
            pi.requiredSkills.agility   <= player.skills.agility,
            pi.requiredSkills.charisma  <= player.skills.charisma,
            pi.requiredSkills.defense   <= player.skills.defense,
            pi.requiredSkills.dexterity <= player.skills.dexterity,
            pi.requiredSkills.hacking   <= player.skills.hacking,
            pi.requiredSkills.strength  <= player.skills.strength,
            pi.requiredReputation       <= ns.singularity.getCompanyRep(company)
        ].every(x=>x)
    }

    const sortPositions = ([posA, workstatA]: [string, WorkStats], [posB, workstatB]: [string, WorkStats] ): number => {
        let repDiff = Math.max(-1, Math.min(1, workstatB.reputation - workstatA.reputation))
        if (Math.abs(repDiff) > 0.25) { return repDiff; }
        return Math.max(-1, Math.min(1, workstatB.money - workstatA.money))
    }

    let sorted = [...jobs.entries()].sort(sortPositions)
    let filtered = sorted.filter(filterPosition);
    console.log({
        sorted,
        filtered
    })

    ns.tprint(`Best position at ${company} is ${filtered[0][0]}`)
    let nextPosition = sorted[Math.max(0, sorted.indexOf(filtered[0]) - 1)]
    ns.tprint(`Follow up with: ${nextPosition[0]}`)

    let pi = ns.singularity.getCompanyPositionInfo(company, filtered[0][0] as JobName)
    ns.singularity.applyToCompany(company, pi.field)
}

