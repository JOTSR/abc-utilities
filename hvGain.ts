/**
 * Calculate the optimum HV gain of each channels and ASICs
 */

import * as CSV from './csv.ts'
import * as STATS from 'https://cdn.jsdelivr.net/gh/JOTSR/ALE/dependencies/statsFunc.ts'
//import { plot } from 'https://deno.land/x/chart@1.0.1/mod.ts'

// const directory = '../data/HV_Gain'
const directory = 'C:/Users/Julien/Desktop/HV_Gain_corr'

const round = (value: number, decimal = 2) => Math.round(value * 10**decimal) / 10**decimal

const hvDatas = []
const hvs = []
let meanA: number[] = []
let meanB: number[] = []
const optiHV: number[] = []
const events: {channel: number, events: number, sigma: number, mean: number, pied: number}[] = []
const textFile = []
const cliOut = []

for await (const file of Deno.readDir(directory)) {
    const csv = CSV.parse(await Deno.readTextFile(`${directory}/${file.name}`))
    const voltage = parseInt(file.name.split('_')[2].replace('V.txt', ''))
    hvs.push(voltage)
    const formated = csv.map(e => {return {voltage, ...e}}) as Record<string, number | string>[]
    hvDatas.push(formated)
    //Suppression premiere tension car erreur
}

//temp
const etal2 = []
const gainBody = []

//Get HV data, adcu, pc (etal) and mean, pied, sigma
for (const channelNumber of new Array(128).fill(1).map((_, i) => i)) {
    const flatHvDatas = hvDatas.flat()
    const filteredChannel = flatHvDatas.filter(flatHvData => (flatHvData['Channel_nb'] as number) === channelNumber)
    const x: number[] = []
    const y: number[] = []
    for (const hv of hvs) {
        const channel = filteredChannel.filter(channel => channel.voltage === hv)[0]
        const meanFit = ((channel['Fit_Mean_PING'] as number) + (channel['Fit_Mean_PONG'] as number)) / 2
        const meanCalib = ((channel['Calib_P1_PING'] as number) + (channel['Calib_P1_PONG'] as number)) / 2
        const meanPedestal = ((channel['Pedestal_Ref_PING'] as number) + (channel['Pedestal_Ref_PONG'] as number)) / 2
        y.push(Math.log((meanFit - meanPedestal) / (meanCalib * 1.6e-7)))
        x.push(Math.log(hv))

        //temp
        etal2.push({
            hv: hv,
            channel: channelNumber,
            adcu: [
                (channel['Fit_Mean_PING'] as number) - (channel['Pedestal_Ref_PING'] as number),
                (channel['Fit_Mean_PONG'] as number) - (channel['Pedestal_Ref_PONG'] as number)
            ],
            pc: [
                ((channel['Fit_Mean_PING'] as number) - (channel['Pedestal_Ref_PING'] as number)) / (channel['Calib_P1_PING'] as number),
                ((channel['Fit_Mean_PONG'] as number) - (channel['Pedestal_Ref_PONG'] as number)) / (channel['Calib_P1_PONG'] as number)
            ]
        })

        events.push({
            channel: channelNumber,
            events: ((channel['Entries PING'] as number) + (channel['Entries PONG'] as number)) / 2,
            sigma: ((channel['Fit_Sigma_PING'] as number) + (channel['Fit_Sigma_PONG'] as number)) / 2,
            mean: meanFit,
            pied: meanPedestal
        })
    }

    await Deno.writeTextFile('C:/Users/Julien/Desktop/etal2.json', JSON.stringify(etal2))

    //Suppremision premiere tension car erreur
    x.shift()
    x.shift()
    y.shift()
    y.shift()

   // R = s / (m - p) *100

    const {a, b, ua, ub} = STATS.moindre2(x, y)
    const funcText = `Channel[${channelNumber}]: ln(G) = ${round(a)}±${round(ua)} * ln(HV) + ${round(b)}±${round(ub)}`
    const [G0, uG0] = [Math.exp(b), ub * Math.exp(b)] //Gain
    const [G, uG] = [Math.exp(a), ua * Math.exp(a)]
    const text = `Channel[${channelNumber}]: {G0: ${round(G0)}±${round(uG0)}, G: ${round(G)}±${round(uG)}}`
    gainBody.push(`${round(G, 4)} ${round(uG, 4)} ${round(G0, 4)} ${round(uG0, 4)}`)
    console.log(`${funcText}\n${text}\n`)

    textFile.push({channelNumber, x, y, a, b})

    meanA.push(a)
    meanB.push(b)

    // const trace = []
    // for(const x of new Array(100).fill(0).map((_, i) => i)) {
    //     trace.push(a * x + b)
    // }
    // console.log(plot(trace, {height: 10}))

    if(((channelNumber + 1) % 1) === 0) {
        const gain = Math.log(3e6)
        const hv = Math.exp((gain - STATS.esperance(...meanB)) / STATS.esperance(...meanA))
        optiHV.push(hv)
        meanA = []
        meanB = []
    }
}

console.table(optiHV.map(hv => Math.round(hv)))

const optiHVCSV = [`Channel_nb; HV_Value; HV_Resolution; Events`]

//Iterate on channels to log optimum hv
for (const channel of new Array(128).fill(0).map((_, i) => i)) {
    const filtered = events.filter(event => event.channel === channel)
    const sigma = STATS.esperance(...filtered.map(event => event.sigma))
    const fit = STATS.esperance(...filtered.map(event => event.mean))
    const pied = STATS.esperance(...filtered.map(event => event.pied))
    optiHVCSV.push(`${channel} ${optiHV.map(hv => Math.round(hv))[channel]} ${Math.round(100000 * sigma / (fit - pied)) / 1000} ${Math.round(STATS.esperance(...filtered.map(event => event.events)))}`)
    cliOut.push({
        asic: channel,
        hv: optiHV.map(hv => Math.round(hv))[channel],
        events: Math.round(STATS.esperance(...filtered.map(event => event.events))),
        resolution: 100 * sigma / (fit - pied)
    })
}

// for (const asic of [0, 1, 2, 3, 4, 5, 6, 7]) {
//     const bornes = [(asic * 16), (asic + 1) * 16 - 1]
//     const filtered = events.filter(event => event.channel >= bornes[0] && event.channel <= bornes[1])
//     const sigma = STATS.esperance(...filtered.map(event => event.sigma))
//     const fit = STATS.esperance(...filtered.map(event => event.mean))
//     const pied = STATS.esperance(...filtered.map(event => event.pied))
//     optiHVCSV.push(`${asic} ${optiHV.map(hv => Math.round(hv))[asic]} ${100 * sigma / (fit - pied)} ${Math.round(STATS.esperance(...filtered.map(event => event.events)))}`)
//     cliOut.push({
//         asic: asic,
//         hv: optiHV.map(hv => Math.round(hv))[asic],
//         events: Math.round(STATS.esperance(...filtered.map(event => event.events))),
//         resolution: 100 * sigma / (fit - pied)
//     })
// }

await Deno.writeTextFile('C:/Users/Julien/Desktop/HV_Optimisees_ABC12_3.csv', optiHVCSV.join('\n'))

console.log(cliOut)
console.log(hvs)

await Deno.writeTextFile(`C:/Users/Julien/Desktop/hv_trace.json`, JSON.stringify(textFile), {create  : true})

const gainHead = `Gain_P1; Error_Gain_P1; Gain_P0; Error_Gain_P0;`
const csvFileHead = `Channel_nb; ${gainHead}; ${hvs.map(hv => `HV_${hv}_PING; HV_${hv}_PONG`).join('; ')}`
const csvBody: string[] = []

for (const channel of new Array(128).fill(0).map((_, i) => i)) {
    const etal = etal2.filter(e => e.channel === channel)
    csvBody.push(`${channel} ${gainBody[channel]} ${etal.map(e => `${round(e.pc[0], 4)} ${round(e.pc[1], 4)}`).join(' ')}`)
}

await Deno.writeTextFile(`C:/Users/Julien/Desktop/HV_to_pC.csv`, [csvFileHead, '\n', ...csvBody].join('\n'))