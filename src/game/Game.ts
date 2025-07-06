import { v4 as uuidv4 } from "uuid"

export class Player  {
    id: string
    constructor(id: string) {
        this.id = id
    }
}

export class Game {
    id: string
    players: Player[]
    hasStarted: boolean
    constructor(startingPlayer: Player) {
        this.id = uuidv4()
        this.players = []
        this.Join(startingPlayer)
    }

    Join(player: Player) {
        this.players.push(player)
    }

    Leave(playerID: string) {
        this.players = this.players.filter(player => player.id !== playerID)
    }
}
