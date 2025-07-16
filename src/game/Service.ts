import { Server, Socket } from 'socket.io'
import { Player, Game } from './Game.js'

const GAMEINSTANCES: Game[] = []
const MAX_PLAYER_COUNT = 4
const SocketsAwaitingPlayerCountResponse: string[] = []

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
                // TODO: Establish turn order
            }
        }
    }
}
