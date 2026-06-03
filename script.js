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

const MAX_GRID_SIZE = 16
const UPGRADE_MAX = 5

// --- TIPOS DE CULTURA ---
const CROPS = {
  wheat: { name: 'Trigo', emoji: '🌾', growthRate: 1.0, waterNeed: 1.0, value: 40, color: '#c8a84b' },
  corn:  { name: 'Milho', emoji: '🌽', growthRate: 0.7, waterNeed: 1.4, value: 70, color: '#e8c840' },
  soy:   { name: 'Soja',  emoji: '🫘', growthRate: 1.3, waterNeed: 0.7, value: 25, color: '#7db84a' },
}

// Global default crop for newly purchased planters
let selectedCrop = 'wheat'

const state = {
  money: 250,
  food: 0,
  production: 0,
  weather: 'Calmo',
  weatherDuration: 250,
  weatherTickCount: 0,
  gridSize: 8,
  upgrades: { speed: 0, battery: 0, luck: 0 },
  droneCounts: { planter: 0, water: 0, pesticide: 0, collector: 0, charger: 0, refinery: 0 },
  drones: [],
  chargers: [],
  refineries: [],
  refineryTick: 0,
  tiles: [],
  harvestLog: [],
  selectedDrone: null,
  mouseDown: false,
  routes: [],
  routeMode: false,
  routeStep: 0,
  routePendingDrone: null,
}

const prices = {
  planter: 50, water: 75, pesticide: 110, collector: 95,
  charger: 120, refinery: 150,
  speed: 140, battery: 160, luck: 180, farmExpand: 200,
}

function upgradePrice(type) {
  return Math.floor(prices[type] * Math.pow(1.6, state.upgrades[type]))
}

const emojis = {
  planter: '🌱', water: '💧', pesticide: '☠️', collector: '📦', charger: '🔌',
}

const weatherPool = [
  { name: 'Calmo',         emoji: '🌤️', growth: 1.0,  pest: 1.0,  water: 1.0,  battery: 1.0,  duration: [200,350], tip: null },
  { name: 'Nublado',       emoji: '☁️',  growth: 1.08, pest: 0.9,  water: 0.85, battery: 0.95, duration: [180,300], tip: 'Nuvens protegem das pragas e reduzem evaporação.' },
  { name: 'Chuva',         emoji: '🌧️', growth: 1.05, pest: 0.75, water: 0.4,  battery: 1.1,  duration: [150,250], tip: '⚡ Chuva consome mais bateria, mas irriga sozinha!' },
  { name: 'Tempestade',    emoji: '⛈️', growth: 0.7,  pest: 0.6,  water: 0.2,  battery: 1.5,  duration: [80,140],  tip: '⚠️ TEMPESTADE! Drones gastam bateria rapidamente!' },
  { name: 'Seco',          emoji: '🏜️', growth: 0.88, pest: 1.2,  water: 1.6,  battery: 0.9,  duration: [200,320], tip: '☀️ Tempo seco: irrigadores em ação urgente!' },
  { name: 'Onda de Calor', emoji: '🌡️', growth: 0.6,  pest: 1.5,  water: 2.0,  battery: 1.3,  duration: [100,180], tip: '🔥 CALOR EXTREMO! Plantas e drones sofrem muito!' },
  { name: 'Vento Forte',   emoji: '💨', growth: 0.95, pest: 1.3,  water: 1.15, battery: 1.2,  duration: [120,200], tip: '💨 Vento espalha pragas e seca o solo!' },
  { name: 'Geada',         emoji: '❄️', growth: 0.45, pest: 0.3,  water: 0.7,  battery: 1.4,  duration: [100,160], tip: '❄️ GEADA! Crescimento travado. Aguarde passar.' },
]

// --- ESTILOS DINÂMICOS ---
const style = document.createElement('style')
style.innerHTML = `
  .tile.refinery-tile { background:#2c3e50 !important; border:2px solid #e67e22 !important; box-shadow:inset 0 0 8px rgba(230,126,34,.3); }
  .tile.refinery-tile.active { box-shadow:inset 0 0 15px #e67e22 !important; }
  .weather-storm .tile.planted { box-shadow:inset 0 0 12px rgba(80,80,255,.25) !important; }
  .weather-heatwave .tile.planted { box-shadow:inset 0 0 14px rgba(255,80,0,.3) !important; }
  .weather-frost .tile.planted { box-shadow:inset 0 0 14px rgba(100,200,255,.35) !important; filter:brightness(.85); }
  .upgrade-bar { display:flex; gap:3px; margin-top:4px; margin-bottom:6px; }
  .upgrade-bar span { flex:1; height:6px; border-radius:3px; background:rgba(255,255,255,.1); transition:background .3s; }
  .upgrade-bar span.filled { background:linear-gradient(90deg,#8ce36a,#5fb84a); }
  .upgrade-bar span.filled.secondary { background:linear-gradient(90deg,#7dbfff,#4e90e0); }
  #weather { font-size:15px !important; }

  .crop-selector { display:flex; gap:6px; margin-bottom:6px; flex-wrap:wrap; }
  .crop-btn { flex:1; min-width:60px; border:none; border-radius:10px; padding:8px 6px; font-size:12px; font-weight:700; cursor:pointer; background:rgba(255,255,255,.08); color:#eef6ee; border:2px solid transparent; transition:all .2s; }
  .crop-btn.active { border-color:#8ce36a; background:rgba(140,227,106,.15); }
  .crop-btn:hover { background:rgba(255,255,255,.14); }

  .tile.harvestable { cursor:pointer; outline:2px solid rgba(255,209,102,.5); }
  .tile.harvestable:hover { outline:3px solid rgba(255,209,102,.9); filter:brightness(1.08); }

  .route-mode-banner { position:fixed; top:90px; left:50%; transform:translateX(-50%); background:#e67e22; color:#fff; padding:8px 20px; border-radius:20px; font-weight:700; font-size:13px; z-index:999; display:none; box-shadow:0 4px 16px rgba(0,0,0,.3); }
  .route-mode-banner.visible { display:block; }

  .drone.routed { box-shadow:0 0 0 3px #e67e22, 0 10px 20px rgba(0,0,0,.3) !important; }

  /* Per-drone crop badge shown on planter drones */
  .drone.planter .crop-badge {
    position:absolute; bottom:-5px; right:-5px;
    font-size:11px; line-height:1;
    background:rgba(0,0,0,.6); border-radius:50%;
    padding:2px 3px; pointer-events:none; z-index:3;
  }

  /* Assign-crop button */
  #btnAssignCrop {
    width:100%; margin-top:6px; padding:8px 10px;
    background:linear-gradient(180deg,#a8edaa,#4caf50);
    color:#0a200a; font-weight:700; font-size:12px;
    border:none; border-radius:10px; cursor:pointer;
    transition:opacity .2s;
  }
  #btnAssignCrop:hover { opacity:.85; }
  #btnAssignCrop:disabled { opacity:.4; cursor:not-allowed; }
`
document.head.appendChild(style)

const routeBanner = document.createElement('div')
routeBanner.className = 'route-mode-banner'
routeBanner.textContent = '🛣️ Modo rota: clique num coletor para definir sua rota'
document.body.appendChild(routeBanner)

// --- HELPERS ---
function getCoordStr(x, y) { return `a${x+1}b${y+1}` }
function parseCoordStr(str) {
  const m = str.toLowerCase().trim().match(/^a(\d+)b(\d+)$/)
  if (!m) return null
  return { x: parseInt(m[1])-1, y: parseInt(m[2])-1 }
}
function rand(min, max) { return Math.random()*(max-min)+min }
function clamp(v, min, max) { return Math.max(min, Math.min(max, v)) }
function safeText(el, v) { if (el) el.textContent = String(v) }

function log(text) {
  if (!logEl) return
  const row = document.createElement('div')
  row.textContent = `> ${text}`
  logEl.prepend(row)
  while (logEl.children.length > 18) logEl.removeChild(logEl.lastChild)
}

function getTileAt(x, y)      { return state.tiles.find(t => t.x===x && t.y===y) || null }
function getChargerAt(x, y)   { return state.chargers.find(c => c.x===x && c.y===y) || null }
function getRefineryAt(x, y)  { return state.refineries.find(r => r.x===x && r.y===y) || null }
function getRouteFor(drone)   { return state.routes.find(r => r.droneId === drone.id) || null }

function findClosestRefinery(drone) {
  const route = getRouteFor(drone)
  if (route) {
    const ref = getRefineryAt(route.toRefineryX, route.toRefineryY)
    if (ref) return ref
  }
  if (state.refineries.length === 0) return null
  return state.refineries.reduce((best, ref) => {
    const d1 = Math.abs(ref.x-drone.x)+Math.abs(ref.y-drone.y)
    const d2 = Math.abs(best.x-drone.x)+Math.abs(best.y-drone.y)
    return d1 < d2 ? ref : best
  })
}

function getWeatherData() { return weatherPool.find(w => w.name===state.weather) || weatherPool[0] }

function cellToPx(x, y) {
  if (!farmEl) return { left:0, top:0 }
  const rect = farmEl.getBoundingClientRect()
  const iW = Math.max(0, rect.width-36)
  const iH = Math.max(0, rect.height-36)
  const tW = (iW - gap*(state.gridSize-1)) / state.gridSize
  const tH = (iH - gap*(state.gridSize-1)) / state.gridSize
  return { left: 18+x*(tW+gap)+tW/2, top: 18+y*(tH+gap)+tH/2, tileW:tW, tileH:tH }
}

// --- VISUAL DAS TILES ---
function updateTileVisual(tile) {
  const el = tile.element
  if (!el || el.classList.contains('charger') || el.classList.contains('refinery-tile')) return
  const stage = el.querySelector('.stage')
  const meter  = el.querySelector('.meter i')

  el.classList.toggle('planted',    tile.planted)
  el.classList.toggle('harvestable',tile.planted && tile.growth >= 100)
  el.classList.toggle('watering',   tile.waterBoost > 0)
  el.classList.toggle('infested',   !!tile.infested)

  if (!tile.planted) {
    el.classList.add('empty')
    if (stage) stage.textContent = ''
    if (meter) meter.style.width = '0%'
    return
  }
  el.classList.remove('empty')
  if (meter) meter.style.width = `${clamp(tile.growth,0,100)}%`
  if (stage) {
    const crop = CROPS[tile.cropType] || CROPS.wheat
    if (tile.infested)        stage.textContent = '🐛'
    else if (tile.growth < 25)  stage.textContent = '🌱'
    else if (tile.growth < 55)  stage.textContent = '🌿'
    else if (tile.growth < 100) stage.textContent = crop.emoji
    else                        stage.textContent = '✅'
  }
}

function updateChargerVisual(charger) {
  if (!charger.element) return
  charger.element.classList.toggle('active', charger.chargingDrone !== null)
}

function updateRefineryVisual(refinery) {
  const el = refinery.element
  if (!el) return
  el.classList.toggle('active', refinery.buffer > 0)
  el.innerHTML = `
    <span style="position:absolute;top:4px;left:6px;font-size:9px;font-weight:bold;color:rgba(255,255,255,.25);z-index:1;pointer-events:none">${getCoordStr(refinery.x,refinery.y)}</span>
    <span class="charger-icon">🏭</span>
    <span style="position:absolute;bottom:4px;right:6px;font-size:10px;font-weight:bold;color:#ff9f43;background:rgba(0,0,0,.7);padding:1px 5px;border-radius:3px;z-index:2">In:${refinery.buffer}</span>
  `
}

// ── NEW: refresh the emoji + badge shown on a planter drone ──
function updatePlanterDroneVisual(drone) {
  if (!drone.element || drone.type !== 'planter') return
  const crop = CROPS[drone.cropType] || CROPS.wheat

  // Main body emoji
  const emojiEl = drone.element.querySelector('.emoji')
  if (emojiEl) emojiEl.textContent = crop.emoji

  // Small badge in the corner
  let badge = drone.element.querySelector('.crop-badge')
  if (!badge) {
    badge = document.createElement('span')
    badge.className = 'crop-badge'
    drone.element.appendChild(badge)
  }
  badge.textContent = crop.emoji
}

// ── NEW: prompt UI — pick a planter then pick its seed ──
function assignCropToPlanter() {
  const planters = state.drones.filter(d => d.type === 'planter')
  if (planters.length === 0) { log('❌ Nenhum drone plantador disponível!'); return }

  const droneLines = planters.map((d, i) => {
    const c = CROPS[d.cropType] || CROPS.wheat
    return `${i+1}: Plantador #${d.id}  →  ${c.emoji} ${c.name}  (pos ${getCoordStr(d.x, d.y)})`
  }).join('\n')

  const dc = prompt(`Qual plantador configurar?\n\n${droneLines}\n\nDigite o número:`)
  const di = parseInt(dc) - 1
  if (isNaN(di) || di < 0 || di >= planters.length) { log('❌ Escolha inválida.'); return }

  const cropLines = Object.entries(CROPS).map(([k, c], i) =>
    `${i+1}: ${c.emoji} ${c.name}  (vel:${c.growthRate}x  água:${c.waterNeed}x  valor:$${c.value})`
  ).join('\n')

  const cc = prompt(`Semente para o Plantador #${planters[di].id}:\n\n${cropLines}\n\nDigite o número:`)
  const ci = parseInt(cc) - 1
  const cropKeys = Object.keys(CROPS)
  if (isNaN(ci) || ci < 0 || ci >= cropKeys.length) { log('❌ Cultura inválida.'); return }

  const drone = planters[di]
  drone.cropType = cropKeys[ci]
  updatePlanterDroneVisual(drone)
  log(`🌿 Plantador #${drone.id} → ${CROPS[drone.cropType].emoji} ${CROPS[drone.cropType].name}`)
}

// --- FARM INIT ---
function initFarm() {
  if (!farmEl) return
  farmEl.innerHTML = ''
  state.tiles = []; state.chargers = []; state.refineries = []; state.routes = []

  for (let y = 0; y < state.gridSize; y++) {
    for (let x = 0; x < state.gridSize; x++) {
      const tile = document.createElement('div')
      tile.className = 'tile empty'
      tile.dataset.x = x; tile.dataset.y = y
      tile.innerHTML = `
        <span style="position:absolute;top:4px;left:6px;font-size:9px;font-weight:bold;color:rgba(255,255,255,.25);z-index:1;pointer-events:none">${getCoordStr(x,y)}</span>
        <span class="stage"></span>
        <span class="meter"><i></i></span>
      `
      farmEl.appendChild(tile)
      state.tiles.push({ x, y, growth:0, waterBoost:0, pestShield:0, planted:false, infested:false, cropType:'wheat', element:tile })
    }
  }
  farmEl.style.gridTemplateColumns = `repeat(${state.gridSize},minmax(54px,1fr))`
  farmEl.style.gridTemplateRows    = `repeat(${state.gridSize},minmax(54px,1fr))`
}

// --- CHARGERS ---
function spawnCharger(x, y) {
  if (!farmEl) return
  removeRefineryAt(x, y)
  const tileEl = farmEl.querySelector(`[data-x="${x}"][data-y="${y}"]`)
  if (!tileEl) return
  tileEl.className = 'tile charger'
  tileEl.innerHTML = `
    <span style="position:absolute;top:4px;left:6px;font-size:9px;font-weight:bold;color:rgba(255,255,255,.25);z-index:1;pointer-events:none">${getCoordStr(x,y)}</span>
    <span class="charger-icon">🔌</span>
    <span class="meter"><i></i></span>
  `
  const charger = { x, y, chargingDrone:null, element:tileEl }
  state.chargers.push(charger)
  updateChargerVisual(charger)
}

function removeChargerAt(x, y) {
  const idx = state.chargers.findIndex(c => c.x===x && c.y===y)
  if (idx === -1) return
  const el = state.chargers[idx].element
  el.className = 'tile empty'
  el.innerHTML = `<span style="position:absolute;top:4px;left:6px;font-size:9px;font-weight:bold;color:rgba(255,255,255,.25);z-index:1;pointer-events:none">${getCoordStr(x,y)}</span><span class="stage"></span><span class="meter"><i></i></span>`
  state.chargers.splice(idx, 1)
}

// --- REFINERIES ---
function spawnRefinery(x, y) {
  if (!farmEl) return
  removeChargerAt(x, y)
  const tileEl = farmEl.querySelector(`[data-x="${x}"][data-y="${y}"]`)
  if (!tileEl) return
  const refinery = { x, y, buffer:0, element:tileEl }
  tileEl.className = 'tile refinery-tile'
  state.refineries.push(refinery)
  updateRefineryVisual(refinery)
}

function removeRefineryAt(x, y) {
  const idx = state.refineries.findIndex(r => r.x===x && r.y===y)
  if (idx === -1) return
  const el = state.refineries[idx].element
  el.className = 'tile empty'
  el.innerHTML = `<span style="position:absolute;top:4px;left:6px;font-size:9px;font-weight:bold;color:rgba(255,255,255,.25);z-index:1;pointer-events:none">${getCoordStr(x,y)}</span><span class="stage"></span><span class="meter"><i></i></span>`
  state.refineries.splice(idx, 1)
}

// --- DRONES ---
function syncDronePosition(drone, snap=false) {
  if (!drone.element) return
  const pos = cellToPx(drone.x, drone.y)
  if (snap) {
    drone.element.style.transition = 'none'
    drone.element.style.left = `${pos.left}px`
    drone.element.style.top  = `${pos.top}px`
    requestAnimationFrame(() => { if (drone.element) drone.element.style.transition = '' })
    return
  }
  drone.element.style.left = `${pos.left}px`
  drone.element.style.top  = `${pos.top}px`
}

function updateDroneBattery(drone) {
  if (!drone.element) return
  const bar = drone.element.querySelector('.battery-bar i')
  if (bar) bar.style.width = `${clamp(drone.battery,0,100)}%`
}

function spawnDrone(type) {
  if (!dronesLayer) return
  const id = droneIdSeq++
  const sx = Math.floor(state.gridSize/2), sy = Math.floor(state.gridSize/2)
  const el = document.createElement('div')
  el.className = `drone ${type}`

  // Planters show the currently-selected global crop as their starting emoji
  const startEmoji = type === 'planter'
    ? (CROPS[selectedCrop]?.emoji || emojis.planter)
    : emojis[type]

  el.innerHTML = `<span class="battery-bar"><i></i></span><span class="pulse"></span><span class="emoji">${startEmoji}</span>`
  dronesLayer.appendChild(el)

  const drone = {
    id, type, x:sx, y:sy, targetX:sx, targetY:sy,
    battery:100, moveCooldown:0, element:el,
    task:'idle', patrolTarget:null, carrying:false,
    // ── each planter drone remembers its own seed ──
    cropType: type === 'planter' ? selectedCrop : null,
  }
  state.drones.push(drone)
  syncDronePosition(drone, true)
  updateDroneBattery(drone)
  if (type === 'planter') updatePlanterDroneVisual(drone)
}

// --- TASK LOGIC ---
function findBestTask(type, drone) {
  const targeted = (t) => state.drones.some(d => d.id!==drone.id && d.type===type && d.targetX===t.x && d.targetY===t.y)
  const route = getRouteFor(drone)

  if (type === 'planter')
    return state.tiles.find(t => !t.planted && t.growth<=0 && !getChargerAt(t.x,t.y) && !getRefineryAt(t.x,t.y) && !targeted(t)) ||
           state.tiles.find(t => !t.planted && t.growth<=0 && !getChargerAt(t.x,t.y) && !getRefineryAt(t.x,t.y)) || null

  if (type === 'water')
    return state.tiles.find(t => t.planted && t.growth>0 && t.growth<100 && t.waterBoost<4 && !t.infested && !targeted(t)) ||
           state.tiles.find(t => t.planted && t.growth>0 && t.growth<100 && t.waterBoost<4 && !t.infested) || null

  if (type === 'pesticide')
    return state.tiles.find(t => t.planted && t.infested && !targeted(t)) ||
           state.tiles.find(t => t.planted && t.infested) ||
           state.tiles.find(t => t.planted && t.growth>0 && t.growth<100 && t.pestShield<3 && !targeted(t)) ||
           state.tiles.find(t => t.planted && t.growth>0 && t.growth<100 && t.pestShield<3) || null

  if (type === 'collector') {
    if (drone.carrying) return findClosestRefinery(drone)
    if (route) {
      const fromTile = getTileAt(route.fromX, route.fromY)
      if (fromTile && fromTile.planted && fromTile.growth >= 100 && !fromTile.infested) return fromTile
      return null
    }
    return state.tiles.find(t => t.planted && t.growth>=100 && !t.infested && !targeted(t)) ||
           state.tiles.find(t => t.planted && t.growth>=100 && !t.infested) || null
  }
  return null
}

function pickTargetTile(drone) {
  const target = findBestTask(drone.type, drone)
  if (target) { drone.patrolTarget = null; return target }
  if (drone.type === 'collector' && drone.carrying)      return null
  if (drone.type === 'collector' && getRouteFor(drone))  return null

  if (drone.patrolTarget) {
    const still = state.tiles.some(t => t.x===drone.patrolTarget.x && t.y===drone.patrolTarget.y)
    if (still && (drone.x !== drone.patrolTarget.x || drone.y !== drone.patrolTarget.y)) return drone.patrolTarget
  }

  const valid      = state.tiles.filter(t => !getChargerAt(t.x,t.y) && !getRefineryAt(t.x,t.y))
  const pool       = valid.length > 0 ? valid : state.tiles
  const untargeted = pool.filter(t => !state.drones.some(d => d.id!==drone.id && d.targetX===t.x && d.targetY===t.y))
  const final      = untargeted.length > 0 ? untargeted : pool
  drone.patrolTarget = final[Math.floor(Math.random()*final.length)]
  return drone.patrolTarget
}

function moveDroneToward(drone, tx, ty) {
  if (drone.moveCooldown > 0) return
  const dx = tx-drone.x, dy = ty-drone.y
  if (dx===0 && dy===0) return
  const step = Math.max(1, Math.round(1+state.upgrades.speed*0.2))
  if (Math.abs(dx) >= Math.abs(dy)) drone.x += Math.sign(dx)*Math.min(step,Math.abs(dx))
  else                               drone.y += Math.sign(dy)*Math.min(step,Math.abs(dy))
  const weather = getWeatherData()
  drone.battery = clamp(drone.battery - 0.08*weather.battery, 0, 100)
  drone.moveCooldown = Math.max(0, 5-state.upgrades.speed)
  syncDronePosition(drone)
}

function applyTileEffects(tile, drone) {
  const type = drone.type

  if (type === 'planter') {
    // ── use the drone's own cropType; fall back to global selectedCrop ──
    const cropKey  = drone.cropType || selectedCrop
    tile.planted   = true; tile.growth = 1; tile.waterBoost = 0
    tile.pestShield = 0;   tile.infested = false
    tile.cropType  = cropKey
    updateTileVisual(tile)
    log(`Plantio de ${CROPS[cropKey].name} em ${getCoordStr(tile.x,tile.y)}`)
    return
  }
  if (type === 'water') {
    tile.waterBoost = Math.min(4, tile.waterBoost+2)
    updateTileVisual(tile); log(`Irrigação em ${getCoordStr(tile.x,tile.y)}`); return
  }
  if (type === 'pesticide') {
    if (tile.infested) { tile.infested=false; tile.pestShield=3; log(`✨ Praga eliminada em ${getCoordStr(tile.x,tile.y)}!`) }
    else               { tile.pestShield=Math.min(3,tile.pestShield+2); log(`🛡️ Proteção em ${getCoordStr(tile.x,tile.y)}`) }
    updateTileVisual(tile); return
  }
  if (type === 'collector') {
    drone.carrying       = true
    drone._carryingCrop  = tile.cropType || 'wheat'
    tile.planted=false; tile.growth=0; tile.waterBoost=0; tile.pestShield=0; tile.infested=false
    updateTileVisual(tile)
    log(`📦 Coletor extraiu ${CROPS[drone._carryingCrop]?.name||'colheita'} em ${getCoordStr(tile.x,tile.y)}`)
  }
}

// --- COLHEITA MANUAL ---
function handleTileClick(e) {
  const tileEl = e.target.closest('.tile')
  if (!tileEl) return
  const x = parseInt(tileEl.dataset.x), y = parseInt(tileEl.dataset.y)
  if (isNaN(x) || isNaN(y)) return

  if (state.routeMode) { handleRouteModeClick(x, y, tileEl); return }

  const tile = getTileAt(x, y)
  if (!tile || !tile.planted || tile.growth < 100 || tile.infested) return

  const crop  = CROPS[tile.cropType] || CROPS.wheat
  const value = Math.floor(crop.value * (1 + state.upgrades.luck * 0.1))
  state.money += value; state.food += 1
  state.harvestLog.push(performance.now())
  tile.planted=false; tile.growth=0; tile.waterBoost=0; tile.pestShield=0; tile.infested=false
  updateTileVisual(tile)
  log(`👆 Colheita manual: ${crop.emoji} ${crop.name} +$${value}`)
  updateUI()
}

// --- ROTAS FIXAS ---
function startRouteMode() {
  state.routeMode = true; state.routeStep = 0; state.routePendingDrone = null
  routeBanner.textContent = '🛣️ Modo rota: clique num COLETOR para escolher (ou Esc para cancelar)'
  routeBanner.classList.add('visible')
  log('🛣️ Modo rota ativado. Clique num drone coletor.')
}

function cancelRouteMode() {
  state.routeMode = false; state.routeStep = 0; state.routePendingDrone = null
  routeBanner.classList.remove('visible')
}

function handleRouteModeClick(x, y, tileEl) {
  if (state.routeStep === 0) {
    const drone = state.drones.find(d => d.type==='collector' && d.x===x && d.y===y)
    if (!drone) {
      const input = prompt(`Tile de ORIGEM da rota. Confirme ou edite:`, getCoordStr(x,y))
      if (!input) return
      const coords = parseCoordStr(input)
      if (!coords) { log('❌ Coordenadas inválidas'); return }
      state.routePendingDrone = { fromX: coords.x, fromY: coords.y }
      const collectors = state.drones.filter(d => d.type==='collector')
      if (collectors.length === 0) { log('❌ Nenhum coletor disponível!'); cancelRouteMode(); return }
      const names = collectors.map((d,i) => `${i+1}: Coletor #${d.id} (${getCoordStr(d.x,d.y)})`).join('\n')
      const choice = prompt(`Qual coletor?\n${names}\nDigite o número:`)
      const idx = parseInt(choice) - 1
      if (isNaN(idx) || idx < 0 || idx >= collectors.length) { log('❌ Coletor inválido'); cancelRouteMode(); return }
      state.routePendingDrone.droneId = collectors[idx].id
    } else {
      state.routePendingDrone = { droneId: drone.id, fromX: x, fromY: y }
    }
    state.routeStep = 1
    routeBanner.textContent = '🛣️ Agora clique na REFINARIA de destino (ou Esc para cancelar)'
    log('🛣️ Coletor definido. Clique na refinaria destino.')

  } else if (state.routeStep === 1) {
    const refinery = getRefineryAt(x, y)
    if (!refinery) { log('❌ Clique numa refinaria (🏭) como destino!'); return }
    const pd = state.routePendingDrone
    state.routes = state.routes.filter(r => r.droneId !== pd.droneId)
    state.routes.push({ droneId: pd.droneId, fromX: pd.fromX, fromY: pd.fromY, toRefineryX: x, toRefineryY: y })
    const drone = state.drones.find(d => d.id === pd.droneId)
    if (drone?.element) drone.element.classList.add('routed')
    log(`✅ Rota definida! Coletor #${pd.droneId}: ${getCoordStr(pd.fromX,pd.fromY)} → ${getCoordStr(x,y)}`)
    cancelRouteMode(); updateUI()
  }
}

function removeRoute(droneId) {
  state.routes = state.routes.filter(r => r.droneId !== droneId)
  const drone = state.drones.find(d => d.id === droneId)
  if (drone?.element) drone.element.classList.remove('routed')
  log(`🗑️ Rota do coletor #${droneId} removida`)
}

// --- DRONE LOOP ---
function droneLoop() {
  const weather = getWeatherData()

  state.drones.forEach(drone => {
    drone.moveCooldown = Math.max(0, drone.moveCooldown-1)
    if (drone.element) drone.element.classList.toggle('lowbattery', drone.battery <= 12)

    if (drone.battery <= 0) {
      const nearest = state.chargers.reduce((best, c) => {
        const d  = Math.abs(c.x-drone.x)+Math.abs(c.y-drone.y)
        const bd = best ? Math.abs(best.x-drone.x)+Math.abs(best.y-drone.y) : Infinity
        return d < bd ? c : best
      }, null)
      if (nearest) moveDroneToward(drone, nearest.x, nearest.y)
      return
    }

    const charger = getChargerAt(drone.x, drone.y)
    if (charger && drone.battery < 100) {
      charger.chargingDrone = drone.id
      const rate = 0.12 * (weather.name==='Tempestade'?0.6:weather.name==='Geada'?0.7:1)
      drone.battery = clamp(drone.battery + rate + state.upgrades.battery*0.04, 0, 100)
      updateDroneBattery(drone); updateChargerVisual(charger)
      if (drone.element) drone.element.classList.add('charging')
      return
    } else if (charger) { charger.chargingDrone=null; updateChargerVisual(charger) }
    if (drone.element) drone.element.classList.remove('charging')

    const target = pickTargetTile(drone)
    if (!target) { if (drone.element) drone.element.classList.remove('busy','tasking'); return }

    drone.targetX = target.x; drone.targetY = target.y
    const atTarget = drone.x===target.x && drone.y===target.y
    if (drone.element) {
      drone.element.classList.toggle('busy',   !atTarget)
      drone.element.classList.toggle('tasking', atTarget)
    }

    if (!atTarget) { moveDroneToward(drone,target.x,target.y); updateDroneBattery(drone); return }

    drone.battery = clamp(drone.battery+0.06, 0, 100)
    updateDroneBattery(drone)

    if (drone.type==='planter'   && !target.planted && target.growth<=0 && !getRefineryAt(target.x,target.y)) applyTileEffects(target,drone)
    if (drone.type==='water'     && target.planted && target.growth>0 && target.growth<100) applyTileEffects(target,drone)
    if (drone.type==='pesticide' && target.planted && (target.infested||(target.growth>0&&target.growth<100))) applyTileEffects(target,drone)

    if (drone.type==='collector') {
      if (!drone.carrying && target.planted && target.growth>=100) {
        applyTileEffects(target, drone)
      } else if (drone.carrying) {
        const ref = getRefineryAt(drone.x, drone.y)
        if (ref) {
          const crop = CROPS[drone._carryingCrop] || CROPS.wheat
          ref.buffer++; ref._lastCrop = drone._carryingCrop
          drone.carrying=false; drone._carryingCrop=null
          updateRefineryVisual(ref)
          log(`🏭 ${crop.emoji} ${crop.name} entregue em ${getCoordStr(ref.x,ref.y)}`)
        }
      }
    }
  })
}

// --- CROP LOOP ---
function cropLoop() {
  const weather = getWeatherData()
  const totalUpgrades = state.upgrades.speed + state.upgrades.battery + state.upgrades.luck
  const dynamicPestChance = 0.0005 + totalUpgrades*0.0015

  state.tiles.forEach(tile => {
    if (getChargerAt(tile.x,tile.y) || getRefineryAt(tile.x,tile.y)) return
    if (!tile.planted) { updateTileVisual(tile); return }

    if (!tile.infested && tile.pestShield<=0 && tile.growth>5) {
      if (Math.random() < dynamicPestChance*weather.pest) {
        tile.infested = true
        log(`⚠️ Praga em ${getCoordStr(tile.x,tile.y)}!`)
      }
    }

    const crop        = CROPS[tile.cropType] || CROPS.wheat
    const waterFactor = tile.waterBoost > 0 ? 1.18 : 1
    const luckBonus   = 1 + state.upgrades.luck*0.06
    const growthSpeed = 0.12 * crop.growthRate * weather.growth * waterFactor * luckBonus
    const waterDrain  = 0.012 * weather.water * crop.waterNeed

    if (tile.infested) tile.growth = clamp(tile.growth - growthSpeed*1.5, 0, 100)
    else               tile.growth = clamp(tile.growth + growthSpeed,      0, 100)

    tile.waterBoost = Math.max(0, tile.waterBoost - waterDrain)
    tile.pestShield = Math.max(0, tile.pestShield - 0.01*weather.pest)
    updateTileVisual(tile)
  })
}

// --- REFINERY LOOP ---
function refineryProcessingLoop() {
  state.refineryTick++
  if (state.refineryTick % 15 !== 0) return
  state.refineries.forEach(ref => {
    if (ref.buffer <= 0) return
    ref.buffer--
    const crop  = CROPS[ref._lastCrop] || CROPS.wheat
    const base  = crop.value + state.upgrades.luck*4
    const bonus = Math.floor(rand(0, 16+state.upgrades.luck*2))
    const payout = base + bonus
    state.food += 1; state.money += payout; state.production += payout
    state.harvestLog.push(performance.now())
    updateRefineryVisual(ref)
    log(`🥫 ${crop.emoji} processado! +$${payout}`)
  })
}

function productionLoop() {
  const now = performance.now()
  state.harvestLog = state.harvestLog.filter(t => now-t < 60000)
  state.production = state.harvestLog.length * 15
}

// --- WEATHER LOOP ---
function weatherLoop() {
  state.weatherTickCount++
  if (state.weatherTickCount < state.weatherDuration) return
  state.weatherTickCount = 0

  const others   = weatherPool.filter(w => w.name !== state.weather)
  const weighted = []
  others.forEach(w => {
    const rarity = ['Onda de Calor','Geada','Tempestade'].includes(w.name) ? 1 : 3
    for (let i=0; i<rarity; i++) weighted.push(w)
  })
  const next = weighted[Math.floor(Math.random()*weighted.length)]
  state.weather         = next.name
  state.weatherDuration = Math.floor(rand(...next.duration))

  safeText(elWeather, `${next.emoji} ${next.name}`)
  log(`🌍 Clima: ${next.emoji} ${next.name}`)
  if (next.tip) log(next.tip)

  const shell = document.querySelector('.farm-shell')
  if (shell) {
    shell.className = 'farm-shell'
    const cls = { 'Tempestade':'weather-storm','Onda de Calor':'weather-heatwave','Geada':'weather-frost' }[next.name]
    if (cls) shell.classList.add(cls)
  }
}

// --- UPGRADES UI ---
function renderUpgradeBars() {
  ['speed','battery','luck'].forEach(type => {
    const btn = document.getElementById(`upgrade${type[0].toUpperCase()+type.slice(1)}`)
    if (!btn) return
    const level = state.upgrades[type], maxed = level >= UPGRADE_MAX, price = upgradePrice(type)
    const label = { speed:'Velocidade geral', battery:'Bateria dos drones', luck:'Eficiência da colheita' }[type]
    btn.innerHTML = `${label} ${maxed ? '<span style="color:#ffd166">MAX</span>' : `<span>$${price}</span>`}`
    btn.disabled  = maxed || state.money < price
    let bar = btn.nextElementSibling
    if (!bar || !bar.classList.contains('upgrade-bar')) {
      bar = document.createElement('div'); bar.className='upgrade-bar'; btn.after(bar)
    }
    bar.innerHTML = Array.from({length:UPGRADE_MAX},(_,i) =>
      `<span class="${i<level?'filled secondary':''}"></span>`
    ).join('')
  })
}

// --- CROP SELECTOR (global default + per-drone button) ---
function injectCropSelector() {
  const card = document.querySelector('.card')
  if (!card || document.getElementById('cropSelector')) return

  const div = document.createElement('div')
  div.id = 'cropSelector'
  div.innerHTML = `
    <p style="font-size:12px;color:#9db39d;margin-bottom:6px">
      🌿 Semente <em>padrão</em> para novos plantadores:
    </p>
    <div class="crop-selector">
      ${Object.entries(CROPS).map(([k,c]) => `
        <button class="crop-btn${k===selectedCrop?' active':''}" data-crop="${k}"
          title="${c.name}&#10;Vel:${c.growthRate}x  Água:${c.waterNeed}x  Valor:$${c.value}">
          ${c.emoji} ${c.name}
        </button>
      `).join('')}
    </div>
    <button id="btnAssignCrop">🎯 Configurar semente por drone</button>
  `
  card.insertBefore(div, card.querySelector('.buy'))

  // Global default buttons
  div.querySelectorAll('.crop-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      selectedCrop = btn.dataset.crop
      div.querySelectorAll('.crop-btn').forEach(b =>
        b.classList.toggle('active', b.dataset.crop===selectedCrop)
      )
      log(`🌿 Padrão: ${CROPS[selectedCrop].name} (afeta novos plantadores)`)
    })
  })

  // Per-drone assignment button
  document.getElementById('btnAssignCrop').addEventListener('click', assignCropToPlanter)
}

// --- REFINERY + ROUTE UI ---
function injectRefineryUI() {
  if (document.getElementById('placeRefinery')) return
  const btnPlaceCharger = document.getElementById('placeCharger')
  if (!btnPlaceCharger) return

  const btnPlace = document.createElement('button')
  btnPlace.id = 'placeRefinery'; btnPlace.className = btnPlaceCharger.className; btnPlace.style.margin='4px'
  btnPlace.innerHTML = '⚙️ Criar Refinaria (<span id="refineryPrice">$150</span>)'

  const btnRemove = document.createElement('button')
  btnRemove.id = 'removeRefinery'; btnRemove.className = btnPlaceCharger.className; btnRemove.style.margin='4px'
  btnRemove.textContent = '🔥 Remover Refinaria'

  const btnRoute = document.createElement('button')
  btnRoute.id = 'defineRoute'; btnRoute.className = btnPlaceCharger.className; btnRoute.style.margin='4px'
  btnRoute.style.background = 'linear-gradient(180deg,#ffcc80,#e67e22)'; btnRoute.style.color='#1a0d00'
  btnRoute.textContent = '🛣️ Definir rota de coletor'

  const btnDelRoute = document.createElement('button')
  btnDelRoute.id = 'deleteRoute'; btnDelRoute.className = btnPlaceCharger.className; btnDelRoute.style.margin='4px'
  btnDelRoute.style.background = 'linear-gradient(180deg,#ff9999,#e74c3c)'; btnDelRoute.style.color='#fff'
  btnDelRoute.textContent = '🗑️ Remover rota'

  const labelCount = document.createElement('div')
  labelCount.style.cssText = 'font-size:12px;margin:4px 0;'
  labelCount.innerHTML = `Fábricas Ativas: <strong id="count-refinery" style="color:#e67e22">0</strong>`

  const parent = btnPlaceCharger.parentElement
  parent.insertBefore(btnPlace,    btnPlaceCharger.nextSibling)
  parent.insertBefore(btnRemove,   btnPlace.nextSibling)
  parent.insertBefore(btnRoute,    btnRemove.nextSibling)
  parent.insertBefore(btnDelRoute, btnRoute.nextSibling)
  parent.appendChild(labelCount)

  btnPlace.addEventListener('click', placeRefinery)
  btnRemove.addEventListener('click', removeRefinery)
  btnRoute.addEventListener('click', startRouteMode)
  btnDelRoute.addEventListener('click', () => {
    const collectors = state.drones.filter(d => d.type==='collector' && getRouteFor(d))
    if (collectors.length===0) { log('❌ Nenhum coletor com rota definida.'); return }
    const names = collectors.map((d,i)=>`${i+1}: Coletor #${d.id} (${getCoordStr(d.x,d.y)})`).join('\n')
    const choice = parseInt(prompt(`Qual rota remover?\n${names}\nDigite o número:`))
    const drone  = collectors[choice-1]
    if (drone) removeRoute(drone.id)
    else log('❌ Escolha inválida.')
  })
}

// --- UPDATE UI ---
function updateUI() {
  const weather = getWeatherData()
  safeText(elMoney,         Math.floor(state.money))
  safeText(elFood,          state.food)
  safeText(elFarmScore,     Math.floor(state.production/4 + state.food*8))
  safeText(elDroneTotal,    state.drones.length)
  safeText(elProductionRate,Math.max(0, Math.round(state.production)))
  safeText(elWeather,       `${weather.emoji||''} ${state.weather}`)
  safeText(elGridSize,      `${state.gridSize}x${state.gridSize}`)
  safeText(elCountPlanter,  state.droneCounts.planter)
  safeText(elCountWater,    state.droneCounts.water)
  safeText(elCountPesticide,state.droneCounts.pesticide)
  safeText(elCountCollector,state.droneCounts.collector)
  safeText(elCountCharger,  state.droneCounts.charger)

  const elCR  = document.getElementById('count-refinery');  if (elCR)  safeText(elCR,  state.droneCounts.refinery)
  const elGSD = document.getElementById('gridSizeDisplay'); if (elGSD) safeText(elGSD, `${state.gridSize}x${state.gridSize}`)

  renderUpgradeBars()

  document.querySelectorAll('[data-buy]').forEach(btn => { btn.disabled = state.money < prices[btn.dataset.buy] })
  if (btnExpandFarm) btnExpandFarm.disabled = state.money < prices.farmExpand || state.gridSize >= 16
  const ep = document.getElementById('expandPrice');   if (ep) ep.textContent  = `$${Math.floor(prices.farmExpand)}`
  const pr = document.getElementById('placeRefinery'); if (pr) pr.disabled     = state.money < prices.refinery

  // Keep assign-crop button enabled only when planters exist
  const bac = document.getElementById('btnAssignCrop')
  if (bac) bac.disabled = state.drones.filter(d => d.type==='planter').length === 0
}

// --- PURCHASES ---
function buyDrone(type) {
  if (state.money < prices[type]) return
  state.money -= prices[type]; state.droneCounts[type]++
  spawnDrone(type)
  log(`Drone ${type} comprado`)
  updateUI()
}
function buyUpgrade(type) {
    if (state.upgrades[type] >= UPGRADE_MAX) {
        log(`Upgrade ${type} já no máximo!`)
        return
    }
    const price = upgradePrice(type)
    if (state.money >= price) {
        state.money -= price
        state.upgrades[type] = Math.min(state.upgrades[type] + 1, UPGRADE_MAX)
        updateUI()
        log(`Upgrade ${type} comprado!`)
    }
}
function expandFarm() {
    if (state.money < prices.farmExpand || state.gridSize >= MAX_GRID_SIZE) return
    state.money -= prices.farmExpand
    state.gridSize += 2
    prices.farmExpand = Math.floor(prices.farmExpand * 1.35)
    log(`Fazenda expandida para ${state.gridSize}x${state.gridSize}!`)
    initFarm()
    resizeDrones()
    updateUI()
}
function placeCharger() {
  const input = prompt(`Coordenadas da estação (ex: a1b1). Limite: a${state.gridSize}b${state.gridSize}`)
  if (!input) return
  const c = parseCoordStr(input); if (!c) { log('❌ Formato incorreto'); return }
  if (c.x<0||c.y<0||c.x>=state.gridSize||c.y>=state.gridSize) { log('❌ Fora da fazenda'); return }
  if (getChargerAt(c.x,c.y)) { log('❌ Já existe um carregador ali'); return }
  if (state.money < prices.charger) { log('❌ Sem fundos'); return }
  state.money -= prices.charger; state.droneCounts.charger++
  spawnCharger(c.x,c.y); log(`Estação em ${getCoordStr(c.x,c.y)}`); updateUI()
}
function removeCharger() {
  const input = prompt('Coordenadas da estação a remover:'); if (!input) return
  const c = parseCoordStr(input); if (!c) return
  if (getChargerAt(c.x,c.y)) { removeChargerAt(c.x,c.y); if (state.droneCounts.charger>0) state.droneCounts.charger--; log('Estação removida'); updateUI() }
  else log('❌ Nenhum carregador encontrado.')
}
function placeRefinery() {
  const input = prompt(`Coordenadas da refinaria (ex: a2b2). Limite: a${state.gridSize}b${state.gridSize}`)
  if (!input) return
  const c = parseCoordStr(input); if (!c) { log('❌ Coordenadas inválidas'); return }
  if (c.x<0||c.y<0||c.x>=state.gridSize||c.y>=state.gridSize) { log('❌ Fora da grade'); return }
  if (getRefineryAt(c.x,c.y)) { log('❌ Já existe uma refinaria aqui'); return }
  if (state.money < prices.refinery) { log('❌ Saldo insuficiente'); return }
  state.money -= prices.refinery; state.droneCounts.refinery++
  const tile = getTileAt(c.x,c.y); if (tile) { tile.planted=false; tile.growth=0 }
  spawnRefinery(c.x,c.y); log(`⚙️ Refinaria em ${getCoordStr(c.x,c.y)}`); updateUI()
}
function removeRefinery() {
  const input = prompt('Coordenadas da refinaria a remover:'); if (!input) return
  const c = parseCoordStr(input); if (!c) return
  if (getRefineryAt(c.x,c.y)) { removeRefineryAt(c.x,c.y); if (state.droneCounts.refinery>0) state.droneCounts.refinery--; log('Refinaria removida'); updateUI() }
  else log('❌ Nenhuma refinaria encontrada.')
}

// --- INIT ---
function initEvents() {
  document.querySelectorAll('[data-buy]').forEach(btn =>
    btn.addEventListener('click', () => buyDrone(btn.dataset.buy))
  )
  if (btnUpgradeSpeed)   btnUpgradeSpeed.addEventListener('click',   () => buyUpgrade('speed'))
  if (btnUpgradeBattery) btnUpgradeBattery.addEventListener('click', () => buyUpgrade('battery'))
  if (btnUpgradeLuck)    btnUpgradeLuck.addEventListener('click',    () => buyUpgrade('luck'))
  if (btnExpandFarm)     btnExpandFarm.addEventListener('click', expandFarm)

  const bpc = document.getElementById('placeCharger');  if (bpc) bpc.addEventListener('click', placeCharger)
  const brc = document.getElementById('removeCharger'); if (brc) brc.addEventListener('click', removeCharger)

  if (farmEl) farmEl.addEventListener('click', handleTileClick)
  document.addEventListener('keydown', e => { if (e.key==='Escape' && state.routeMode) cancelRouteMode() })

  injectCropSelector()
  injectRefineryUI()

  if (dronesLayer) {
    dronesLayer.addEventListener('mousedown', e => {
      const droneEl = e.target.closest('.drone')
      if (droneEl) {
        const drone = state.drones.find(d => d.element===droneEl)
        if (drone) { state.selectedDrone=drone; state.mouseDown=true; drone.element.classList.add('selected') }
      }
    })
    dronesLayer.addEventListener('mousemove', () => {
      if (state.mouseDown && state.selectedDrone) {
        state.selectedDrone.battery = clamp(state.selectedDrone.battery+0.5, 0, 100)
        updateDroneBattery(state.selectedDrone)
      }
    })
    dronesLayer.addEventListener('mouseup', () => {
      if (state.selectedDrone?.element) state.selectedDrone.element.classList.remove('selected')
      state.selectedDrone=null; state.mouseDown=false
    })
    document.addEventListener('mouseleave', () => {
      if (state.selectedDrone?.element) state.selectedDrone.element.classList.remove('selected')
      state.selectedDrone=null; state.mouseDown=false
    })
  }
}

function seedStart() {
  const seeds = [[1,1,'wheat'],[2,2,'corn'],[3,1,'soy'],[5,2,'wheat'],[1,5,'corn'],[4,4,'soy']]
  for (const [x,y,crop] of seeds) {
    const tile = getTileAt(x,y); if (!tile) continue
    tile.planted=true; tile.growth=rand(12,28); tile.waterBoost=0
    tile.pestShield=0; tile.infested=false; tile.cropType=crop
    updateTileVisual(tile)
  }
}

function resizeDrones() { state.drones.forEach(d => syncDronePosition(d, true)) }

function initGame() {
  initFarm(); initEvents(); seedStart()
  spawnDrone('planter'); spawnDrone('water'); spawnDrone('collector'); spawnDrone('pesticide')
  state.droneCounts.planter=1; state.droneCounts.water=1
  state.droneCounts.collector=1; state.droneCounts.pesticide=1
  log('Fazenda ligada!')
  log('Clique em ✅ para colher manualmente!')
  log('Use 🎯 para definir a semente de cada plantador.')
  updateUI()
}

function gameTick() {
  cropLoop(); droneLoop(); refineryProcessingLoop(); productionLoop(); weatherLoop(); updateUI()
}

window.addEventListener('resize', resizeDrones)
initGame()
setInterval(gameTick, 100)
