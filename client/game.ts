import { io } from 'socket.io-client'
import * as UIUpdates from './UIUpdates.js'


type GemType = 'blue' | 'red' | 'white' | 'green' | 'black' | 'gold'

type GemCost = {
    gem_type: GemType
    quantity: number
}

type Noble = {
    points: number // Should always be 3
    requirements: GemCost[]
}

type Card = {
    points: number
    cost: GemCost[]
    yeild_gem_type: GemType
}

type GameState = {
    tier_3_draw: Card[]
    tier_3_curr: Card[]
    tier_2_draw: Card[]
    tier_2_curr: Card[]
    tier_1_draw: Card[]
    tier_1_curr: Card[]
    current_market: number[]
    nobles: Noble[]
}

const socket = io()

let PlayerCount = 1,
    isMyTurn = false

function RegisterEventHandlers() {
    const PlayerJoin = (newPlayerID: string) => {
        console.log(`New player joined: ${newPlayerID}`)
        UIUpdates.AddNewInventoryShelfForPlayer(newPlayerID, PlayerCount++)
    }

    const PlayerLeft = (playerID: string) => {
        console.log(`Player left: ${playerID}`)
        // TODO: Update ui, end game?
    }

    const GetPlayerCount = () => {
        console.log('GetPlayerCount')
        const confirmationButton: HTMLButtonElement = UIUpdates.AddPlayerCountBlocker()
        confirmationButton.onclick = () => {
            const selection: HTMLSelectElement = document.getElementById('player-count-selection') as HTMLSelectElement
            if (selection.value !== '') {
                socket.emit('respond:playercount', Number(selection.value))
                UIUpdates.RemovePlayerCountBlocker()
            } else {
                alert('You need to select a valid player count to continue.')
            }
        }
    }

    const AskPlayerReady = () => {
        console.log('AskPlayerReady')
        const confirmationButton: HTMLButtonElement = UIUpdates.AddReadyBlocker()
        confirmationButton.onclick = () => {
            socket.emit('respond:playerready')
            UIUpdates.UpdateReadyBlocker()
        }
    }

    const GameStart = (InitState: GameState) => {
        console.log('GameStart')
        console.log(InitState)
        UIUpdates.SetupBoardState(InitState)
        UIUpdates.RemoveReadyBlocker()
    }

    socket.on('player:join', PlayerJoin)
    socket.on('player:left', PlayerLeft)
    socket.once('ask:playercount', GetPlayerCount)
    socket.once('ask:playerready', AskPlayerReady)
    socket.once('game:start', GameStart)
}

window.onload = () => {
    RegisterEventHandlers()
    UIUpdates.AddNewInventoryShelfForPlayer('local', PlayerCount++)
    socket.emit('game:join')
}
