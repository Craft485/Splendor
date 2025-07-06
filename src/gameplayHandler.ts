import { Server, Socket } from "socket.io";
import * as GameService from './game/Service.js'

export const registerGameHandlers = (io: Server, socket: Socket) => {
    const ping = payload => {
        console.log(`Ping from client with message: ${payload}`)
    }

    const join = () => {
        console.log(`Request to join from ${socket.id}`)
        GameService.JoinGame(io, socket)
    }

    socket.on('game:ping', ping)
    socket.on('game:join', join)
}