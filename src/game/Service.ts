import { Server, Socket } from 'socket.io'
import { Player, Game } from './Game.js'

const GAMEINSTANCES: Game[] = []
const MAX_PLAYER_COUNT = 4
const SocketsAwaitingPlayerCountResponse: string[] = []

const sleep = async (time_ms: number) => new Promise(resolve => setTimeout(resolve, time_ms))

function GetGameInstanceByPlayerID(id: string): Game | undefined {
    return GAMEINSTANCES.find(game => game.players.find(player => player.id === id))
}

function GetGameIndexByGameID(id: string): number | undefined {
    const index = GAMEINSTANCES.findIndex(game => game.id === id)
    return index >= 0 ? index : undefined
}

export function JoinGame(IOServer: Server, socket: Socket): void {
    const newPlayer: Player = new Player(socket.id)

    const gameToJoin = GAMEINSTANCES.find(game => game.players.length < game.playerCount && game.isSetup === true)

    if (!gameToJoin) {
        GAMEINSTANCES.push(new Game(newPlayer))
        // Get player count from user
        socket.emit('ask:playercount')
        SocketsAwaitingPlayerCountResponse.push(socket.id)
    } else {
        IOServer.to(gameToJoin.id).emit('player:join', newPlayer.id)
        for (const player of gameToJoin.players) {
            socket.emit('player:join', player.id)
        }
        gameToJoin.Join(newPlayer)
        socket.emit('ask:playerready')
    }

    socket.join(GAMEINSTANCES.at(-1).id)
    
    console.log(`Player ${socket.id} joined game ${GAMEINSTANCES.length}`)
}

export function LeaveGame(io: Server, socket: Socket): void {
    console.log(`${socket.id} is disconnecting`)

    const game = GetGameInstanceByPlayerID(socket.id)

    if (game !== undefined) {
        game.Leave(socket.id)
        
        if (game.players.length > 0) {
            io.to(game.id).emit('player:left', socket.id)
        } else {
            const gameIndex = GetGameIndexByGameID(game.id)
            if (gameIndex !== undefined) {
                GAMEINSTANCES.splice(gameIndex, 1)
            }
        }
    }
    // console.log(GAMEINSTANCES)
}

export function PlayerCountResponse(socket: Socket, count: number): void {
    if (SocketsAwaitingPlayerCountResponse.includes(socket.id) && count <= MAX_PLAYER_COUNT) {
        const AwaitingIndex= SocketsAwaitingPlayerCountResponse.findIndex(s => s === socket.id)
        SocketsAwaitingPlayerCountResponse.splice(AwaitingIndex, 1)
        const game: Game = GetGameInstanceByPlayerID(socket.id)
        game.playerCount = count
        game.isSetup = true // FIXME: May need to change in the future to have the game itself itself check to see if it is setup
        console.log(`[Service]: Socket ${socket.id} asked for player count ${count}, game is setup`)
        socket.emit('ask:playerready')
    }
}

export async function PlayerReadyResponse(io: Server, socket: Socket): Promise<void> {
    const game = GetGameInstanceByPlayerID(socket.id)
    if (game) {
        const player = game.players.find(p => p.id === socket.id)
        player.isReady = true
        console.log(`[Service]: Socket ${socket.id} is ready to play`)
        if (game.players.filter(p => p.isReady).length === game.players.length) {
            // Try to start game
            const gameStarted = await game.Start()
            if (gameStarted) {
                io.to(game.id).emit('game:start', game.state)
                // The game will assign who the current player is on start
                const sockets = await io.in(game.id).fetchSockets()
                for (const player of sockets) {
                    if (player.id === game.currentPlayer.id) {
                        player.emit('turn:start')
                    } else {
                        player.emit('turn:update', game.currentPlayer.id)
                    }
                }
            }
        }
    }
}

export function AttemptActionPart(io: Server, socket: Socket, data: any) {
    const game = GetGameInstanceByPlayerID(socket.id)
    if (game) {
        const ActionSuccess = game.AttemptActionPart(socket.id, data)
        if (ActionSuccess) {
            // Inform all players so they can update their UI
            io.to(game.id).emit('player:success:action:part', data)
        }
    }
}

export function AttemptActionCancel(io: Server, socket: Socket) {
    const game = GetGameInstanceByPlayerID(socket.id)
    if (game) {
        const CancelWasSuccessful = game.AttemptCancelAction(socket.id)
        if (CancelWasSuccessful) {
            io.to(game.id).emit('player:success:action:cancel', game.currentAction)
            game.ResetCurrentActionAfterCancelOrComplete()
        }
    }
}

export async function AttemptActionComplete(io: Server, socket: Socket) {
    const game = GetGameInstanceByPlayerID(socket.id)
    if (game) {
        const ActionCompleteSuccessful = game.AttemptCompleteAction(socket.id)
        if (ActionCompleteSuccessful) {
            await sleep(1000) // Sleep to give time for other players to process what is happening
            io.to(game.id).emit('player:success:action:complete', game.currentAction, game.currentPlayer.id)
            if (game.currentAction[0].eventType === 'DEV_SELECT') {
                // Draw a new dev card
                const tier = game.currentAction[0].eventData.card_data.tier
                const index = game.currentAction[0].eventData.card_data.rowIndex
                const newCard = game.Draw(tier, index)
                io.to(game.id).emit('game:drawcard', newCard, tier, index)
                await sleep(1000)
                const nobleIndex = game.CheckForNoble(socket.id)
                if (nobleIndex !== null) {
                    io.in(game.id).emit('game:noble:won', socket.id, nobleIndex)
                }
            }
            game.ResetCurrentActionAfterCancelOrComplete()
            await sleep(1000)
            const winner = game.CheckForWin()
            if (winner !== null) {
                io.to(game.id).emit('game:win', winner)
                io.in(game.id).disconnectSockets(true)
                return
            }
            const newCurrentPlayerID = game.EndCurrentTurn()
            const sockets = await io.in(game.id).fetchSockets()
            for (const player of sockets) {
                if (player.id === newCurrentPlayerID) {
                    player.emit('turn:start')
                } else {
                    player.emit('turn:update', newCurrentPlayerID)
                }
            }
        }
    }
}
