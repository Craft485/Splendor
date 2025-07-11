const body = document.body

export function AddNewInventoryShelfForPlayer(id: string, playerCount: number): void {
    const newShelf = document.createElement('div')
    newShelf.id = id
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
