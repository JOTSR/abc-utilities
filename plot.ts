/**
 * Show plot on http://localhost:5000 to bearing webview (window) lack of update
 */

import { Application, Context } from 'https://deno.land/x/oak@v7.5.0/mod.ts'
import { Server, Packet } from 'https://deno.land/x/wocket@v0.6.3/mod.ts'

let plots:{uuid: number; data: Record<string, unknown>[]; layout: Record<string, unknown>}[] = []

const css = `
<style>
    body {
        width: 100vw;
        height: 100vh;
        padding: 0;
    }

    div {
        width: 95vw;
        height: 95vh;
    }
</style>`

const js = `
const ws = new WebSocket('ws://localhost:3001')
    ws.onopen = (_) => ws.send(JSON.stringify({'connect_to':['ch1']}))
    ws.onmessage = (e) => {
        try {
            const {html, plots} = JSON.parse(JSON.parse(e.data).message)
            document.body.innerHTML = html
            for (const plot of plots) {
                document.body.innerHTML += \`<div id="plot-\${plot.uuid}"></div>\`
                Plotly.newPlot(\`plot-\${plot.uuid}\`, plot.data, plot.layout, { scrollZoom: true, editable: true })
            }
            console.log('update')
        } catch {
            ws.send(JSON.stringify({'send_packet':{'to':'ch1','message':'ready'}}))
        }
    }`

const html = () => `
<html>
<header>
    <title>Plots</title>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/plotly.js/2.0.0-rc.1/plotly.min.js"></script>
</header>
<body></body>
<style>${css}</style>
</html>
<script>${js}</script>`


//Serving and updating web page
const app = new Application() //Server
const ws = new Server() //Websocket
app.use((ctx: Context) => ctx.response.body = html()) //Single page

const serve = async (port = 5000) => {
    ws.run({hostname: 'localhost', port: 3001})
    console.log(`WS started on ws://${ws.hostname}:${ws.port}`,)
    console.log(`Server run on http://localhost:${port}/`)
    await app.listen({ port: port })
}

let ready = false

ws.on('ch1', (packet: Packet) => {
    ready = packet.message === 'ready'
    wsSend()
})

const timeOut: number[] = []

const wsSend = () => {
    if(ready) ws.to('ch1', JSON.stringify({html: html(), plots}))
    if(!ready) {
        timeOut.shift()
        timeOut.forEach(time => clearInterval(time))
        timeOut.push(setTimeout(wsSend, 100))
    }
}

serve()

//Plot descriptor
class Plot {
    private uuid: number
    constructor() {
        this.uuid = Date.now()
    }
    
    trace(data: Record<string, unknown>[], layout: Record<string, unknown>) {
        const uuid = this.uuid
        plots = plots.filter(plot => plot.uuid !== this.uuid)
        plots.push({uuid, data, layout})
        wsSend()
    }

    remove() {
        plots = plots.filter(plot => plot.uuid !== this.uuid)
        wsSend()
    }
}

export { Plot }