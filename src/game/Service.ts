import { Server, Socket } from 'socket.io'
import { Player, Game } from './Game.js'

const GAMEINSTANCES: Game[] = []
const MAX_PLAYER_COUNT = 4

export function JoinGame(IOServer: Server, socket: Socket): void {
    const newPlayer: Player = new Player(socket.id)

    const gameToJoin = GAMEINSTANCES.find(game => game.players.length < MAX_PLAYER_COUNT)

    if (!gameToJoin) {
        GAMEINSTANCES.push(new Game(newPlayer))
    } else {
        IOServer.to(gameToJoin.id).emit('player:join', newPlayer.id)
        gameToJoin.Join(newPlayer)
    }

    socket.join(GAMEINSTANCES.at(-1).id)
    
    console.log(`Player ${socket.id} joined game ${GAMEINSTANCES.length}`)
}

export function LeaveGame(io: Server, socket: Socket) {
    console.log(`${socket.id} is disconnecting`)

    const game = GAMEINSTANCES.find(game => game.players.find(player => player.id === socket.id))

    game.Leave(socket.id)

    if (game.players.length > 0) {
        io.to(game.id).emit('player:left', socket.id)
    } else {
        const gameIndex = GAMEINSTANCES.findIndex(game => game.id === game.id)
        GAMEINSTANCES.splice(gameIndex, 1)
    }
    console.log(GAMEINSTANCES)
}
