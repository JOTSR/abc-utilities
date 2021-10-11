import * as STATS from 'https://cdn.jsdelivr.net/gh/JOTSR/ALE/dependencies/statsFunc.ts'
import { Data } from 'https://cdn.jsdelivr.net/gh/JOTSR/ALE/dependencies/abcAdapter.ts'
import { plot } from 'https://deno.land/x/chart@1.0.1/mod.ts'
import * as CSV from './csv.ts'
import { Plot } from './plot.ts'
//import { filter } from './linearFilter.ts'

//CSV calibration file
const csv = CSV.parse(await Deno.readTextFile('C:/Users/Julien/Desktop/ABCv12#1_Gain_calibration_parameters.txt'))

//ABC Channel to analyse, default = -1 = all channels
const channelID = parseInt(Deno.args[0] ?? '-1')

//ABC data
const datas: Data[] = JSON.parse(await Deno.readTextFile('C:/Users/Julien/Desktop/charge_json/out.json'))

const totalHG: {a: number; b: number; ua: number; ub: number; r2: number}[] = []
const totalLG: {a: number; b: number; ua: number; ub: number; r2: number}[] = []

//Make a linear fit on data and convert pC to HV 
const stats = (channel: Data, gain: 'HG' | 'LG') => {
    let x = (gain === 'HG') ? [...new Set(channel.lowGain.map(e => e.amplitude))] : [...new Set(channel.highGain.map(e => e.amplitude))]
    const y: number[] = []
    if(gain === 'HG') x = x.filter(e => e < 31)
    for (const xi of x) {
        const charges = (gain === 'HG') ? channel.lowGain.filter(e => e.amplitude === xi).map(e => e.charge) : channel.highGain.filter(e => e.amplitude === xi).map(e => e.charge)
        const mean = STATS.esperance(...charges)
        if (mean > 600 || mean < 100) {
            x = x.filter(e => e !== xi)
            continue
        }
        y.push(mean)
    }
    
    //Conversion mV => pC
    x = x.map(xi => xi * 0.1812 + 0.0566)


    //console.log({x, y})
    const moindre2 = STATS.moindre2(x, y)

    trace(`Channel ${channel.channel} ${gain}`, x, y, {start: [0, moindre2.b], end: [x.reverse()[0], moindre2.a * x.reverse()[0] + moindre2.b]})

    if (gain === 'HG') totalHG.push(moindre2)
    if (gain === 'LG') totalLG.push(moindre2)

    return {gain: gain, ...moindre2}
}

//Trace and display values
if (channelID !== -1 && !Number.isNaN(channelID)) {
    //If signle channel then show plot ad stats in console
    const channel = datas.filter(e => e.channel === channelID)[0]
    const lowG = stats(channel, 'LG')
    const highG = stats(channel, 'HG')
    console.table({channelID, lowG, highG})
    const traceHG: number[] = []
    for(const i of new Array(40).fill(0).map((_, i) => i)) {
        const x = i * 0.1812 + 0.0566
        traceHG.push(lowG.a * x + lowG.b)
    }
    const traceLG: number[] = []
    for (const i of new Array(40).fill(0).map((_, i) => i)) {
        const x = i * 0.1812 + 0.0566
        traceLG.push(highG.a * x + highG.b)
    }
    console.log(plot([traceHG, traceLG], {height: 20, colors: ['red', 'blue']}))
} else {
    //If all channels show stats in console
    for (const channel of datas) {
        const voie = channel.channel
        const lowG = stats(channel, 'LG')
        const highG = stats(channel, 'HG')
        console.table({voie, lowG, highG})

        if (voie > 126) continue

        //Get time data
        const csvHGb = ((csv[voie]['HG_P0_ping'] as number) + (csv[voie]['HG_P0_pong'] as number)) / 2
        const csvHGa = ((csv[voie]['HG_P1_ping'] as number) + (csv[voie]['HG_P1_pong'] as number)) / 2
        const csvLGb = ((csv[voie]['LG_P0_ping'] as number) + (csv[voie]['LG_P0_pong'] as number)) / 2
        const csvLGa = ((csv[voie]['LG_P1_ping'] as number) + (csv[voie]['LG_P1_pong'] as number)) / 2

        console.log({
            channel: csv[voie]['Channel_nb'],
            hg: [csvHGa, csvHGb],
            lg: [csvLGa, csvLGb],
            HGa: Math.sqrt(STATS.variance(csvHGa, highG.a)),
            HGb: Math.sqrt(STATS.variance(csvHGb, highG.b)),
            LGa: Math.sqrt(STATS.variance(csvLGa, lowG.a)),
            LGb: Math.sqrt(STATS.variance(csvLGb, lowG.b))
        })

    }

    console.log(totalLG.reduce((p, c) => {
        const a = STATS.esperance(p.a, c.a)
        const b = STATS.esperance(p.b, c.b)
        const ua = STATS.esperance(p.ua, c.ua)
        const ub = STATS.esperance(p.ub, c.ub)
        const r2 = STATS.esperance(p.r2, c.r2)
        return { a, b, ua, ub, r2}
    }))

    console.log(totalHG.reduce((p, c) => {
        const a = STATS.esperance(p.a, c.a)
        const b = STATS.esperance(p.b, c.b)
        const ua = STATS.esperance(p.ua, c.ua)
        const ub = STATS.esperance(p.ub, c.ub)
        const r2 = STATS.esperance(p.r2, c.r2)
        return { a, b, ua, ub, r2}
    }))
}

//Trace graph
function trace(title: string, x: number[], y: number[], line?: {start: number[], end: number[]}) {
    const data = [{
        x: x,
        y: y,
        mode: (line === undefined) ? 'lines+markers' : 'markers',
        type: 'scatter'
    }]
    
    const layout = {
        title: title,
        shapes: (line === undefined) ? [] :
        [{
            type: 'line',
            x0: line.start[0],
            y0: line.start[1],
            x1: line.end[0],
            y1: line.end[1],
            line: {
              color: 'rgb(220, 90, 0)',
              width: 2
            }
        }]
    }

    const plot = new Plot()
    plot.trace(data, layout)
}