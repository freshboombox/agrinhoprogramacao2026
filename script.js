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

// --- LIMITE DE UPGRADES ---
const UPGRADE_MAX = 5

const state = {
  money: 100,
  food: 0,
  production: 0,
  weather: 'Calmo',
  weatherTick: 0,
  weatherDuration: 250,   // duração do clima atual em ticks
  weatherTickCount: 0,    // contador do clima atual
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
    refinery: 0,
  },
  drones: [],
  chargers: [],
  refineries: [],
  refineryTick: 0,
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
  refinery: 150,
  speed: 140,
  battery: 160,
  luck: 180,
  farmExpand: 200,
}

// Preço de upgrade escala por nível
function upgradePrice(type) {
  const base = prices[type]
  const level = state.upgrades[type]
  return Math.floor(base * Math.pow(1.6, level))
}

const emojis = {
  planter: '🌱',
  water: '💧',
  pesticide: '☠️',
  collector: '📦',
  charger: '🔌',
}

// --- SISTEMA DE CLIMA EXPANDIDO ---
// growth: multiplicador de crescimento
// pest: multiplicador de chance de praga
// water: multiplicador de consumo de água
// battery: multiplicador de consumo de bateria dos drones
// duration: duração base em ticks (~100ms cada)
const weatherPool = [
  {
    name: 'Calmo', emoji: '🌤️',
    growth: 1.0, pest: 1.0, water: 1.0, battery: 1.0,
    duration: [200, 350],
    tip: null,
  },
  {
    name: 'Nublado', emoji: '☁️',
    growth: 1.08, pest: 0.9, water: 0.85, battery: 0.95,
    duration: [180, 300],
    tip: 'Nuvens protegem das pragas e reduzem evaporação.',
  },
  {
    name: 'Chuva', emoji: '🌧️',
    growth: 1.05, pest: 0.75, water: 0.4, battery: 1.1,
    duration: [150, 250],
    tip: '⚡ Chuva consome mais bateria, mas irriga sozinha!',
  },
  {
    name: 'Tempestade', emoji: '⛈️',
    growth: 0.7, pest: 0.6, water: 0.2, battery: 1.5,
    duration: [80, 140],
    tip: '⚠️ TEMPESTADE! Drones gastam bateria rapidamente!',
  },
  {
    name: 'Seco', emoji: '🏜️',
    growth: 0.88, pest: 1.2, water: 1.6, battery: 0.9,
    duration: [200, 320],
    tip: '☀️ Tempo seco: irrigadores em ação urgente!',
  },
  {
    name: 'Onda de Calor', emoji: '🌡️',
    growth: 0.6, pest: 1.5, water: 2.0, battery: 1.3,
    duration: [100, 180],
    tip: '🔥 CALOR EXTREMO! Plantas e drones sofrem muito!',
  },
  {
    name: 'Vento Forte', emoji: '💨',
    growth: 0.95, pest: 1.3, water: 1.15, battery: 1.2,
    duration: [120, 200],
    tip: '💨 Vento espalha pragas e seca o solo!',
  },
  {
    name: 'Geada', emoji: '❄️',
    growth: 0.45, pest: 0.3, water: 0.7, battery: 1.4,
    duration: [100, 160],
    tip: '❄️ GEADA! Crescimento travado. Aguarde passar.',
  },
]

// --- INJEÇÃO DINÂMICA DE ESTILOS ---
const style = document.createElement('style')
style.innerHTML = `
  .tile.refinery-tile { background: #2c3e50 !important; border: 2px solid #e67e22 !important; box-shadow: inset 0 0 8px rgba(230,126,34,0.3); }
  .tile.refinery-tile.active { box-shadow: inset 0 0 15px #e67e22 !important; }
  #placeRefinery { background: #d35400 !important; color: white; border-radius: 4px; padding: 6px 12px; font-weight: bold; cursor: pointer; }
  #removeRefinery { background: #7f8c8d !important; color: white; border-radius: 4px; padding: 6px 12px; font-weight: bold; cursor: pointer; }

  /* Efeitos visuais de clima nas tiles */
  .weather-storm .tile.planted { box-shadow: inset 0 0 12px rgba(80,80,255,0.25) !important; }
  .weather-heatwave .tile.planted { box-shadow: inset 0 0 14px rgba(255,80,0,0.3) !important; }
  .weather-frost .tile.planted { box-shadow: inset 0 0 14px rgba(100,200,255,0.35) !important; filter: brightness(0.85); }
  .weather-frost .farm-shell { background: linear-gradient(180deg, rgba(180,220,255,0.08), rgba(10,14,10,0.36)) !important; }

  /* Barra de progresso de upgrade */
  .upgrade-bar { display:flex; gap:3px; margin-top:4px; margin-bottom:6px; }
  .upgrade-bar span { flex:1; height:6px; border-radius:3px; background:rgba(255,255,255,0.1); transition:background 0.3s; }
  .upgrade-bar span.filled { background:linear-gradient(90deg,#8ce36a,#5fb84a); }
  .upgrade-bar span.filled.secondary { background:linear-gradient(90deg,#7dbfff,#4e90e0); }

  /* Badge de clima na topbar */
  #weather { font-size:15px !important; }
  .weather-badge { font-size:11px; color:#ffd166; display:block; margin-top:2px; }
`
document.head.appendChild(style)

// --- SISTEMA DE COORDENADAS ---
function getCoordStr(x, y) { return `a${x + 1}b${y + 1}` }

function parseCoordStr(str) {
  const match = str.toLowerCase().trim().match(/^a(\d+)b(\d+)$/)
  if (!match) return null
  return { x: parseInt(match[1]) - 1, y: parseInt(match[2]) - 1 }
}

function rand(min, max) { return Math.random() * (max - min) + min }
function clamp(value, min, max) { return Math.max(min, Math.min(max, value)) }
function safeText(el, value) { if (el) el.textContent = String(value) }

function log(text) {
  if (!logEl) return
  const row = document.createElement('div')
  row.textContent = `> ${text}`
  logEl.prepend(row)
  while (logEl.children.length > 18) logEl.removeChild(logEl.lastChild)
}

function getTileAt(x, y) { return state.tiles.find(t => t.x === x && t.y === y) || null }
function getChargerAt(x, y) { return state.chargers.find(c => c.x === x && c.y === y) || null }
function getRefineryAt(x, y) { return state.refineries.find(r => r.x === x && r.y === y) || null }

function findClosestRefinery(drone) {
  if (state.refineries.length === 0) return null
  return state.refineries.reduce((closest, ref) => {
    const d1 = Math.abs(ref.x - drone.x) + Math.abs(ref.y - drone.y)
    const d2 = Math.abs(closest.x - drone.x) + Math.abs(closest.y - drone.y)
    return d1 < d2 ? ref : closest
  })
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
    tileW, tileH,
  }
}

function updateTileVisual(tile) {
  const el = tile.element
  if (!el || el.classList.contains('charger') || el.classList.contains('refinery-tile')) return

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

function updateRefineryVisual(refinery) {
  const el = refinery.element
  if (!el) return
  el.classList.toggle('active', refinery.buffer > 0)
  el.innerHTML = `
    <span style="position:absolute; top:4px; left:6px; font-size:9px; font-weight:bold; color:rgba(255,255,255,0.25); z-index:1; pointer-events:none;">${getCoordStr(refinery.x, refinery.y)}</span>
    <span class="charger-icon">🏭</span>
    <span style="position:absolute; bottom:4px; right:6px; font-size:10px; font-weight:bold; color:#ff9f43; background:rgba(0,0,0,0.7); padding:1px 5px; border-radius:3px; z-index:2;">In: ${refinery.buffer}</span>
  `
}

function initFarm() {
  if (!farmEl) return
  farmEl.innerHTML = ''
  state.tiles = []
  state.chargers = []
  state.refineries = []

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
      state.tiles.push({ x, y, growth: 0, waterBoost: 0, pestShield: 0, planted: false, infested: false, element: tile })
    }
  }

  farmEl.style.gridTemplateColumns = `repeat(${state.gridSize}, minmax(54px, 1fr))`
  farmEl.style.gridTemplateRows = `repeat(${state.gridSize}, minmax(54px, 1fr))`
}

function spawnCharger(x, y) {
  if (!farmEl) return
  removeRefineryAt(x, y)
  const tileEl = farmEl.querySelector(`[data-x="${x}"][data-y="${y}"]`)
  if (!tileEl) return
  const charger = { x, y, chargingDrone: null, element: tileEl }
  tileEl.className = 'tile charger'
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

function spawnRefinery(x, y) {
  if (!farmEl) return
  removeChargerAt(x, y)
  const tileEl = farmEl.querySelector(`[data-x="${x}"][data-y="${y}"]`)
  if (!tileEl) return
  const refinery = { x, y, buffer: 0, element: tileEl }
  tileEl.className = 'tile refinery-tile'
  state.refineries.push(refinery)
  updateRefineryVisual(refinery)
}

function removeRefineryAt(x, y) {
  const idx = state.refineries.findIndex(r => r.x === x && r.y === y)
  if (idx !== -1) {
    const ref = state.refineries[idx]
    ref.element.className = 'tile empty'
    ref.element.innerHTML = `
      <span style="position:absolute; top:4px; left:6px; font-size:9px; font-weight:bold; color:rgba(255,255,255,0.25); z-index:1; pointer-events:none;">${getCoordStr(x, y)}</span>
      <span class="stage"></span>
      <span class="meter"><i></i></span>
    `
    state.refineries.splice(idx, 1)
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
    requestAnimationFrame(() => { if (drone.element) drone.element.style.transition = '' })
    return
  }
  drone.element.style.left = `${pos.left}px`
  drone.element.style.top = `${pos.top}px`
}

function updateDroneBattery(drone) {
  if (!drone.element) return
  const batteryBar = drone.element.querySelector('.battery-bar i')
  if (batteryBar) batteryBar.style.width = `${clamp(drone.battery, 0, 100)}%`
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
  const drone = { id, type, x: startX, y: startY, targetX: startX, targetY: startY, battery: 100, moveCooldown: 0, element: el, task: 'idle', patrolTarget: null, carrying: false }
  state.drones.push(drone)
  syncDronePosition(drone, true)
  updateDroneBattery(drone)
}

function findBestTask(type, currentDrone) {
  const isAlreadyTargeted = (t) => state.drones.some(d => d.id !== currentDrone.id && d.type === currentDrone.type && d.targetX === t.x && d.targetY === t.y)

  if (type === 'planter')
    return state.tiles.find(t => !t.planted && t.growth <= 0 && !getChargerAt(t.x, t.y) && !getRefineryAt(t.x, t.y) && !isAlreadyTargeted(t)) ||
           state.tiles.find(t => !t.planted && t.growth <= 0 && !getChargerAt(t.x, t.y) && !getRefineryAt(t.x, t.y)) || null

  if (type === 'water')
    return state.tiles.find(t => t.planted && t.growth > 0 && t.growth < 100 && t.waterBoost < 4 && !t.infested && !isAlreadyTargeted(t)) ||
           state.tiles.find(t => t.planted && t.growth > 0 && t.growth < 100 && t.waterBoost < 4 && !t.infested) || null

  if (type === 'pesticide') {
    let target = state.tiles.find(t => t.planted && t.infested && !isAlreadyTargeted(t))
    if (target) return target
    target = state.tiles.find(t => t.planted && t.infested)
    if (target) return target
    target = state.tiles.find(t => t.planted && t.growth > 0 && t.growth < 100 && t.pestShield < 3 && !isAlreadyTargeted(t))
    if (target) return target
    return state.tiles.find(t => t.planted && t.growth > 0 && t.growth < 100 && t.pestShield < 3) || null
  }

  if (type === 'collector') {
    if (currentDrone.carrying) return findClosestRefinery(currentDrone)
    return state.tiles.find(t => t.planted && t.growth >= 100 && !t.infested && !isAlreadyTargeted(t)) ||
           state.tiles.find(t => t.planted && t.growth >= 100 && !t.infested) || null
  }

  return null
}

function pickTargetTile(drone) {
  const target = findBestTask(drone.type, drone)
  if (target) { drone.patrolTarget = null; return target }
  if (drone.type === 'collector' && drone.carrying) return null

  if (drone.patrolTarget && (drone.x !== drone.patrolTarget.x || drone.y !== drone.patrolTarget.y)) {
    const isStillValid = state.tiles.some(t => t.x === drone.patrolTarget.x && t.y === drone.patrolTarget.y)
    if (isStillValid) return drone.patrolTarget
  }

  if (state.tiles.length > 0) {
    const validTiles = state.tiles.filter(t => !getChargerAt(t.x, t.y) && !getRefineryAt(t.x, t.y))
    const pool = validTiles.length > 0 ? validTiles : state.tiles
    const untargetedTiles = pool.filter(t => !state.drones.some(d => d.id !== drone.id && d.targetX === t.x && d.targetY === t.y))
    const finalPool = untargetedTiles.length > 0 ? untargetedTiles : pool
    const randomTile = finalPool[Math.floor(Math.random() * finalPool.length)]
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
  if (Math.abs(dx) >= Math.abs(dy)) drone.x += Math.sign(dx) * Math.min(step, Math.abs(dx))
  else drone.y += Math.sign(dy) * Math.min(step, Math.abs(dy))

  // Clima afeta consumo de bateria ao mover
  const weather = getWeatherData()
  const batteryDrain = 0.08 * weather.battery
  drone.battery = clamp(drone.battery - batteryDrain, 0, 100)
  drone.moveCooldown = Math.max(0, 5 - state.upgrades.speed)
  syncDronePosition(drone)
}

function applyTileEffects(tile, drone) {
  const type = drone.type

  if (type === 'planter') {
    tile.planted = true; tile.growth = 1; tile.waterBoost = 0; tile.pestShield = 0; tile.infested = false
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
    if (tile.infested) { tile.infested = false; tile.pestShield = 3; log(`✨ Praga eliminada em ${getCoordStr(tile.x, tile.y)}!`) }
    else { tile.pestShield = Math.min(3, tile.pestShield + 2); log(`🛡️ Proteção em ${getCoordStr(tile.x, tile.y)}`) }
    updateTileVisual(tile)
    return
  }

  if (type === 'collector') {
    drone.carrying = true
    tile.planted = false; tile.growth = 0; tile.waterBoost = 0; tile.pestShield = 0; tile.infested = false
    updateTileVisual(tile)
    log(`📦 Coletor extraiu matéria-prima em ${getCoordStr(tile.x, tile.y)}. Buscando Refinaria...`)
  }
}

function droneLoop() {
  const weather = getWeatherData()

  state.drones.forEach(drone => {
    drone.moveCooldown = Math.max(0, drone.moveCooldown - 1)
    if (drone.element) drone.element.classList.toggle('lowbattery', drone.battery <= 12)

    // Drones com bateria zerada ficam parados até achar carregador
    if (drone.battery <= 0) {
      const nearestCharger = state.chargers.reduce((best, c) => {
        const d = Math.abs(c.x - drone.x) + Math.abs(c.y - drone.y)
        const bestD = best ? Math.abs(best.x - drone.x) + Math.abs(best.y - drone.y) : Infinity
        return d < bestD ? c : best
      }, null)
      if (nearestCharger) moveDroneToward(drone, nearestCharger.x, nearestCharger.y)
      return
    }

    const charger = getChargerAt(drone.x, drone.y)
    if (charger && drone.battery < 100) {
      charger.chargingDrone = drone.id
      // Bateria carrega mais devagar em tempestade
      const chargeRate = 0.12 * (weather.name === 'Tempestade' ? 0.6 : weather.name === 'Geada' ? 0.7 : 1)
      drone.battery = clamp(drone.battery + chargeRate + state.upgrades.battery * 0.04, 0, 100)
      updateDroneBattery(drone)
      updateChargerVisual(charger)
      if (drone.element) drone.element.classList.add('charging')
      return
    } else if (charger) {
      charger.chargingDrone = null
      updateChargerVisual(charger)
    }

    if (drone.element) drone.element.classList.remove('charging')

    const target = pickTargetTile(drone)
    if (!target) {
      if (drone.element) drone.element.classList.remove('busy', 'tasking')
      return
    }

    drone.targetX = target.x
    drone.targetY = target.y
    const atTarget = drone.x === target.x && drone.y === target.y
    if (drone.element) { drone.element.classList.toggle('busy', !atTarget); drone.element.classList.toggle('tasking', atTarget) }

    if (!atTarget) { moveDroneToward(drone, target.x, target.y); updateDroneBattery(drone); return }

    drone.battery = clamp(drone.battery + 0.06, 0, 100)
    updateDroneBattery(drone)

    if (drone.type === 'planter' && !target.planted && target.growth <= 0 && !getRefineryAt(target.x, target.y)) applyTileEffects(target, drone)
    if (drone.type === 'water' && target.planted && target.growth > 0 && target.growth < 100) applyTileEffects(target, drone)
    if (drone.type === 'pesticide' && target.planted && (target.infested || (target.growth > 0 && target.growth < 100))) applyTileEffects(target, drone)

    if (drone.type === 'collector') {
      if (!drone.carrying && target.planted && target.growth >= 100) {
        applyTileEffects(target, drone)
      } else if (drone.carrying) {
        const refinery = getRefineryAt(drone.x, drone.y)
        if (refinery) {
          refinery.buffer += 1
          drone.carrying = false
          updateRefineryVisual(refinery)
          log(`🏭 Depósito feito! Fábrica ${getCoordStr(refinery.x, refinery.y)} recebeu insumos.`)
        }
      }
    }
  })
}

function cropLoop() {
  const weather = getWeatherData()
  const totalUpgrades = state.upgrades.speed + state.upgrades.battery + state.upgrades.luck
  const dynamicPestChance = 0.0005 + (totalUpgrades * 0.0015)

  state.tiles.forEach(tile => {
    if (getChargerAt(tile.x, tile.y) || getRefineryAt(tile.x, tile.y)) return
    if (!tile.planted) { updateTileVisual(tile); return }

    if (!tile.infested && tile.pestShield <= 0 && tile.growth > 5) {
      if (Math.random() < dynamicPestChance * weather.pest) {
        tile.infested = true
        log(`⚠️ Praga detectada em ${getCoordStr(tile.x, tile.y)}!`)
      }
    }

    const waterFactor = tile.waterBoost > 0 ? 1.18 : 1
    const luckBonus = 1 + state.upgrades.luck * 0.06
    const growthSpeed = 0.12 * weather.growth * waterFactor * luckBonus

    if (tile.infested) tile.growth = clamp(tile.growth - growthSpeed * 1.5, 0, 100)
    else tile.growth = clamp(tile.growth + growthSpeed, 0, 100)

    tile.waterBoost = Math.max(0, tile.waterBoost - 0.012 * weather.water)
    tile.pestShield = Math.max(0, tile.pestShield - 0.01 * weather.pest)
    updateTileVisual(tile)
  })
}

function refineryProcessingLoop() {
  state.refineryTick++
  if (state.refineryTick % 15 !== 0) return

  state.refineries.forEach(ref => {
    if (ref.buffer > 0) {
      ref.buffer--
      const base = 42 + state.upgrades.luck * 4
      const bonus = Math.floor(rand(0, 16 + state.upgrades.luck * 2))
      const payout = base + bonus
      state.food += 1
      state.money += payout
      state.production += payout
      state.harvestLog.push(performance.now())
      updateRefineryVisual(ref)
      log(`🥫 Refinaria produziu! +$${payout}`)
    }
  })
}

function productionLoop() {
  const now = performance.now()
  state.harvestLog = state.harvestLog.filter(t => now - t < 60000)
  state.production = state.harvestLog.length * 15
}

// --- SISTEMA DE CLIMA MELHORADO ---
function weatherLoop() {
  state.weatherTickCount++

  if (state.weatherTickCount >= state.weatherDuration) {
    state.weatherTickCount = 0

    // Evita repetir o mesmo clima
    const others = weatherPool.filter(w => w.name !== state.weather)
    // Climas raros têm menor chance de aparecer
    const weighted = []
    others.forEach(w => {
      const rarity = (w.name === 'Onda de Calor' || w.name === 'Geada' || w.name === 'Tempestade') ? 1 : 3
      for (let i = 0; i < rarity; i++) weighted.push(w)
    })

    const next = weighted[Math.floor(Math.random() * weighted.length)]
    state.weather = next.name

    const dur = next.duration
    state.weatherDuration = Math.floor(rand(dur[0], dur[1]))

    safeText(elWeather, `${next.emoji} ${next.name}`)
    log(`🌍 Clima mudou para ${next.emoji} ${next.name}`)
    if (next.tip) log(next.tip)

    // Atualiza classe visual no farm
    const farmShell = document.querySelector('.farm-shell')
    if (farmShell) {
      farmShell.className = 'farm-shell'
      const weatherClass = {
        'Tempestade': 'weather-storm',
        'Onda de Calor': 'weather-heatwave',
        'Geada': 'weather-frost',
      }[next.name]
      if (weatherClass) farmShell.classList.add(weatherClass)
    }
  }
}

// --- ATUALIZAÇÃO DOS BOTÕES DE UPGRADE COM BARRA DE PROGRESSO ---
function renderUpgradeBars() {
  ['speed', 'battery', 'luck'].forEach(type => {
    const btn = document.getElementById(`upgrade${type.charAt(0).toUpperCase() + type.slice(1)}`)
    if (!btn) return

    const level = state.upgrades[type]
    const maxed = level >= UPGRADE_MAX
    const price = upgradePrice(type)
    const isSecondary = type === 'speed' || type === 'battery' || type === 'luck'
    const label = type === 'speed' ? 'Velocidade geral' : type === 'battery' ? 'Bateria dos drones' : 'Eficiência da colheita'

    btn.innerHTML = `${label} ${maxed ? '<span style="color:#ffd166">MAX</span>' : `<span>$${price}</span>`}`
    btn.disabled = maxed || state.money < price

    // Barra de progresso de nível
    let bar = btn.nextElementSibling
    if (!bar || !bar.classList.contains('upgrade-bar')) {
      bar = document.createElement('div')
      bar.className = 'upgrade-bar'
      btn.after(bar)
    }
    bar.innerHTML = Array.from({ length: UPGRADE_MAX }, (_, i) =>
      `<span class="${i < level ? `filled${isSecondary ? ' secondary' : ''}` : ''}"></span>`
    ).join('')
  })
}

function updateUI() {
  const weather = getWeatherData()
  safeText(elMoney, Math.floor(state.money))
  safeText(elFood, state.food)
  safeText(elFarmScore, Math.floor(state.production / 4 + state.food * 8))
  safeText(elDroneTotal, state.drones.length)
  safeText(elProductionRate, Math.max(0, Math.round(state.production)))
  safeText(elWeather, `${weather.emoji || ''} ${state.weather}`)
  safeText(elGridSize, `${state.gridSize}x${state.gridSize}`)

  safeText(elCountPlanter, state.droneCounts.planter)
  safeText(elCountWater, state.droneCounts.water)
  safeText(elCountPesticide, state.droneCounts.pesticide)
  safeText(elCountCollector, state.droneCounts.collector)
  safeText(elCountCharger, state.droneCounts.charger)

  const elCountRefinery = document.getElementById('count-refinery')
  if (elCountRefinery) safeText(elCountRefinery, state.droneCounts.refinery)

  renderUpgradeBars()

  if (btnExpandFarm) btnExpandFarm.disabled = state.money < prices.farmExpand || state.gridSize >= 16

  document.querySelectorAll('[data-buy]').forEach(btn => {
    const type = btn.dataset.buy
    btn.disabled = state.money < prices[type]
  })

  const expandBtn = document.getElementById('expandFarm')
  if (expandBtn) expandBtn.disabled = state.money < prices.farmExpand || state.gridSize >= 16
  const expandPrice = document.getElementById('expandPrice')
  if (expandPrice) expandPrice.textContent = `$${Math.floor(prices.farmExpand)}`

  const btnPlaceRefinery = document.getElementById('placeRefinery')
  if (btnPlaceRefinery) btnPlaceRefinery.disabled = state.money < prices.refinery
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
  if (state.upgrades[type] >= UPGRADE_MAX) { log(`❌ Upgrade de ${type} já está no nível máximo!`); return }
  const price = upgradePrice(type)
  if (state.money < price) return
  state.money -= price
  state.upgrades[type] += 1
  log(`⬆️ Upgrade ${type} nível ${state.upgrades[type]}/${UPGRADE_MAX}`)
  updateUI()
}

function expandFarm() {
  const price = prices.farmExpand
  if (state.money < price || state.gridSize >= 16) return
  state.money -= price
  state.gridSize += 2
  prices.farmExpand = Math.floor(prices.farmExpand * 1.35)
  log(`Fazenda expandida para ${state.gridSize}x${state.gridSize}!`)
  initFarm()
  resizeDrones()
  updateUI()
}

function placeCharger() {
  const input = prompt(`Coordenadas da estação de recarga (ex: a1b1). Limite: a${state.gridSize}b${state.gridSize}`)
  if (!input) return
  const coords = parseCoordStr(input)
  if (!coords) { log('❌ Formato incorreto! Use ex: a1b3'); return }
  const { x, y } = coords
  if (x < 0 || y < 0 || x >= state.gridSize || y >= state.gridSize) { log('❌ Local fora da fazenda!'); return }
  if (getChargerAt(x, y)) { log('❌ Já existe um carregador ali!'); return }
  if (state.money < prices.charger) { log('❌ Fundos insuficientes!'); return }
  state.money -= prices.charger
  state.droneCounts.charger += 1
  spawnCharger(x, y)
  log(`Estação instalada em ${getCoordStr(x, y)}`)
  updateUI()
}

function removeCharger() {
  const input = prompt('Coordenadas da estação a remover (ex: a1b1):')
  if (!input) return
  const coords = parseCoordStr(input)
  if (!coords) return
  const { x, y } = coords
  if (getChargerAt(x, y)) {
    removeChargerAt(x, y)
    if (state.droneCounts.charger > 0) state.droneCounts.charger -= 1
    log(`Estação removida de ${getCoordStr(x, y)}`)
    updateUI()
  } else log('❌ Nenhum carregador encontrado.')
}

function placeRefinery() {
  const input = prompt(`Coordenadas da refinaria (ex: a2b2). Limite: a${state.gridSize}b${state.gridSize}`)
  if (!input) return
  const coords = parseCoordStr(input)
  if (!coords) { log('❌ Coordenadas inválidas!'); return }
  const { x, y } = coords
  if (x < 0 || y < 0 || x >= state.gridSize || y >= state.gridSize) { log('❌ Posição fora da grade!'); return }
  if (getRefineryAt(x, y)) { log('❌ Já existe uma refinaria aqui!'); return }
  if (state.money < prices.refinery) { log('❌ Saldo insuficiente!'); return }
  state.money -= prices.refinery
  state.droneCounts.refinery += 1
  const tile = getTileAt(x, y)
  if (tile) { tile.planted = false; tile.growth = 0 }
  spawnRefinery(x, y)
  log(`⚙️ Refinaria instalada em ${getCoordStr(x, y)}`)
  updateUI()
}

function removeRefinery() {
  const input = prompt('Coordenadas da refinaria a remover (ex: a1b1):')
  if (!input) return
  const coords = parseCoordStr(input)
  if (!coords) return
  const { x, y } = coords
  if (getRefineryAt(x, y)) {
    removeRefineryAt(x, y)
    if (state.droneCounts.refinery > 0) state.droneCounts.refinery -= 1
    log(`Refinaria removida de ${getCoordStr(x, y)}`)
    updateUI()
  } else log('❌ Nenhuma refinaria encontrada.')
}

function injectRefineryUI() {
  const btnPlaceCharger = document.getElementById('placeCharger')
  if (btnPlaceCharger && !document.getElementById('placeRefinery')) {
    const btnPlace = document.getElementById('placeRefinery') || document.createElement('button')
    if (!document.getElementById('placeRefinery')) {
      btnPlace.id = 'placeRefinery'
      btnPlace.className = btnPlaceCharger.className
      btnPlace.style.margin = '4px'
      btnPlace.innerHTML = '⚙️ Criar Refinaria (<span id="refineryPrice">$150</span>)'
      const btnRemove = document.createElement('button')
      btnRemove.id = 'removeRefinery'
      btnRemove.className = btnPlaceCharger.className
      btnRemove.style.margin = '4px'
      btnRemove.textContent = '🔥 Remover Refinaria'
      btnPlaceCharger.parentElement.insertBefore(btnPlace, btnPlaceCharger.nextSibling)
      btnPlaceCharger.parentElement.insertBefore(btnRemove, btnPlace.nextSibling)
      btnPlace.addEventListener('click', placeRefinery)
      btnRemove.addEventListener('click', removeRefinery)
      const labelCount = document.createElement('div')
      labelCount.style.cssText = 'font-size:12px;margin:4px 0;'
      labelCount.innerHTML = `Fábricas Ativas: <strong id="count-refinery" style="color:#e67e22">0</strong>`
      btnPlaceCharger.parentElement.appendChild(labelCount)
    }
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

  injectRefineryUI()

  if (dronesLayer) {
    dronesLayer.addEventListener('mousedown', e => {
      const droneEl = e.target.closest('.drone')
      if (droneEl) {
        const drone = state.drones.find(d => d.element === droneEl)
        if (drone) { state.selectedDrone = drone; state.mouseDown = true; drone.element.classList.add('selected') }
      }
    })
    dronesLayer.addEventListener('mousemove', () => {
      if (state.mouseDown && state.selectedDrone) {
        state.selectedDrone.battery = clamp(state.selectedDrone.battery + 0.5, 0, 100)
        updateDroneBattery(state.selectedDrone)
      }
    })
    dronesLayer.addEventListener('mouseup', () => {
      if (state.selectedDrone?.element) state.selectedDrone.element.classList.remove('selected')
      state.selectedDrone = null; state.mouseDown = false
    })
    document.addEventListener('mouseleave', () => {
      if (state.selectedDrone?.element) state.selectedDrone.element.classList.remove('selected')
      state.selectedDrone = null; state.mouseDown = false
    })
  }
}

function seedStart() {
  const seeds = [[1,1],[2,2],[3,1],[5,2],[1,5],[4,4]]
  for (const [x, y] of seeds) {
    const tile = getTileAt(x, y)
    if (!tile) continue
    tile.planted = true; tile.growth = rand(12, 28); tile.waterBoost = 0; tile.pestShield = 0; tile.infested = false
    updateTileVisual(tile)
  }
}

function resizeDrones() { state.drones.forEach(drone => syncDronePosition(drone, true)) }

function initGame() {
  initFarm()
  initEvents()
  seedStart()
  spawnDrone('planter'); spawnDrone('water'); spawnDrone('collector'); spawnDrone('pesticide')
  state.droneCounts.planter = 1; state.droneCounts.water = 1; state.droneCounts.collector = 1; state.droneCounts.pesticide = 1
  log('Fazenda ligada!')
  log('Drones operacionais.')
  log('Monte uma refinaria com coordenadas da malha!')
  updateUI()
}

function gameTick() {
  cropLoop()
  droneLoop()
  refineryProcessingLoop()
  productionLoop()
  weatherLoop()
  updateUI()
}

window.addEventListener('resize', resizeDrones)
initGame()
setInterval(gameTick, 100)
