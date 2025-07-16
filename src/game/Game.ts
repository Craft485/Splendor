import { v4 as uuidv4 } from "uuid"
import { readFile } from 'fs/promises'

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

type CSV_Dev_Card_Row = [number, number, GemType | '', number, number, number, number, number]

const GEMTYPES: GemType[] = ['blue', 'red', 'white', 'green', 'black', 'gold']
const GOLD_GEM_COUNT = 5

export class Player  {
    id: string
    isReady: boolean
    // TODO: Some sort of engine state
    constructor(id: string) {
        this.id = id
        this.isReady = false
    }
}

export class Game {
    id: string
    players: Player[]
    playerCount: number
    isSetup: boolean
    hasStarted: boolean
    state: GameState
    currentPlayer: Player
    constructor(startingPlayer: Player) {
        this.id = uuidv4()
        // Blank game state rto be populated later on start
        this.state = {
            tier_3_draw: [],
            tier_3_curr: [],
            tier_2_draw: [],
            tier_2_curr: [],
            tier_1_draw: [],
            tier_1_curr: [],
            current_market: [],
            nobles: []
        }
        this.players = []
        this.Join(startingPlayer)
        this.isSetup = false
        this.playerCount = -1 // Signals the game is not done being setup
    }

    Join(player: Player) {
        this.players.push(player)
    }

    Leave(playerID: string) {
        this.players = this.players.filter(player => player.id !== playerID)
    }

    async Start(): Promise<boolean> {
        if (this.players.filter(p => p.isReady).length === this.playerCount) {
            await SetupBoardFromCSV(this)
            this.hasStarted = true
            return true
        }
        return false
    }

    Draw(tier: number): Card | null {
        const drawpile: Card[] = this.state[`tier_${tier}_draw`]
        const output: Card[] = this.state[`tier_${tier}_curr`]
        if (drawpile.length === 0 || output.length === 4) return null
        const cardIndex = Math.floor(Math.random() * drawpile.length)
        const card: Card = drawpile.splice(cardIndex, 1)[0]
        output.push(card)
        return card
    }
}

// Durstenfeld shuffle taken from https://stackoverflow.com/a/12646864/11614446
function shuffle(array: (Card | Noble)[]) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
}

// Build a gem array, based on a gem type order of blue red white green black
function BuildCostArray(...gems: number[]): GemCost[] {
    const result: GemCost[] = []
    for (let i = 0; i < gems.length; i++) {
        if (gems[i] > 0) {
            result.push({
                gem_type: GEMTYPES[i],
                quantity: gems[i]
            })
        }
    }
    return result
}

async function SetupBoardFromCSV(game: Game) {
    const data = (await readFile('./data/dev_cards.csv', { encoding: 'utf-8' })).trim().replaceAll('\r', '').split('\n').map(s => s.split(','))
    data.shift() // Remove column headers
    for (const row of data) {
        const [ tier, points, yeild_gem_type, blue, red, white, green, black ]: CSV_Dev_Card_Row = row.map(x => !isNaN(Number(x)) && x !== '' ? Number(x) : x) as CSV_Dev_Card_Row
        let devCard: Noble | Card | null = null
        if (yeild_gem_type === '') { // Noble
            devCard = {
                points: points,
                requirements: BuildCostArray(blue, red, white, green, black)
            }
        } else { // Regular dev card
            devCard = {
                points: points,
                cost: BuildCostArray(blue, red, white, green, black),
                yeild_gem_type: yeild_gem_type
            }
        }
        switch (tier) {
            case 3:
                game.state.tier_3_draw.push(devCard as Card)
                break;
            case 2:
                game.state.tier_2_draw.push(devCard as Card)
                break;
            case 1:
                game.state.tier_1_draw.push(devCard as Card)
                break;
            case 0:
                game.state.nobles.push(devCard as Noble)
                break;
        }
    }
    shuffle(game.state.tier_1_draw)
    shuffle(game.state.tier_2_draw)
    shuffle(game.state.tier_3_draw)
    shuffle(game.state.nobles)
    game.state.nobles.length = game.playerCount + 1
    // Get the number of non-gold gems to have in the market
    const numberOfRegularGems = game.playerCount === 2 ? 4 : (game.playerCount === 3 ? 5 : 7)
    game.state.current_market = new Array(5).fill(numberOfRegularGems)
    game.state.current_market.push(GOLD_GEM_COUNT)
    // Draw inital dev cards
    for (let i = 0; i < 4; i++) {
        game.Draw(3)
        game.Draw(2)
        game.Draw(1)
    }
}
