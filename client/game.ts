import { io } from 'socket.io-client'

const socket = io()

function RegisterEventHandlers() {
    const PlayerJoin = (newPlayerID: string) => {
        console.log(`New player joined: ${newPlayerID}`)
        // TODO: Update ui
    }

    const PlayerLeft = (playerID: string) => {
        console.log(`Player left: ${playerID}`)
        // TODO: Update ui, end game?
    }

    socket.on('player:join', PlayerJoin)
    socket.on('player:left', PlayerLeft)
}

window.onload = () => {
    RegisterEventHandlers()
    socket.emit('game:join')    
}
