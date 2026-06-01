const gap = 10
let droneIdSeq = 1

const farmEl = document.getElementById('farm')
const dronesLayer = document.getElementById('dronesLayer')
const logEl = document.getElementById('log')

const elMoney = document.getElementById('money')
const elFood = document.getElementById('food')
const elFarmScore = document.getElementById('farmScore')
const elDroneTotal = document.getElementById('droneTotal')
const elProductionRate = document.getElementById('productionRate')
const elWeather = document.getElementById('weather')
const elGridSize = document.getElementById('gridSize')

const elCountPlanter = document.getElementById('count-planter')
const elCountWater = document.getElementById('count-water')
const elCountPesticide = document.getElementById('count-pesticide')
const elCountCollector = document.getElementById('count-collector')
const elCountCharger = document.getElementById('count-charger')

const btnUpgradeSpeed = document.getElementById('upgradeSpeed')
const btnUpgradeBattery = document.getElementById('upgradeBattery')
const btnUpgradeLuck = document.getElementById('upgradeLuck')
const btnExpandFarm = document.getElementById('expandFarm')

const state = {
  money: 100,
  food: 0,
  production: 0,
  weather: 'Calmo',
  weatherTick: 0,
  gridSize: 8,
  upgrades: {
    speed: 0,
    battery: 0,
    luck: 0,
  },
  droneCounts: {
    planter: 0,
    water: 0,
    pesticide: 0,
    collector: 0,
    charger: 0,
  },
  drones: [],
  chargers: [],
  tiles: [],
  harvestLog: [],
  selectedDrone: null,
  mouseDown: false,
}

const prices = {
  planter: 50,
  water: 75,
  pesticide: 110,
  collector: 95,
  charger: 120,
  speed: 140,
  battery: 160,
  luck: 180,
  farmExpand: 200,
}

const emojis = {
  planter: '🌱',
  water: '💧',
  pesticide: '☠️',
  collector: '📦',
  charger: '🔌',
}

const weatherPool = [
  { name: 'Calmo', growth: 1, pest: 1, water: 1 },
  { name: 'Nublado', growth: 1.06, pest: 1, water: 1 },
  { name: 'Chuva', growth: 1.02, pest: 0.92, water: 0.72 },
  { name: 'Seco', growth: 0.92, pest: 1.08, water: 1.35 },
  { name: 'Vento forte', growth: 0.98, pest: 1.2, water: 1.05 },
]

function rand(min, max) {
  return Math.random() * (max - min) + min
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value))
}

function safeText(el, value) {
  if (el) el.textContent = String(value)
}

function log(text) {
  if (!logEl) return
  const row = document.createElement('div')
  row.textContent = `> ${text}`
  logEl.prepend(row)
  while (logEl.children.length > 18) {
    logEl.removeChild(logEl.lastChild)
  }
}

function getTileAt(x, y) {
  return state.tiles.find(t => t.x === x && t.y === y) || null
}

function getChargerAt(x, y) {
  return state.chargers.find(c => c.x === x && c.y === y) || null
}

function getWeatherData() {
  return weatherPool.find(w => w.name === state.weather) || weatherPool[0]
}

function cellToPx(x, y) {
  if (!farmEl) return { left: 0, top: 0, tileW: 0, tileH: 0 }

  const rect = farmEl.getBoundingClientRect()
  const innerW = Math.max(0, rect.width - 36)
  const innerH = Math.max(0, rect.height - 36)
  const tileW = (innerW - gap * (state.gridSize - 1)) / state.gridSize
  const tileH = (innerH - gap * (state.gridSize - 1)) / state.gridSize

  return {
    left: 18 + x * (tileW + gap) + tileW / 2,
    top: 18 + y * (tileH + gap) + tileH / 2,
    tileW,
    tileH,
  }
}

function updateTileVisual(tile) {
  const el = tile.element
  if (!el) return

  const stage = el.querySelector('.stage')
  const meter = el.querySelector('.meter i')

  el.classList.toggle('planted', tile.planted)
  el.classList.toggle('harvestable', tile.planted && tile.growth >= 100)
  el.classList.toggle('watering', tile.waterBoost > 0)
  el.classList.toggle('pest', tile.pestShield > 0)

  if (!tile.planted) {
    el.classList.add('empty')
    if (stage) stage.textContent = ''
    if (meter) meter.style.width = '0%'
    return
  }

  el.classList.remove('empty')

  const pct = clamp(tile.growth, 0, 100)
  if (meter) meter.style.width = `${pct}%`

  if (stage) {
    if (tile.growth < 25) stage.textContent = '🌱'
    else if (tile.growth < 55) stage.textContent = '🌿'
    else if (tile.growth < 100) stage.textContent = '🌾'
    else stage.textContent = '✅'
  }
}

function updateChargerVisual(charger) {
  const el = charger.element
  if (!el) return
  
  el.classList.toggle('active', charger.chargingDrone !== null)
}

function resetTile(tile) {
  tile.planted = false
  tile.growth = 0
  tile.waterBoost = 0
  tile.pestShield = 0
  updateTileVisual(tile)
}

function initFarm() {
  if (!farmEl) return

  farmEl.innerHTML = ''
  state.tiles = []
  state.chargers = []

  for (let y = 0; y < state.gridSize; y++) {
    for (let x = 0; x < state.gridSize; x++) {
      const tile = document.createElement('div')
      tile.className = 'tile empty'
      tile.dataset.x = x
      tile.dataset.y = y
      tile.innerHTML = `
        <span class="stage"></span>
        <span class="meter"><i></i></span>
      `
      farmEl.appendChild(tile)

      state.tiles.push({
        x,
        y,
        growth: 0,
        waterBoost: 0,
        pestShield: 0,
        planted: false,
        element: tile,
      })
    }
  }

  // Atualizar CSS grid
  farmEl.style.gridTemplateColumns = `repeat(${state.gridSize}, minmax(54px, 1fr))`
  farmEl.style.gridTemplateRows = `repeat(${state.gridSize}, minmax(54px, 1fr))`
}

function spawnCharger(x, y) {
  if (!farmEl) return

  const tileEl = farmEl.querySelector(`[data-x="${x}"][data-y="${y}"]`)
  if (!tileEl) return

  const charger = {
    x,
    y,
    chargingDrone: null,
    element: tileEl,
  }

  tileEl.classList.add('charger')
  tileEl.innerHTML = `
    <span class="charger-icon">🔌</span>
    <span class="meter"><i></i></span>
  `

  state.chargers.push(charger)
  updateChargerVisual(charger)
}

function removeChargerAt(x, y) {
  const idx = state.chargers.findIndex(c => c.x === x && c.y === y)
  if (idx !== -1) {
    const charger = state.chargers[idx]
    charger.element.classList.remove('charger')
    charger.element.innerHTML = `
      <span class="stage"></span>
      <span class="meter"><i></i></span>
    `
    state.chargers.splice(idx, 1)
  }
}

function syncDronePosition(drone, snap = false) {
  if (!drone.element) return
  const pos = cellToPx(drone.x, drone.y)

  if (snap) {
    drone.element.style.transition = 'none'
    drone.element.style.left = `${pos.left}px`
    drone.element.style.top = `${pos.top}px`
    drone.element.style.transform = 'translate(-50%, -50%) scale(1)'
    requestAnimationFrame(() => {
      if (drone.element) drone.element.style.transition = ''
    })
    return
  }

  drone.element.style.left = `${pos.left}px`
  drone.element.style.top = `${pos.top}px`
}

function updateDroneBattery(drone) {
  if (!drone.element) return
  const batteryBar = drone.element.querySelector('.battery-bar i')
  if (batteryBar) {
    batteryBar.style.width = `${clamp(drone.battery, 0, 100)}%`
  }
}

function spawnDrone(type) {
  if (!dronesLayer) return

  const id = droneIdSeq++
  const startX = Math.floor(state.gridSize / 2)
  const startY = Math.floor(state.gridSize / 2)

  const el = document.createElement('div')
  el.className = `drone ${type}`
  el.innerHTML = `
    <span class="battery-bar"><i></i></span>
    <span class="pulse"></span>
    <span class="emoji">${emojis[type]}</span>
  `

  dronesLayer.appendChild(el)

  const drone = {
    id,
    type,
    x: startX,
    y: startY,
    targetX: startX,
    targetY: startY,
    battery: 100,
    moveCooldown: 0,
    element: el,
    task: 'idle',
  }

  state.drones.push(drone)
  syncDronePosition(drone, true)
  updateDroneBattery(drone)
}

function findBestTask(type) {
  if (type === 'planter') {
    return state.tiles.find(t => !t.planted && t.growth <= 0) || null
  }

  if (type === 'water') {
    return state.tiles.find(t => t.planted && t.growth > 0 && t.growth < 100 && t.waterBoost < 4) || null
  }

  if (type === 'pesticide') {
    return state.tiles.find(t => t.planted && t.growth > 0 && t.growth < 100 && t.pestShield < 3) || null
  }

  if (type === 'collector') {
    return state.tiles.find(t => t.planted && t.growth >= 100) || null
  }

  return null
}

function getRandomEmptyTile() {
  const emptyTiles = state.tiles.filter(t => !t.planted)
  if (emptyTiles.length === 0) return null
  return emptyTiles[Math.floor(Math.random() * emptyTiles.length)]
}

function pickTargetTile(drone) {
  const task = findBestTask(drone.type)
  if (task) return task
  
  return getRandomEmptyTile()
}

function moveDroneToward(drone, tx, ty) {
  if (drone.moveCooldown > 0) return

  const dx = tx - drone.x
  const dy = ty - drone.y

  if (dx === 0 && dy === 0) return

  const step = Math.max(1, Math.round(1 + state.upgrades.speed * 0.2))

  if (Math.abs(dx) >= Math.abs(dy)) {
    drone.x += Math.sign(dx) * Math.min(step, Math.abs(dx))
  } else {
    drone.y += Math.sign(dy) * Math.min(step, Math.abs(dy))
  }

  drone.battery = clamp(drone.battery - 0.08, 0, 100)
  drone.moveCooldown = Math.max(0, 5 - state.upgrades.speed)
  syncDronePosition(drone)
}

function applyTileEffects(tile, type) {
  if (type === 'planter') {
    tile.planted = true
    tile.growth = 1
    tile.waterBoost = 0
    tile.pestShield = 0
    updateTileVisual(tile)
    log(`Plantio em ${tile.x}, ${tile.y}`)
    return
  }

  if (type === 'water') {
    tile.waterBoost = Math.min(4, tile.waterBoost + 2)
    updateTileVisual(tile)
    log(`Irrigação em ${tile.x}, ${tile.y}`)
    return
  }

  if (type === 'pesticide') {
    tile.pestShield = Math.min(3, tile.pestShield + 2)
    updateTileVisual(tile)
    log(`Proteção em ${tile.x}, ${tile.y}`)
    return
  }

  if (type === 'collector') {
    const base = 12 + state.upgrades.luck * 2
    const bonus = Math.floor(rand(0, 6 + state.upgrades.luck))
    const payout = base + bonus

    state.food += 1
    state.money += payout
    state.production += payout
    state.harvestLog.push(performance.now())

    tile.planted = false
    tile.growth = 0
    tile.waterBoost = 0
    tile.pestShield = 0
    updateTileVisual(tile)

    log(`Colheita feita. +$${payout}`)
  }
}

function droneLoop() {
  state.drones.forEach(drone => {
    drone.moveCooldown = Math.max(0, drone.moveCooldown - 1)

    if (drone.element) {
      drone.element.classList.toggle('lowbattery', drone.battery <= 12)
    }

    // Verificar se está em uma estação de carregamento
    const charger = getChargerAt(drone.x, drone.y)
    if (charger && drone.battery < 100) {
      charger.chargingDrone = drone.id
      drone.battery = clamp(drone.battery + 0.12, 0, 100)
      updateDroneBattery(drone)
      updateChargerVisual(charger)
      
      if (drone.element) {
        drone.element.classList.add('charging')
      }
      return
    } else if (charger) {
      charger.chargingDrone = null
      updateChargerVisual(charger)
    }

    if (drone.element) {
      drone.element.classList.remove('charging')
    }

    const target = pickTargetTile(drone)
    if (!target) return

    drone.targetX = target.x
    drone.targetY = target.y

    const atTarget = drone.x === target.x && drone.y === target.y

    if (drone.element) {
      drone.element.classList.toggle('busy', !atTarget)
      drone.element.classList.toggle('tasking', atTarget)
    }

    if (!atTarget) {
      moveDroneToward(drone, target.x, target.y)
      updateDroneBattery(drone)
      return
    }

    drone.battery = clamp(drone.battery + 0.06, 0, 100)
    updateDroneBattery(drone)

    if (drone.type === 'planter' && !target.planted && target.growth <= 0) {
      applyTileEffects(target, 'planter')
    }

    if (drone.type === 'water' && target.planted && target.growth > 0 && target.growth < 100) {
      applyTileEffects(target, 'water')
    }

    if (drone.type === 'pesticide' && target.planted && target.growth > 0 && target.growth < 100) {
      applyTileEffects(target, 'pesticide')
    }

    if (drone.type === 'collector' && target.planted && target.growth >= 100) {
      applyTileEffects(target, 'collector')
    }
  })
}

function cropLoop() {
  const weather = getWeatherData()

  state.tiles.forEach(tile => {
    if (!tile.planted) {
      updateTileVisual(tile)
      return
    }

    const waterFactor = tile.waterBoost > 0 ? 1.18 : 1
    const pestFactor = tile.pestShield > 0 ? 0.92 : 1.12
    const growthSpeed = 0.12 * weather.growth * waterFactor * pestFactor

    tile.growth = clamp(tile.growth + growthSpeed, 0, 100)
    tile.waterBoost = Math.max(0, tile.waterBoost - 0.012 * weather.water)
    tile.pestShield = Math.max(0, tile.pestShield - 0.01 * weather.pest)

    if (tile.growth >= 100 && tile.pestShield <= 0 && Math.random() < 0.0015 * weather.pest) {
      tile.growth = 72
      log(`Praga pegou o lote ${tile.x}, ${tile.y}`)
    }

    updateTileVisual(tile)
  })
}

function productionLoop() {
  const now = performance.now()
  state.harvestLog = state.harvestLog.filter(t => now - t < 60000)
  state.production = state.harvestLog.length * 12
}

function weatherLoop() {
  state.weatherTick += 1
  if (state.weatherTick % 250 !== 0) return

  const next = weatherPool[Math.floor(Math.random() * weatherPool.length)]
  state.weather = next.name
  safeText(elWeather, next.name)
  log(`Clima mudou para ${next.name}`)
}

function updateUI() {
  safeText(elMoney, Math.floor(state.money))
  safeText(elFood, state.food)
  safeText(elFarmScore, Math.floor(state.production / 4 + state.food * 8))
  safeText(elDroneTotal, state.drones.length)
  safeText(elProductionRate, Math.max(0, Math.round(state.production)))
  safeText(elWeather, state.weather)
  safeText(elGridSize, `${state.gridSize}x${state.gridSize}`)

  safeText(elCountPlanter, state.droneCounts.planter)
  safeText(elCountWater, state.droneCounts.water)
  safeText(elCountPesticide, state.droneCounts.pesticide)
  safeText(elCountCollector, state.droneCounts.collector)
  safeText(elCountCharger, state.droneCounts.charger)

  if (btnUpgradeSpeed) btnUpgradeSpeed.disabled = state.money < prices.speed
  if (btnUpgradeBattery) btnUpgradeBattery.disabled = state.money < prices.battery
  if (btnUpgradeLuck) btnUpgradeLuck.disabled = state.money < prices.luck
  if (btnExpandFarm) btnExpandFarm.disabled = state.money < prices.farmExpand || state.gridSize >= 16

  document.querySelectorAll('[data-buy]').forEach(btn => {
    const type = btn.dataset.buy
    btn.disabled = state.money < prices[type]
  })

  // Atualizar preço de expansão
  const expandBtn = document.getElementById('expandFarm')
  if (expandBtn) {
    expandBtn.disabled = state.money < prices.farmExpand || state.gridSize >= 16
  }
  const expandPrice = document.getElementById('expandPrice')
  if (expandPrice) {
    expandPrice.textContent = `$${Math.floor(prices.farmExpand)}`
  }
}

function buyDrone(type) {
  if (state.money < prices[type]) return

  state.money -= prices[type]
  state.droneCounts[type] += 1
  spawnDrone(type)
  log(`Drone ${type} comprado`)
  updateUI()
}

function buyUpgrade(type) {
  const price = prices[type]
  if (state.money < price) return

  state.money -= price
  state.upgrades[type] += 1

  if (type === 'speed') log('Upgrade de velocidade aplicado')
  if (type === 'battery') log('Upgrade de bateria aplicado')
  if (type === 'luck') log('Upgrade de colheita aplicado')

  updateUI()
}

function expandFarm() {
  const price = prices.farmExpand
  if (state.money < price) return
  if (state.gridSize >= 16) return

  state.money -= price
  state.gridSize += 2
  prices.farmExpand = Math.floor(prices.farmExpand * 1.35)

  log(`Fazenda expandida para ${state.gridSize}x${state.gridSize}!`)
  initFarm()
  resizeDrones()
  updateUI()
}

function placeCharger() {
  const msg = `Digite as coordenadas da estação (ex: 0,0 para canto superior esquerdo). Máximo: ${state.gridSize - 1},${state.gridSize - 1}`
  const input = prompt(msg)
  
  if (!input) return
  
  const coords = input.split(',').map(c => parseInt(c.trim()))
  const [x, y] = coords
  
  if (isNaN(x) || isNaN(y) || x < 0 || y < 0 || x >= state.gridSize || y >= state.gridSize) {
    log('❌ Coordenadas inválidas!')
    return
  }
  
  if (getChargerAt(x, y)) {
    log('❌ Já existe uma estação aqui!')
    return
  }

  if (state.money < prices.charger) {
    log('❌ Dinheiro insuficiente!')
    return
  }
  
  state.money -= prices.charger
  state.droneCounts.charger += 1
  spawnCharger(x, y)
  log(`Estação de carregamento colocada em ${x}, ${y}`)
  updateUI()
}

function removeCharger() {
  const msg = `Digite as coordenadas da estação a remover (ex: 0,0)`
  const input = prompt(msg)
  
  if (!input) return
  
  const coords = input.split(',').map(c => parseInt(c.trim()))
  const [x, y] = coords
  
  if (isNaN(x) || isNaN(y)) {
    log('❌ Coordenadas inválidas!')
    return
  }
  
  removeChargerAt(x, y)
  if (state.droneCounts.charger > 0) state.droneCounts.charger -= 1
  log(`Estação de carregamento removida de ${x}, ${y}`)
  updateUI()
}

function initEvents() {
  document.querySelectorAll('[data-buy]').forEach(btn => {
    btn.addEventListener('click', () => buyDrone(btn.dataset.buy))
  })

  if (btnUpgradeSpeed) btnUpgradeSpeed.addEventListener('click', () => buyUpgrade('speed'))
  if (btnUpgradeBattery) btnUpgradeBattery.addEventListener('click', () => buyUpgrade('battery'))
  if (btnUpgradeLuck) btnUpgradeLuck.addEventListener('click', () => buyUpgrade('luck'))
  if (btnExpandFarm) btnExpandFarm.addEventListener('click', expandFarm)

  const btnPlaceCharger = document.getElementById('placeCharger')
  if (btnPlaceCharger) btnPlaceCharger.addEventListener('click', placeCharger)

  const btnRemoveCharger = document.getElementById('removeCharger')
  if (btnRemoveCharger) btnRemoveCharger.addEventListener('click', removeCharger)

  // Eventos de mouse para carregar drones
  if (dronesLayer) {
    dronesLayer.addEventListener('mousedown', (e) => {
      const droneEl = e.target.closest('.drone')
      if (droneEl) {
        const drone = state.drones.find(d => d.element === droneEl)
        if (drone) {
          state.selectedDrone = drone
          state.mouseDown = true
          if (drone.element) {
            drone.element.classList.add('selected')
          }
        }
      }
    })

    dronesLayer.addEventListener('mousemove', () => {
      if (state.mouseDown && state.selectedDrone) {
        state.selectedDrone.battery = clamp(state.selectedDrone.battery + 0.5, 0, 100)
        updateDroneBattery(state.selectedDrone)
      }
    })

    dronesLayer.addEventListener('mouseup', () => {
      if (state.selectedDrone && state.selectedDrone.element) {
        state.selectedDrone.element.classList.remove('selected')
      }
      state.selectedDrone = null
      state.mouseDown = false
    })

    document.addEventListener('mouseleave', () => {
      if (state.selectedDrone && state.selectedDrone.element) {
        state.selectedDrone.element.classList.remove('selected')
      }
      state.selectedDrone = null
      state.mouseDown = false
    })
  }
}

function seedStart() {
  const seeds = [
    [1, 1], [2, 2], [3, 1], [5, 2], [1, 5], [4, 4]
  ]

  for (const [x, y] of seeds) {
    const tile = getTileAt(x, y)
    if (!tile) continue
    tile.planted = true
    tile.growth = rand(12, 28)
    tile.waterBoost = 0
    tile.pestShield = 0
    updateTileVisual(tile)
  }
}

function resizeDrones() {
  state.drones.forEach(drone => syncDronePosition(drone, true))
}

function initGame() {
  initFarm()
  initEvents()
  seedStart()

  spawnDrone('planter')
  spawnDrone('water')
  spawnDrone('collector')
  spawnDrone('pesticide')

  state.droneCounts.planter = 1
  state.droneCounts.water = 1
  state.droneCounts.collector = 1
  state.droneCounts.pesticide = 1

  log('Fazenda ligada')
  log('Os drones já começaram a rodar')
  log('💡 Clique e segure em um drone para carregá-lo!')
  updateUI()
}

function gameTick() {
  cropLoop()
  droneLoop()
  productionLoop()
  weatherLoop()
  updateUI()
}

window.addEventListener('resize', resizeDrones)

initGame()
setInterval(gameTick, 100)
