import express from 'express'
import { createServer } from 'http'

const APP = express()
APP.use(express.static('../public'))

const server = createServer(APP)

APP.get('*"404-routing"', (_, res) => {
    res.status(404).send('Invalid URL')
})

server.listen(80, () => console.log('Online!'))
