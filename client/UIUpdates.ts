const body = document.body

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
    tier_3_curr: Card[]
    tier_2_curr: Card[]
    tier_1_curr: Card[]
    current_market: number[]
    nobles: Noble[]
}

export function AddNewInventoryShelfForPlayer(id: string, playerCount: number): void {
    const newShelf = document.createElement('div')
    newShelf.id = id
    // Placement of the engine/shelf is dependent on the player count
    // NOTE: we may want to change the order of this later to provide better consistency across different players
    newShelf.className = `inventory-shelf ${
        playerCount > 2 
        ? `vertical-shelf ${playerCount === 3 
                            ? 'left-shelf' 
                            : 'right-shelf'}` 
        : `horizontal-shelf ${playerCount === 1 
                              ? 'bottom-shelf' 
                              : 'top-shelf'}`
    }`
    newShelf.innerHTML = `
    <div class="points-display-container">Points: <span class="point-display">0</span></div>
    <div class="gem-sub-shelf">
        <div class="gem-container">
            <div gem-type="blue" class="gem">0</div>
            <span gem-type="blue" class="dev-gem-yield">0</span>
        </div>
        <div class="gem-container">
            <div gem-type="red" class="gem">0</div>
            <span gem-type="red" class="dev-gem-yield">0</span>
        </div>
        <div class="gem-container">
            <div gem-type="white" class="gem">0</div>
            <span gem-type="white" class="dev-gem-yield">0</span>
        </div>
        <div class="gem-container">
            <div gem-type="green" class="gem">0</div>
            <span gem-type="green" class="dev-gem-yield">0</span>
        </div>
        <div class="gem-container">
            <div gem-type="black" class="gem">0</div>
            <span gem-type="black" class="dev-gem-yield">0</span>
        </div>
        <div class="gem-container">
            <div gem-type="gold" class="gem">0</div>
            <span gem-type="gold" class="dev-gem-yield">&nbsp;</span>
        </div>
    </div>
    <div class="nobles-count-display-container">Nobles: <span class="noble-count">0</span></div>`
    body.appendChild(newShelf)
}

export function AddPlayerCountBlocker(): HTMLButtonElement {
    const blocker = document.createElement('div')
    blocker.className = 'blocker'
    blocker.innerHTML = `
    Select the number of players you want to have in this game: <select id="player-count-selection">
    <option value="">No Selection</option>
    <option value="2">2</option>
    <option value="3">3</option>
    <option value="4">4</option>
    </select>
    <br/>
    <button class="confirm-button player-count">Confirm Player Count</button>`
    body.appendChild(blocker)
    return document.querySelector<HTMLButtonElement>('.blocker > .confirm-button.player-count')
}

export function RemovePlayerCountBlocker(): void {
    document.querySelector('.blocker')?.remove()
}

export function AddReadyBlocker(): HTMLButtonElement {
    const blocker = document.createElement('div')
    blocker.className = 'blocker'
    blocker.innerHTML = `You have joined a game! Click when ready to start: <button class="confirm-button player-ready">Ready</button>`
    body.appendChild(blocker)
    return document.querySelector<HTMLButtonElement>('.blocker > .confirm-button.player-ready')
}

export function UpdateReadyBlocker() {
    const blocker = document.querySelector('.blocker')
    blocker.innerHTML = `Waiting for remaining players to be ready...`
}

export function RemoveReadyBlocker() {
    document.querySelector('.blocker')?.remove()
}

// Cost displaying will be the same for both dev cards and nobles
function CreateDevCardCostDisplay(data: GemCost[]): HTMLDivElement {
    const container = document.createElement('div')
    container.className = 'cost-container'
    const costRow1 = document.createElement('div')
    costRow1.className = 'cost-row'
    const costRow2 = document.createElement('div')
    costRow2.className = 'cost-row'

    for (let i = 0; i < data.length; i++) {
        const gemContainer = document.createElement('div')
        gemContainer.className = 'gem-container'
        const gem = document.createElement('div')
        gem.className = 'gem'
        gem.setAttribute('gem-type', data[i].gem_type)
        gem.innerText = String(data[i].quantity)
        gemContainer.appendChild(gem)
        if (i === 0 || i === 3) {
            costRow1.appendChild(gemContainer)
        } else {
            costRow2.appendChild(gemContainer)
        }
    }

    container.appendChild(costRow1)
    container.appendChild(costRow2)

    return container
}

function CreateDevCardHeaderDisplay(card: Card): HTMLDivElement {
    const container = document.createElement('div')
    container.className = 'dev-card-header'
    
    const pointsDisplay = document.createElement('span')
    pointsDisplay.innerText = String(card.points)
    container.appendChild(pointsDisplay)
    
    const yieldDisplay = document.createElement('span')
    yieldDisplay.className = 'gem'
    yieldDisplay.setAttribute('gem-type', card.yeild_gem_type)
    yieldDisplay.innerText = '1'
    container.appendChild(yieldDisplay)

    return container
}

export function SetupBoardState(state: GameState) {
    const noblesContainer = document.getElementById('nobles')
    for (const noble of state.nobles) {
        // <div class="noble-slot"></div>
        const nobleSlot = document.createElement('div')
        nobleSlot.className = 'noble-slot'
        nobleSlot.appendChild(CreateDevCardCostDisplay(noble.requirements))
        noblesContainer.appendChild(nobleSlot)
    }

    const tier3Slots = Array.from(document.querySelectorAll<HTMLDivElement>('#tier_3 > .card-slot:not(:first-child)'))
    const tier2Slots = Array.from(document.querySelectorAll<HTMLDivElement>('#tier_2 > .card-slot:not(:first-child)'))
    const tier1Slots = Array.from(document.querySelectorAll<HTMLDivElement>('#tier_1 > .card-slot:not(:first-child)'))
    const tiers = [tier1Slots, tier2Slots, tier3Slots]
    const tiers_data = [state.tier_1_curr, state.tier_2_curr, state.tier_3_curr]
    for (let i = 0; i < tiers.length; i++) {
        const tierSlots = tiers[i]
        const tierData = tiers_data[i]
        for (let j = 0; j < tierData.length; j++) {
            const currSlot = tierSlots[j]
            const currDevCard = tierData[j]
            const cardDisplay = document.createElement('div')
            cardDisplay.className = 'dev-card'
            const costDisplay = CreateDevCardCostDisplay(currDevCard.cost)
            const headerDisplay = CreateDevCardHeaderDisplay(currDevCard)
            cardDisplay.appendChild(headerDisplay)
            cardDisplay.appendChild(costDisplay)
            currSlot.appendChild(cardDisplay)
        }
    }

    const marketGems = Array.from(document.querySelectorAll<HTMLDivElement>('#market > .gem'))
    for (let i = 0; i < marketGems.length; i++) {
        marketGems[i].innerText = String(state.current_market[i])
    }
}
