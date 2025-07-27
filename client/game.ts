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

function AttemptActionPart(ev: MouseEvent) {
    // console.log(ev)
    const targetElement = ev.currentTarget as HTMLElement
    const eventType = targetElement.className.includes('gem') ? 'GEM_SELECT' : 'DEV_SELECT'
    const eventData = eventType === 'GEM_SELECT' 
        ? {
            gem_type: targetElement.getAttribute('gem-type'),
          } 
        : { 
            card_data: (s => {
                const parser = /(?:gem-type="|<span>)((?:\w+">)?\d)/g
                let parsed: RegExpExecArray | null,
                    res: (string | number)[][] = []
                while ((parsed = parser.exec(s)) !== null) {
                    res.push(parsed[1].split('\">'))
                }
                res = res.map(x => x.map(y => !isNaN(Number(y)) ? Number(y) : y))
                return { 
                    points: res.shift()[0],
                    yield: res.shift(),
                    cost: res,
                    tier: Number(targetElement.parentElement.parentElement.id.split('_')[1]),
                    rowIndex: Number(targetElement.parentElement.getAttribute('row-index')),
                }
            })(targetElement.innerHTML)
          }
    const event = { eventType, eventData }
    console.log(event)
    socket.emit('player:attempt:action:part', event)
}

function CancelCurrentAction() {
    socket.emit('player:attempt:action:cancel')
}

function CompleteCurrentAction() {
    // Remove buttons so players know their action has been sent off
    document.querySelector<HTMLElement>('.action-button-container')?.remove()
    socket.emit('player:attempt:action:complete')
}

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
        const ActionElements = Array.from(document.querySelectorAll<HTMLElement>('.dev-card')).concat(Array.from(document.querySelectorAll<HTMLElement>('#market > .gem:not([gem-type="gold"])')))
        for (const element of ActionElements) {
            element.onclick = AttemptActionPart
        }
    }

    const DrawCard = (card, tier, rowIndex) => {
        console.log('DrawCard')
        console.log(card)
        console.log(`Tier: ${tier} | Index: ${rowIndex}`)
        const newCardElement = UIUpdates.DrawCard(card, tier, rowIndex)
        if (card !== null) newCardElement.onclick = AttemptActionPart
    }

    const GameWon = winner => {
        const player = winner === socket.id ? 'local' : winner
        UIUpdates.HighlightWinner(player)
        alert(player === 'local' ? 'You won' : 'Game over')
    }

    const NobleWon = (id, nobleIndex) => {
        const player = id === socket.id ? 'local' : id
        UIUpdates.UpdateNobles(player, nobleIndex)
    }

    const TurnStart = () => {
        console.log('TurnStart')
        UIUpdates.UpdateCurrentPlayer('local')
        isMyTurn = true
    }

    const TurnUpdate = id => {
        console.log('TurnUpdate')
        UIUpdates.UpdateCurrentPlayer(id)
        isMyTurn = false
    }

    const ActionPartSuccess = data => {
        console.log('ActionPartSuccess')
        console.log(data)
        const ActionButtons = UIUpdates.UpdateAction(data, isMyTurn)
        for (const button of ActionButtons) {
            if (button.classList.contains('cancel')) {
                button.onclick = CancelCurrentAction
            } else if (button.classList.contains('confirm')) {
                button.onclick = CompleteCurrentAction
            }
        }
    }

    const ActionCancelSuccess = data => {
        console.log('ActionCancelSuccess')
        UIUpdates.CancelAction(data)
    }

    const ActionCompleteSuccess = (data, id) => {
        console.log('ActionCompleteSuccess')
        console.log(data)
        console.log(id)
        UIUpdates.CompleteAction(data, id === socket.id ? 'local' : id)
    }

    socket.on('player:join', PlayerJoin)
    socket.on('player:left', PlayerLeft)
    socket.once('ask:playercount', GetPlayerCount)
    socket.once('ask:playerready', AskPlayerReady)
    socket.once('game:start', GameStart)
    socket.on('game:drawcard', DrawCard)
    socket.once('game:win', GameWon)
    socket.on('game:noble:won', NobleWon)
    socket.on('turn:start', TurnStart)
    socket.on('turn:update', TurnUpdate)
    socket.on('player:success:action:part', ActionPartSuccess)
    socket.on('player:success:action:cancel', ActionCancelSuccess)
    socket.on('player:success:action:complete', ActionCompleteSuccess)
}

window.onload = () => {
    RegisterEventHandlers()
    UIUpdates.AddNewInventoryShelfForPlayer('local', PlayerCount++)
    socket.emit('game:join')
}
