import * as STATS from 'https://cdn.jsdelivr.net/gh/JOTSR/ALE/dependencies/statsFunc.ts'

interface Slope {
    slope: number
    x: number[]
    y: number[]
}

/**
 * Clean a linear fit by removing no-covariante values
 * @param {number} x X values
 * @param {number} y Y values
 * @param {Slope[]} slopes 
 * @param {number} ceil 
 * @returns Corrected 2D array {x, y}
 */
const cleanSlope = (x: number[], y: number[], slopes: Slope[], ceil: number) => {
    let filteredSlopes: Slope[] = []
    //Iterate on values to compare slope variations
    while (STATS.variance(...slopes.map(e => e.slope)) > ceil) {
        const deltas = slopes.map(slope => 1 - Math.abs(slope.slope / STATS.esperance(slope.slope)))
        const [_, max] = STATS.extremum(...deltas)
        filteredSlopes = slopes.filter((_, index) => index !== deltas.indexOf(max))
    }
    //removing no-covariante values
    const filteredX = x.filter(e => filteredSlopes.map(e => e.x).flat().includes(e))
    const filteredY = y.filter(e => filteredSlopes.map(e => e.y).flat().includes(e))
    return ({filteredX, filteredY})
}

/**
 * Clean a linear fit according to mode
 * @param {number} x X values
 * @param {number} y Y values
 * @param {string} mode Set the portion of the data to conserve
 * @param {number} ceil in % (default = 0.05) variance deletion ceil
 * @returns Filtered 2D data array
 */
const filter = (x: number[], y: number[], mode: 'end' | 'start' | 'middle' | 'extremum' | 'all', ceil = 0.05) => {
    const length = x.length
    const slopes: Slope[] = []

    if (mode === 'end') {
        const middle = Math.floor(length / 2)
        for (let i = middle; i < length; i++) {
            const [xSliced, ySliced] = [x.slice(0, i + 1), y.slice(0, i + 1)]
            slopes.push({slope: STATS.moindre2(xSliced, ySliced).a, x: xSliced, y: ySliced})
        }
        return cleanSlope(x, y, slopes, ceil)
    }
    if (mode === 'start') {
        const middle = Math.ceil(length / 2)
        for (let i = 0; i < middle; i++) {
            const [xSliced, ySliced] = [x.slice(i, length + 1), y.slice(i, length + 1)]
            slopes.push({slope: STATS.moindre2(xSliced, ySliced).a, x: xSliced, y: ySliced})
        }
        return cleanSlope(x, y, slopes, ceil)
    }
    if (mode === 'middle') {
        const middle = Math.round(length / 2)
        for (let i = middle; i > 0; i--) {
            const [xSliced, ySliced] = [x.slice(middle - i, middle + i + 1), y.slice(middle - i, middle + i + 1)]
            slopes.push({slope: STATS.moindre2(xSliced, ySliced).a, x: xSliced, y: ySliced})
        }
        return cleanSlope(x, y, slopes, ceil)
    }
    if (mode === 'extremum') {
        const middle = Math.floor(length / 2)
        for (let i = 0; i < middle; i++) {
            const [xSliced, ySliced] = [x.slice(i, length - i + 1), y.slice(i, length - i + 1)]
            slopes.push({slope: STATS.moindre2(xSliced, ySliced).a, x: xSliced, y: ySliced})
        }
        return cleanSlope(x, y, slopes, ceil)
    }
    if (mode === 'all') {
        for (let i = 0; i < length; i++) {
            const [xSliced, ySliced] = [x.slice(i, i + 1), y.slice(i, i + 1)]
            slopes.push({slope: STATS.moindre2(xSliced, ySliced).a, x: xSliced, y: ySliced})
        }
        return cleanSlope(x, y, slopes, ceil)
    }
}

export { filter }