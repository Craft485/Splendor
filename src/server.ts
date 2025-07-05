import express from 'express'
import { createServer } from 'http'
import { Server } from 'socket.io'
import { registerGameHandlers } from './gameplayHandler.js'

const APP = express()
APP.use(express.static('../public'))

const server = createServer(APP)
const IOServer = new Server(server)

APP.get('*"404-routing"', (_, res) => {
    res.status(404).send('Invalid URL')
})

IOServer.on("connection", socket => {
    registerGameHandlers(IOServer, socket)
})

server.listen(80, () => console.log('Online!'))
