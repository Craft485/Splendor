import { v4 as uuidv4 } from "uuid"

export class Player  {
    id: string
    constructor(id: string) {
        this.id = id
    }

    static IsPlayer(obj: any): boolean {
        return obj instanceof Player
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

    Join(player: Player | string) {
        this.players.push(Player.IsPlayer(player) ? player as Player : new Player(player as string))
    }
}
