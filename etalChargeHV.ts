/**
 * Etalonnage charge HV, compare to reference
 */

import * as STATS  from 'https://cdn.jsdelivr.net/gh/JOTSR/ALE/dependencies/statsFunc.ts'
import * as CSV from './csv.ts'
import { Plot } from './plot.ts'

const directory = 'C:/Users/Julien/Desktop/HV_Gain_2'

const reference: {hv: number; channel: number; adcu: [number, number]; pc: [number, number]}[] = JSON.parse(await Deno.readTextFile('C:/Users/Julien/Desktop/etal2.json'))

//const round = (value: number, decimal = 2) => Math.round(value * 10**decimal) / 10**decimal

const hvDatas = []
const hvs: number[] = []

const ecartsPing: number [] = []
const ecartsPong: number [] = []

const ecartRelatif = (a: number, b: number) => {
    return 100 * (1 - a / b)
}

//Get all data from given directory
for await (const file of Deno.readDir(directory)) {
    const csv = CSV.parse(await Deno.readTextFile(`${directory}/${file.name}`))
    const voltage = parseInt(file.name.split('_')[2].replace('V.txt', ''))
    hvs.push(voltage)
    const formated = csv.map(e => {return {voltage, ...e}}) as Record<string, number | string>[]
    hvDatas.push(formated)
}

const flatHvDatas = hvDatas.flat()
    .filter(data => reference.map(ref => ref.hv).includes(data.voltage as number))
    .filter(data => (data.voltage as number) > 1100)
    //.filter(data => !((data.voltage as number) % 50))

//Iterate on all channels to trace linear fit
for (const channelNumber of new Array(128).fill(1).map((_, i) => i)) {
    const filteredChannel = flatHvDatas.filter(flatHvData => (flatHvData['Channel_nb'] as number) === channelNumber)
    const charges = reference
        .filter(ref => ref.channel === channelNumber)
        .filter(ref => hvs.includes(ref.hv))
        .filter (ref => ref.hv > 1100)
        //.filter( ref => !(ref.hv % 50))
        .map(ref => ref.pc)
    const valuePing = filteredChannel.map(channel => ((channel['Fit_Mean_PING'] as number) - (channel['Pedestal_Ref_PING'] as number)))
    const valuePong = filteredChannel.map(channel => ((channel['Fit_Mean_PONG'] as number) - (channel['Pedestal_Ref_PONG'] as number)))
    
    const moindre2Ping = STATS.moindre2(charges.map(e => e[0]), valuePing, false)
    const moindre2Pong = STATS.moindre2(charges.map(e => e[1]), valuePong, false)

    const moindre2RefPing = STATS.moindre2(charges.map(e => e[0]), reference.filter(ref => charges.includes(ref.pc)).map(ref => ref.adcu[0]))
    
    //console.log(moindre2Ping)
    //console.log(STATS.esperance(...filteredChannel.map(channel => (channel['Calib_P1_PING'] as number))))
    //console.log(moindre2Pong)
    //console.log(STATS.esperance(...filteredChannel.map(channel => (channel['Calib_P1_PONG'] as number))))

    if (channelNumber > 15 && !(channelNumber % 16)) {
        trace(
            `Ch[${channelNumber}] ping`,
            charges.map(e => e[0]),
            valuePing,
            [
                {start: [0, moindre2Ping.b], end: [
                    charges.map(e => e[0]).reverse()[0], charges.map(e => e[0]).reverse()[0] * moindre2Ping.a + moindre2Ping.b
                ], color: 'rgb(220, 80, 0)'},
                {start: [0, moindre2RefPing.b], end: [
                    charges.map(e => e[0]).reverse()[0], charges.map(e => e[0]).reverse()[0] * moindre2RefPing.a + moindre2RefPing.b
                ], color: 'rgb(80, 220, 0)'}
            ]
        )
    }


    ecartsPing.push(ecartRelatif(moindre2Ping.a, STATS.esperance(...filteredChannel.map(channel => (channel['Calib_P1_PING'] as number)))))
    ecartsPong.push(ecartRelatif(moindre2Pong.a, STATS.esperance(...filteredChannel.map(channel => (channel['Calib_P1_PONG'] as number)))))

    if (channelNumber > 15) {
        if(ecartsPing[ecartsPing.length - 1] > 10 || ecartsPing[ecartsPing.length - 1] < -10) console.log({channel: channelNumber, ecart: ecartsPing[ecartsPing.length - 1], mode: 'ping'})
        if(ecartsPing[ecartsPong.length - 1] > 10 || ecartsPong[ecartsPing.length - 1] < -10) console.log({channel: channelNumber, ecart: ecartsPong[ecartsPong.length - 1], mode: 'ping'})
    }

}
//Display gap histogram
bar('Ecarts slopes', [
    {x: (new Array(113).fill(1).map((_, i) => i + 15)), y: ecartsPing.slice(16, 129), name: 'ping'},
    {x: (new Array(113).fill(1).map((_, i) => i + 15)), y: ecartsPong.slice(16, 129), name: 'pong'}
])

//Generate the plot (linear fit)
function trace(title: string, x: number[], y: number[], line?: {start: number[], end: number[], color: string}[]) {
    const data = [{
        x: x,
        y: y,
        mode: (line === undefined) ? 'lines+markers' : 'markers',
        type: 'scatter'
    }]
    
    const layout = {
        title: title,
        shapes: (line === undefined) ? [] :
        line.map(e => { return {
            type: 'line',
            x0: e.start[0],
            y0: e.start[1],
            x1: e.end[0],
            y1: e.end[1],
            line: {
              color: e.color,
              width: 2
            }
        }})
    }

    const plot = new Plot()
    plot.trace(data, layout)
}

//Generate the plot (histogram)
function bar(title: string, datas: {x: number[]; y: number[]; name: string}[]) {
    const data = datas.map(e => {return {x: e.x, y: e.y, type: 'bar', name: e.name}})

    const plot = new Plot()
    plot.trace(data, {title})
}