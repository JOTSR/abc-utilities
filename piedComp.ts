/**
 * This script compare the pedestals vaalues
 */

import * as CSV from './csv.ts'

const directory = 'C:/Users/Julien/Desktop/pied_abc_3'
const hvs = []
const hvDatas: Record<string, number>[][] = []

//Get all the files (*.csv) of the given directory
for await (const file of Deno.readDir(directory)) {
    const csv = CSV.parse(await Deno.readTextFile(`${directory}/${file.name}`))
    const voltage = parseInt(file.name.split('ht')[1].split('V')[0])
    hvs.push(voltage)
    const formated = csv.map(e => {return {voltage, ...e}}) as Record<string, number>[]
    hvDatas.push(formated)
}

const ecartRelatif = (a: number, b: number) => {
    return 100 * (1 - a / b)
}

//Generate an array of the relative gap
const ecarts = hvDatas[0].map((e, i) => {
    return {
        channel: e['Channel_nb'],
        ecartPied: ecartRelatif(e[' HG_Charge_ping'] + e['HG_Charge_pong'], hvDatas[1][i][' HG_Charge_ping'] + hvDatas[1][i]['HG_Charge_pong']),
        ecartRes: ecartRelatif(
            (e['charge_RMS_ping'] + e['charge_RMS_pong']) / (e[' HG_Charge_ping'] + e['HG_Charge_pong']),
            (hvDatas[1][i]['charge_RMS_ping'] + hvDatas[1][i]['charge_RMS_pong']) / (hvDatas[1][i][' HG_Charge_ping'] + hvDatas[1][i]['HG_Charge_pong'])
        )
    }
})

// charge_RMS_ping

console.log(ecarts)
//Output a result file for further analysis
await Deno.writeTextFile('C:/Users/Julien/Desktop/ecarts.json', JSON.stringify(ecarts))