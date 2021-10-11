interface Options {
    lineSeparator?: string
    columnSeparator?: string
    //decimalPoint: string
    header?: boolean
}

const defaultParseOptions: Options = {
    lineSeparator: '\n',
    columnSeparator: ' ',
    //decimalPoint: '.',
    header: true
}

/**
 * Parse a CSV string to a JS Object
 * @param {string} string CSV string to parse
 * @param {Options} options Parse options
 * @returns 
 */
const parse = (string: string, options = defaultParseOptions): Record<string, string | number>[] => {
    const lines = string.split(options.lineSeparator ?? '\n')
    const keys = options.header ? lines.shift()?.split('; ') ?? [] : null
    const data = []
    for (const line of lines) {
        if (line.includes(options.columnSeparator ?? ' ')) {
            const values = line.split(options.columnSeparator ?? ' ')
            const formated = values
                .map(value => Number.isNaN(parseFloat(value)) ? value : parseFloat(value))
                .map((value, index) => (keys === null) ? [index, value] : [keys[index], value])
            data.push(Object.fromEntries(formated))
        }
    }
    return data
}

/**
 * Stringify a JS Objsct to a CSV string
 * @param {Record<string, string | number[]>} _object Object to stringify
 * @param {Options} _options Stringify options
 * @returns 
 */
const stringify = (_object: Record<string, string | number>[], _options = defaultParseOptions) => {
    return 'not implemented'
}

export {parse, stringify}
export type {Options}