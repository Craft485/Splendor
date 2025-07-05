import { Server, Socket } from "socket.io";

export const registerGameHandlers = (io: Server, socket: Socket) => {
    const ping = payload => {
        console.log(`Ping from client with message: ${payload}`)
    }

    socket.on('game:ping', ping)
}