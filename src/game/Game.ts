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

type ActionPart = {
    eventType: 'GEM_SELECT'
    eventData: {
        gem_type: GemType
    }
} | {
    eventType: 'DEV_SELECT'
    eventData: {
        card_data: {
            points: number
            yield: [GemType, number]
            cost: [GemType, number][]
            tier: 1 | 2 | 3
            rowIndex: 0 | 1 | 2 | 3
        }
    }
}

type Action = ActionPart[]

type GemEngine = {
    token_quantity: number
    yield: number
}

type PlayerEngine = {
    blue: GemEngine
    red: GemEngine
    white: GemEngine
    green: GemEngine
    black: GemEngine
    gold: GemEngine    
}

const GEMTYPES: GemType[] = ['blue', 'red', 'white', 'green', 'black', 'gold']
const GOLD_GEM_COUNT = 5
const POINTS_TO_WIN = 15

export class Player  {
    id: string
    isReady: boolean
    points: number
    engine: PlayerEngine
    constructor(id: string) {
        this.id = id
        this.isReady = false
        this.points = 0
        this.engine = {
            blue: {
                token_quantity: 0,
                yield: 0
            },
            red: {
                token_quantity: 0,
                yield: 0
            },
            white: {
                token_quantity: 0,
                yield: 0
            },
            green: {
                token_quantity: 0,
                yield: 0
            },
            black: {
                token_quantity: 0,
                yield: 0
            },
            gold: {
                token_quantity: 0,
                yield: 0 // This should never change but is here for completness
            }
        }
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
    currentPlayerIndex: number
    currentAction: Action
    constructor(startingPlayer: Player) {
        this.id = uuidv4()
        // Blank game state to be populated later on start
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
            this.currentPlayerIndex = 0
            this.currentPlayer = this.players[this.currentPlayerIndex]
            return true
        }
        return false
    }

    Draw(tier: 1 | 2 | 3, rowIndex = -1): Card | null {
        const drawpile: Card[] = this.state[`tier_${tier}_draw`]
        const output: Card[] = this.state[`tier_${tier}_curr`]
        if (drawpile.length === 0 || (output.length === 4 && rowIndex === -1)) return null
        const cardIndex = Math.floor(Math.random() * drawpile.length)
        const card: Card = drawpile.splice(cardIndex, 1)[0]
        rowIndex < 0 ? output.push(card) : output[rowIndex] = card
        return card
    }

    GetPlayerByID(id: string): Player {
        return this.players.find(p => p.id === id)
    }

    AttemptActionPart(playerID: string, data: ActionPart): boolean {
        console.log(JSON.stringify(this.state.current_market))
        console.log(data)
        // Validate player turn order
        console.log('Validating turn order')
        if (this.currentPlayer.id !== playerID) return false
        if (!this.currentAction) this.currentAction = [] // If not action instance exists, create one
        const CurrentEvents = this.currentAction.map(part => part.eventType)
        // Validate action event type
        console.log('Validating event type')
        if (CurrentEvents.length > 0 && !CurrentEvents.includes(data.eventType)) return false
        // Validate the event data
        if (data.eventType === 'GEM_SELECT') {
            const gemTypeIndex = GEMTYPES.findIndex(type => type === data.eventData.gem_type)
            const CurrentGemTypesInAction = this.currentAction.map(part => part.eventType === 'GEM_SELECT' ? part.eventData.gem_type : null)
            console.log(CurrentGemTypesInAction)
            // Is the player trying to take a gem when there are none left of that type?
            console.log('Validating market count for gem type ' + data.eventData.gem_type)
            if (this.state.current_market[gemTypeIndex] === 0) return false
            // Check that the added gem would be a valid selection
            if (CurrentEvents.length > 0) {
                // Is the player trying to take more than 3 gems?
                console.log('Validating players gem count in current action')
                if (CurrentEvents.length === 3) return false
                // If the player has already selected two of the same gem
                console.log('Validating player already chosen 2 of same gem type')
                if (CurrentGemTypesInAction.length === 2 && CurrentGemTypesInAction[0] === CurrentGemTypesInAction[1]) return false
                // Trying to take 2 of the same gem
                if (CurrentGemTypesInAction.includes(data.eventData.gem_type)) {
                    console.log('Trying to select two of same gem: '+ data.eventData.gem_type)
                    // We already have two gems selected
                    console.log('Validating player does not have two gems already selected when trying to select a duplicate gem')
                    if (CurrentEvents.length >= 2) return false
                    // Is the player trying to take 2 gems of the same type without there being enough to do so?
                    // In order to take two of the same, there must have been 4 when we took the first so there should now be 3 in order for the action to be valid
                    console.log('Validating room in market to take 2 of the same gem type')
                    if (this.state.current_market[gemTypeIndex] < 3) return false
                }
            }
            // Check if the player can accommodate the added gem
            console.log('Validating players gem count in engine')
            console.log(JSON.stringify(this.currentPlayer.engine))
            const totalTokenCountFromEngine = Object.values(this.currentPlayer.engine).reduce((total, engine) => total + engine.token_quantity, 0)
            const totalTokenCountFromCurrAction = this.currentAction.length
            if (totalTokenCountFromEngine + totalTokenCountFromCurrAction + 1 > 10) return false
            // Event is valid
            console.log('Event is valid, updating state')
            this.state.current_market[gemTypeIndex]--
            this.currentAction.push(data)
            return true
        } else if (data.eventType === 'DEV_SELECT') {
            // Check if player selection would be valid with the added dev card
            if (CurrentEvents.length > 0) return false
            console.log(JSON.stringify(data))
            console.log(JSON.stringify(this.currentPlayer.engine))
            // Check that the player can afford the dev card (include gold in the calculation)
            let remainder = 0
            for (const cost of data.eventData.card_data.cost) {
                const [type, quantity] = cost
                // Doing cost - engine allows us to see how much gold the player will need to purchase the dev card, if any
                remainder += Math.max(0, quantity - (this.currentPlayer.engine[type].yield + this.currentPlayer.engine[type].token_quantity))
            }
            console.log('Remainder: ' + remainder)
            if (remainder > this.currentPlayer.engine.gold.token_quantity) return false // Player cannot afford the card
            // Event is valid
            console.log('Event is valid')
            this.currentAction.push(data)
            return true
        }
    }

    AttemptCompleteAction(playerID: string): boolean {
        console.log('Complete action')
        // If it is not the players turn
        if (this.currentPlayer.id !== playerID) return false
        // If there is no current action to cancel
        if (!this.currentAction?.length) return false
        for (const action of this.currentAction) {
            console.log(JSON.stringify(action))
            if (action.eventType === 'DEV_SELECT') {
                // TODO: We should add reservation logic here as well once we have the data setup for it
                // TODO: Check nobles?
                // Handle points
                this.currentPlayer.points += action.eventData.card_data.points
                // Handle cost
                let goldRemainder = 0
                for (const cost of action.eventData.card_data.cost) {
                    const [type, quantity] = cost
                    let tokenRequirement = quantity - this.currentPlayer.engine[type].yield
                    if (tokenRequirement > 0) {
                        this.currentPlayer.engine[type].token_quantity -= tokenRequirement
                        if (this.currentPlayer.engine[type].token_quantity < 0) {
                            goldRemainder += Math.abs(this.currentPlayer.engine[type].token_quantity)
                            this.currentPlayer.engine[type].token_quantity = 0
                        }
                        // Update market state
                        const GemTypeIndex = GEMTYPES.findIndex(t => t === type)
                        this.state.current_market[GemTypeIndex] += tokenRequirement
                    }
                }
                this.currentPlayer.engine['gold'].token_quantity -= goldRemainder
                // Handle engine yield increase
                const [yeildType, yieldAmount] = action.eventData.card_data.yield
                this.currentPlayer.engine[yeildType].yield += yieldAmount
                // Update state
                this.state[`tier_${action.eventData.card_data.tier}_curr`][action.eventData.card_data.rowIndex] = null
            } else if (action.eventType === 'GEM_SELECT') {
                this.currentPlayer.engine[action.eventData.gem_type].token_quantity++
            }
        }
        return true
    }

    AttemptCancelAction(playerID: string): boolean {
        // If it is not the players turn
        if (this.currentPlayer.id !== playerID) return false
        // If there is no current action to cancel
        if (!this.currentAction?.length) return false
        for (const action of this.currentAction) {
            if (action.eventType === 'DEV_SELECT') {
                // TODO: Reserve logic once we have them
            } else if (action.eventType === 'GEM_SELECT') {
                const gemIndex = GEMTYPES.findIndex(type => type === action.eventData.gem_type)
                this.state.current_market[gemIndex]++
            }
        }
        return true
    }

    ResetCurrentActionAfterCancelOrComplete() {
        this.currentAction.length = 0
    }

    EndCurrentTurn(): string {
        this.currentPlayerIndex = ++this.currentPlayerIndex % this.playerCount
        this.currentPlayer = this.players[this.currentPlayerIndex]
        return this.currentPlayer.id
    }

    CheckForWin(): string | null {
        return this.players.find(p => p.points >= POINTS_TO_WIN)?.id || null
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
