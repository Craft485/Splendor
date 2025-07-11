import { io } from 'socket.io-client'
import * as UIUpdates from './UIUpdates.js'

const socket = io()

let PlayerCount = 1

function RegisterEventHandlers() {
    const PlayerJoin = (newPlayerID: string) => {
        console.log(`New player joined: ${newPlayerID}`)
        UIUpdates.AddNewInventoryShelfForPlayer(newPlayerID, PlayerCount++)
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
    UIUpdates.AddNewInventoryShelfForPlayer('local', PlayerCount++)
    socket.emit('game:join')
}
