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

// --- SISTEMA DE COORDENADAS PERSONALIZADO (a1b1) ---
function getCoordStr(x, y) {
  return `a${x + 1}b${y + 1}`
}

function parseCoordStr(str) {
  const match = str.toLowerCase().trim().match(/^a(\d+)b(\d+)$/)
  if (!match) return null
  return {
    x: parseInt(match[1]) - 1,
    y: parseInt(match[2]) - 1,
  }
}

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
  el.classList.toggle('infested', !!tile.infested) 

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
    if (tile.infested) stage.textContent = '🐛' 
    else if (tile.growth < 25) stage.textContent = '🌱'
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
  tile.infested = false
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
        <span style="position:absolute; top:4px; left:6px; font-size:9px; font-weight:bold; color:rgba(255,255,255,0.25); z-index:1; pointer-events:none;">${getCoordStr(x, y)}</span>
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
        infested: false,
        element: tile,
      })
    }
  }

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
    <span style="position:absolute; top:4px; left:6px; font-size:9px; font-weight:bold; color:rgba(255,255,255,0.25); z-index:1; pointer-events:none;">${getCoordStr(x, y)}</span>
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
      <span style="position:absolute; top:4px; left:6px; font-size:9px; font-weight:bold; color:rgba(255,255,255,0.25); z-index:1; pointer-events:none;">${getCoordStr(x, y)}</span>
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
    patrolTarget: null, 
  }

  state.drones.push(drone)
  syncDronePosition(drone, true)
  updateDroneBattery(drone)
}

// --- BUSCA DE TAREFAS INDEPENDENTES (Evita acúmulo de drones no mesmo lugar) ---
function findBestTask(type, currentDrone) {
  // Retorna verdadeiro se OUTRO drone do mesmo tipo já marcou esse tile específico como destino de movimento
  const isAlreadyTargeted = (t) => state.drones.some(d => 
    d.id !== currentDrone.id && 
    d.type === currentDrone.type && 
    d.targetX === t.x && 
    d.targetY === t.y
  )

  if (type === 'planter') {
    return state.tiles.find(t => !t.planted && t.growth <= 0 && !isAlreadyTargeted(t)) ||
           state.tiles.find(t => !t.planted && t.growth <= 0) || null
  }

  if (type === 'water') {
    return state.tiles.find(t => t.planted && t.growth > 0 && t.growth < 100 && t.waterBoost < 4 && !t.infested && !isAlreadyTargeted(t)) ||
           state.tiles.find(t => t.planted && t.growth > 0 && t.growth < 100 && t.waterBoost < 4 && !t.infested) || null
  }

  if (type === 'pesticide') {
    // 1. Prioridade máxima: Pragas ativas que nenhum outro drone de agrotóxico mirou
    let target = state.tiles.find(t => t.planted && t.infested && !isAlreadyTargeted(t))
    if (target) return target

    // 2. Segunda prioridade: Ajudar em uma praga já mirada (se houver muitas pragas e poucos quadrantes)
    target = state.tiles.find(t => t.planted && t.infested)
    if (target) return target

    // 3. Terceira prioridade: Aplicar escudos preventivos normais em locais livres de concorrência
    target = state.tiles.find(t => t.planted && t.growth > 0 && t.growth < 100 && t.pestShield < 3 && !isAlreadyTargeted(t))
    if (target) return target

    // 4. Quarta prioridade: Escudos preventivos gerais
    return state.tiles.find(t => t.planted && t.growth > 0 && t.growth < 100 && t.pestShield < 3) || null
  }

  if (type === 'collector') {
    return state.tiles.find(t => t.planted && t.growth >= 100 && !t.infested && !isAlreadyTargeted(t)) ||
           state.tiles.find(t => t.planted && t.growth >= 100 && !t.infested) || null
  }

  return null
}

function pickTargetTile(drone) {
  const task = findBestTask(drone.type, drone)
  if (task) {
    drone.patrolTarget = null 
    return task
  }
  
  if (drone.patrolTarget && (drone.x !== drone.patrolTarget.x || drone.y !== drone.patrolTarget.y)) {
    const isStillValid = state.tiles.some(t => t.x === drone.patrolTarget.x && t.y === drone.patrolTarget.y)
    if (isStillValid) return drone.patrolTarget
  }

  // Patrulha distribuída aleatoriamente para evitar que drones ociosos travem sobrepostos
  if (state.tiles.length > 0) {
    const untargetedTiles = state.tiles.filter(t => !state.drones.some(d => d.id !== drone.id && d.targetX === t.x && d.targetY === t.y))
    const pool = untargetedTiles.length > 0 ? untargetedTiles : state.tiles
    const randomTile = pool[Math.floor(Math.random() * pool.length)]
    drone.patrolTarget = randomTile
    return randomTile
  }
  
  return null
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
    tile.infested = false
    updateTileVisual(tile)
    log(`Plantio em ${getCoordStr(tile.x, tile.y)}`)
    return
  }

  if (type === 'water') {
    tile.waterBoost = Math.min(4, tile.waterBoost + 2)
    updateTileVisual(tile)
    log(`Irrigação em ${getCoordStr(tile.x, tile.y)}`)
    return
  }

  if (type === 'pesticide') {
    if (tile.infested) {
      tile.infested = false
      tile.pestShield = 3 
      log(`✨ Praga eliminada em ${getCoordStr(tile.x, tile.y)}!`)
    } else {
      tile.pestShield = Math.min(3, tile.pestShield + 2)
      log(`🛡️ Proteção em ${getCoordStr(tile.x, tile.y)}`)
    }
    updateTileVisual(tile)
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
    tile.infested = false
    updateTileVisual(tile)

    log(`Colheita feita em ${getCoordStr(tile.x, tile.y)}. +$${payout}`)
  }
}

function droneLoop() {
  state.drones.forEach(drone => {
    drone.moveCooldown = Math.max(0, drone.moveCooldown - 1)

    if (drone.element) {
      drone.element.classList.toggle('lowbattery', drone.battery <= 12)
    }

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

    if (drone.type === 'pesticide' && target.planted && (target.infested || (target.growth > 0 && target.growth < 100))) {
      applyTileEffects(target, 'pesticide')
    }

    if (drone.type === 'collector' && target.planted && target.growth >= 100) {
      applyTileEffects(target, 'collector')
    }
  })
}

// --- SISTEMA DINÂMICO DE SURGIMENTO DE PRAGAS ESCALÁVEL ---
function cropLoop() {
  const weather = getWeatherData()

  // Calcula o total de upgrades comprados pelo jogador para medir o avanço dele
  const totalUpgrades = state.upgrades.speed + state.upgrades.battery + state.upgrades.luck
  
  // No começo (0 upgrades), a chance é mínima (0.0005). A cada upgrade ela aumenta em 0.0015
  const dynamicPestChance = 0.0005 + (totalUpgrades * 0.0015)

  state.tiles.forEach(tile => {
    if (!tile.planted) {
      updateTileVisual(tile)
      return
    }

    // Gerador de Pragas Aleatórias Dinâmico baseado nas melhorias do jogador
    if (!tile.infested && tile.pestShield <= 0 && tile.growth > 5) {
      if (Math.random() < dynamicPestChance * weather.pest) { 
        tile.infested = true
        log(`⚠️ Praga detectada em ${getCoordStr(tile.x, tile.y)}! O progresso está caindo!`)
      }
    }

    const waterFactor = tile.waterBoost > 0 ? 1.18 : 1
    const growthSpeed = 0.12 * weather.growth * waterFactor

    if (tile.infested) {
      // Se infectada, a barra de progresso diminui ao invés de aumentar
      tile.growth = clamp(tile.growth - growthSpeed * 1.5, 0, 100)
    } else {
      tile.growth = clamp(tile.growth + growthSpeed, 0, 100)
    }

    tile.waterBoost = Math.max(0, tile.waterBoost - 0.012 * weather.water)
    tile.pestShield = Math.max(0, tile.pestShield - 0.01 * weather.pest)

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
  const msg = `Digite as coordenadas da estação usando letras (ex: a1b1 para canto superior esquerdo). Máximo: a${state.gridSize}b${state.gridSize}`
  const input = prompt(msg)
  
  if (!input) return
  
  const coords = parseCoordStr(input)
  if (!coords) {
    log('❌ Formato inválido! Use o padrão de letras, ex: a2b3')
    return
  }
  const { x, y } = coords
  
  if (x < 0 || y < 0 || x >= state.gridSize || y >= state.gridSize) {
    log('❌ Coordenadas fora do limite do mapa atual!')
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
  log(`Estação colocada em ${getCoordStr(x, y)}`)
  updateUI()
}

function removeCharger() {
  const msg = `Digite as coordenadas da estação a remover (ex: a1b1)`
  const input = prompt(msg)
  
  if (!input) return
  
  const coords = parseCoordStr(input)
  if (!coords) {
    log('❌ Formato inválido! Use o padrão de letras, ex: a1b1')
    return
  }
  const { x, y } = coords
  
  if (getChargerAt(x, y)) {
    removeChargerAt(x, y)
    if (state.droneCounts.charger > 0) state.droneCounts.charger -= 1
    log(`Estação removida de ${getCoordStr(x, y)}`)
    updateUI()
  } else {
    log('❌ Nenhuma estação encontrada nessa posição.')
  }
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
    tile.infested = false
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
