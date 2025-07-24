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

    const disconnect = () => {
        GameService.LeaveGame(io, socket)
    }

    const PlayerCountResponse = (count: number) => {
        GameService.PlayerCountResponse(socket, count)
    }

    const PlayerReadyResponse = () => {
        GameService.PlayerReadyResponse(io, socket)
    }

    const PlayerAttemptActionPart = eventData => {
        GameService.AttemptActionPart(io, socket, eventData)
    }

    const PlayerAttemptActionCancel = () => {
        GameService.AttemptActionCancel(io, socket)
    }

    const PLayerAttemptActionComplete = () => { // TODO: Include data about reserving here
        GameService.AttemptActionComplete(io, socket)
    }

    socket.on('game:ping', ping)
    socket.once('game:join', join)
    socket.once('disconnect', disconnect)
    socket.once('respond:playercount', PlayerCountResponse)
    socket.once('respond:playerready', PlayerReadyResponse)
    socket.on('player:attempt:action:part', PlayerAttemptActionPart)
    socket.on('player:attempt:action:cancel', PlayerAttemptActionCancel)
    socket.on('player:attempt:action:complete', PLayerAttemptActionComplete)
}