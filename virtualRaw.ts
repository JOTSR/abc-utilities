/**
 * This script generate an artificial bin to according to a text representation to test binary decoding
 */

//Text representation of the binary file
const file = await Deno.readTextFile('./virtualRaw.txt')
const blocks = file.split('\r\n\r\n')

const chunks = blocks.map(bloc => bloc.split('\r\n'))

//Bin file output
const bin = await Deno.open('./virtualRaw.bin', {write: true, create: true})

//Conversion loop
for (const chunk of chunks) {
    if (chunk[0] === '202 254 202 254') {
        const code = [202, 254, 202, 254]
        const timestamp = nbToUint8(parseInt(chunk[1]), 5)
        const record = nbToUint8(parseInt(chunk[2]), 1)
        const hitRegL = nbToUint8(parseInt(chunk[3].replaceAll(' ', ''), 16), 8)
        const none = nbToUint8(parseInt(chunk[4]), 1)
        const hitRegH = nbToUint8(parseInt(chunk[5], 16), 8)
        const data = new Uint8Array([...code, ...timestamp, ...record, ...hitRegL, ...none, ...hitRegH])
        console.log(data)
        await Deno.write(bin.rid, data)
    } else {
        const channel = nbToUint8(parseInt(chunk[0]), 1)
        const coarse = nbToUint8(parseInt(chunk[1]) ,4)
        const charge = nbToUint8(parseInt(chunk[2]), 2)
        const fine = nbToUint8(parseInt(chunk[3]), 2)
        const data = new Uint8Array([...channel, ...coarse, ...charge, ...fine])
        console.log(data)
        await Deno.write(bin.rid, data)
    }
}

Deno.close(bin.rid)

//Decimal to byte array conversion
function nbToUint8(value: number, length: number) {
    const array = []
    for (let index = 0; index < Math.log2(value); index += 8) {
        array.push(value >> index)
    }
    return new Uint8Array([...new Array(length - array.length).fill(0), ...array.reverse()])
}