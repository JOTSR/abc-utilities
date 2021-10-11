/**
 * This script display high voltage information (mean HV, events, Resolution) of the PMs
 */

import * as STATS from 'https://cdn.jsdelivr.net/gh/JOTSR/ALE/dependencies/statsFunc.ts'
import * as CSV from './csv.ts'

interface PM {
    reference: number
    hvNominale: number
    sigma: number
    events: number
    channel: number
}

const csvFile = await Deno.readTextFile('C:/Users/Julien/Desktop/PMT_Asic_channels_HV_Sigma_DR.txt')
//fetch PMs datas
const pms = CSV
    .parse(csvFile.replaceAll('\r\n', '\n'), {header: true, columnSeparator: '\t', lineSeparator: '\n'})
    .map(pm => {
        return {
            reference: pm.reference,
            hvNominale: pm.hvNominale,
            sigma: (pm.resMH as number) / 2.35,
            events: (pm.darkRate as number) * 66.17, //39CT
            channel: pm.channelID
        } as PM
    })

const gainOpti = [
    { asic: 0, hv: 1107, events: 16400, resolution: 35.622053885962266 },
    { asic: 1, hv: 1149, events: 8707, resolution: 33.840464289251415 },
    { asic: 2, hv: 1183, events: 12931, resolution: 33.19221326998617 },
    { asic: 3, hv: 1104, events: 19360, resolution: 35.95284842803252 },
    { asic: 4, hv: 1211, events: 11365, resolution: 32.38323254159308 },
    { asic: 5, hv: 1167, events: 13775, resolution: 33.28311876457803 },
    { asic: 6, hv: 1213, events: 15655, resolution: 33.72654972298257 },
    { asic: 7, hv: 1178, events: 8170, resolution: 32.1759481471604 }
]

const ecartRelatif = (a: number, b: number) => {
    return 100 * (1 - a / b)
}

const outPut = []

//Iterage on all asics
for (const gain of gainOpti) {
    const bornes = [(gain.asic * 16), (gain.asic + 1) * 16 - 1]
    const meanHV = STATS.esperance(...pms.filter(pm => pm.channel >= bornes[0] && pm.channel <= bornes[1]).map(pm => pm.hvNominale))
    const meanEvents = STATS.esperance(...pms.filter(pm => pm.channel >= bornes[0] && pm.channel <= bornes[1]).map(pm => pm.events))
    const meanRes = STATS.esperance(...pms.filter(pm => pm.channel >= bornes[0] && pm.channel <= bornes[1]).map(pm => pm.sigma))
    outPut.push({
        asic: gain.asic,
        ecartHV: Math.round(ecartRelatif(meanHV, gain.hv)),
        ecartEvents: Math.round(ecartRelatif(meanEvents, gain.events)),
        ecartResolution: Math.round(ecartRelatif(meanRes, gain.resolution))
    })
    console.table({
        asic: gain.asic,
        ecartHV: `${Math.round(ecartRelatif(meanHV, gain.hv))}%`,
        ecartEvents: `${Math.round(ecartRelatif(meanEvents, gain.events))}%`,
        ecartResolution: `${Math.round(ecartRelatif(meanRes, gain.resolution))}%`
    })
}
console.log(outPut)