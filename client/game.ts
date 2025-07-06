import { io } from 'socket.io-client'

const socket = io()

function RegisterEventHandlers() {
    const PlayerJoin = (newPlayerID: string) => {
        console.log(`New player joined: ${newPlayerID}`)
    }

    socket.on('player:join', PlayerJoin)
}

window.onload = () => {
    RegisterEventHandlers()
    socket.emit('game:join')    
}
