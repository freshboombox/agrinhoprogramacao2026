const gap = 10
let droneIdSeq = 1

const farmEl         = document.getElementById('farm')
const dronesLayer    = document.getElementById('dronesLayer')
const logEl          = document.getElementById('log')
const elMoney        = document.getElementById('money')
const elFood         = document.getElementById('food')
const elFarmScore    = document.getElementById('farmScore')
const elDroneTotal   = document.getElementById('droneTotal')
const elProductionRate = document.getElementById('productionRate')
const elWeather      = document.getElementById('weather')
const elGridSize     = document.getElementById('gridSize')
const elCountPlanter   = document.getElementById('count-planter')
const elCountWater     = document.getElementById('count-water')
const elCountPesticide = document.getElementById('count-pesticide')
const elCountCollector = document.getElementById('count-collector')
const elCountCharger   = document.getElementById('count-charger')
const btnUpgradeSpeed   = document.getElementById('upgradeSpeed')
const btnUpgradeBattery = document.getElementById('upgradeBattery')
const btnUpgradeLuck    = document.getElementById('upgradeLuck')
const btnExpandFarm     = document.getElementById('expandFarm')

const UPGRADE_MAX = 10

// ── CROPS ──────────────────────────────────────────────────────────────────
const CROPS = {
  wheat: { name:'Trigo', emoji:'🌾', growthRate:1.0, waterNeed:1.0, value:40, seedCost: 4, color:'#c8a84b' },
  corn:  { name:'Milho', emoji:'🌽', growthRate:0.7, waterNeed:1.4, value:70, seedCost:12, color:'#e8c840' },
  soy:   { name:'Soja',  emoji:'🫘', growthRate:1.3, waterNeed:0.7, value:25, seedCost: 2, color:'#7db84a' },
}
let selectedCrop = 'wheat'

// ── STATE ──────────────────────────────────────────────────────────────────
const state = {
  money:250, food:0, production:0,
  weather:'Calmo', weatherDuration:250, weatherTickCount:0,
  gridSize:8,
  upgrades:{ speed:0, battery:0, luck:0 },
  droneCounts:{ planter:0, water:0, pesticide:0, collector:0, charger:0, refinery:0 },
  drones:[], chargers:[], refineries:[], refineryTick:0,
  tiles:[], harvestLog:[],
  selectedDrone:null, mouseDown:false,
  routes:[], routeMode:false, routeStep:0, routePendingDrone:null,
}

const prices = {
  planter:50, water:75, pesticide:110, collector:95,
  charger:120, refinery:150,
  speed:140, battery:160, luck:180, farmExpand:200,
}

function upgradePrice(type) {
  return Math.floor(prices[type] * Math.pow(1.6, state.upgrades[type]))
}

const emojis = { planter:'🌱', water:'💧', pesticide:'☠️', collector:'📦', charger:'🔌' }

const weatherPool = [
  { name:'Calmo',         emoji:'🌤️', growth:1.0,  pest:1.0,  water:1.0,  battery:1.0,  duration:[200,350], tip:null },
  { name:'Nublado',       emoji:'☁️',  growth:1.08, pest:0.9,  water:0.85, battery:0.95, duration:[180,300], tip:'Nuvens protegem das pragas e reduzem evaporação.' },
  { name:'Chuva',         emoji:'🌧️', growth:1.05, pest:0.75, water:0.4,  battery:1.1,  duration:[150,250], tip:'⚡ Chuva consome mais bateria, mas irriga sozinha!' },
  { name:'Tempestade',    emoji:'⛈️', growth:0.7,  pest:0.6,  water:0.2,  battery:1.5,  duration:[80,140],  tip:'⚠️ TEMPESTADE! Drones gastam bateria rapidamente!' },
  { name:'Seco',          emoji:'🏜️', growth:0.88, pest:1.2,  water:1.6,  battery:0.9,  duration:[200,320], tip:'☀️ Tempo seco: irrigadores em ação urgente!' },
  { name:'Onda de Calor', emoji:'🌡️', growth:0.6,  pest:1.5,  water:2.0,  battery:1.3,  duration:[100,180], tip:'🔥 CALOR EXTREMO! Plantas e drones sofrem muito!' },
  { name:'Vento Forte',   emoji:'💨', growth:0.95, pest:1.3,  water:1.15, battery:1.2,  duration:[120,200], tip:'💨 Vento espalha pragas e seca o solo!' },
  { name:'Geada',         emoji:'❄️', growth:0.45, pest:0.3,  water:0.7,  battery:1.4,  duration:[100,160], tip:'❄️ GEADA! Crescimento travado. Aguarde passar.' },
]

// ── STYLES ─────────────────────────────────────────────────────────────────
const style = document.createElement('style')
style.innerHTML = `
  .tile.refinery-tile{background:#2c3e50!important;border:2px solid #e67e22!important;box-shadow:inset 0 0 8px rgba(230,126,34,.3);}
  .tile.refinery-tile.active{box-shadow:inset 0 0 15px #e67e22!important;}
  .weather-storm .tile.planted{box-shadow:inset 0 0 12px rgba(80,80,255,.25)!important;}
  .weather-heatwave .tile.planted{box-shadow:inset 0 0 14px rgba(255,80,0,.3)!important;}
  .weather-frost .tile.planted{box-shadow:inset 0 0 14px rgba(100,200,255,.35)!important;filter:brightness(.85);}
  .upgrade-bar{display:flex;gap:3px;margin-top:4px;margin-bottom:6px;}
  .upgrade-bar span{flex:1;height:6px;border-radius:3px;background:rgba(255,255,255,.1);transition:background .3s;}
  .upgrade-bar span.filled{background:linear-gradient(90deg,#8ce36a,#5fb84a);}
  .upgrade-bar span.filled.secondary{background:linear-gradient(90deg,#7dbfff,#4e90e0);}
  #weather{font-size:15px!important;}
  .crop-selector{display:flex;gap:6px;margin-bottom:6px;flex-wrap:wrap;}
  .crop-btn{flex:1;min-width:60px;border:none;border-radius:10px;padding:8px 6px;font-size:12px;font-weight:700;cursor:pointer;background:rgba(255,255,255,.07);color:#cde8cd;transition:background .2s,transform .1s;}
  .crop-btn:hover{background:rgba(255,255,255,.14);transform:scale(1.04);}
  .crop-btn.active{background:linear-gradient(135deg,#3a6e3a,#2d5a2d);box-shadow:0 0 8px rgba(100,220,100,.35);}
  #btnAssignCrop{width:100%;margin-top:4px;padding:7px;border:none;border-radius:8px;background:linear-gradient(135deg,#4a4e2a,#2d3a1a);color:#d4e88a;font-size:12px;font-weight:700;cursor:pointer;transition:opacity .2s;}
  #btnAssignCrop:disabled{opacity:.35;cursor:not-allowed;}
  .drone-badge{position:absolute;bottom:1px;right:2px;font-size:7px;line-height:1;pointer-events:none;}
`
document.head.appendChild(style)

// ── UTILITIES ──────────────────────────────────────────────────────────────
function rand(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min }
function clamp(v, mn, mx) { return Math.max(mn, Math.min(mx, v)) }
function safeText(el, val) { if (el) el.textContent = String(val) }

function log(text) {
  if (!logEl) return
  const row = document.createElement('div')
  row.textContent = `▸ ${text}`
  logEl.prepend(row)
  while (logEl.children.length > 18) logEl.removeChild(logEl.lastChild)
}

function getCoordStr(x, y) {
  const col = String.fromCharCode(97 + x)
  return `${col}${y + 1}`
}

function getTileAt(x, y)    { return state.tiles.find(t => t.x === x && t.y === y) }
function getChargerAt(x, y) { return state.chargers.find(c => c.x === x && c.y === y) }
function getRefineryAt(x, y){ return state.refineries.find(r => r.x === x && r.y === y) }

function findClosestRefinery(drone) {
  let best = null, bestDist = Infinity
  for (const r of state.refineries) {
    const d = Math.abs(r.x - drone.x) + Math.abs(r.y - drone.y)
    if (d < bestDist) { bestDist = d; best = r }
  }
  return best
}

function getWeatherData() {
  return weatherPool.find(w => w.name === state.weather) || weatherPool[0]
}

// ── FARM INIT ──────────────────────────────────────────────────────────────
function seedStart() {
  farmEl.innerHTML = ''
  state.tiles = []
  const n = state.gridSize
  farmEl.style.gridTemplateColumns = `repeat(${n}, 1fr)`
  for (let y = 0; y < n; y++) {
    for (let x = 0; x < n; x++) {
      const tile = {
        x, y, element: null,
        planted: false, growth: 0, waterBoost: 0,
        pestShield: 0, infested: false, cropType: null,
      }
      const el = document.createElement('div')
      el.className = 'tile'
      el.dataset.x = x
      el.dataset.y = y
      el.title = getCoordStr(x, y)
      farmEl.appendChild(el)
      tile.element = el
      state.tiles.push(tile)
    }
  }
}

function expandFarm() {
  if (state.money < prices.farmExpand) { log('❌ Sem saldo para expandir'); return }
  state.money -= prices.farmExpand
  state.gridSize = Math.min(state.gridSize + 1, 14)
  seedStart()
  resizeDrones()
  log(`🌾 Fazenda expandida para ${state.gridSize}×${state.gridSize}`)
  updateUI()
}

// ── TILE VISUALS ───────────────────────────────────────────────────────────
function updateTileVisual(tile) {
  const el = tile.element
  if (!el) return
  el.className = 'tile'
  el.style.cssText = ''
  el.innerHTML = ''

  if (getRefineryAt(tile.x, tile.y)) {
    const ref = getRefineryAt(tile.x, tile.y)
    el.className = 'tile refinery-tile' + (ref.stock > 0 ? ' active' : '')
    el.innerHTML = `<span style="font-size:18px">🏭</span><span style="font-size:9px;color:#e67e22">${ref.stock}</span>`
    return
  }
  if (getChargerAt(tile.x, tile.y)) {
    el.innerHTML = `<span style="font-size:18px">🔌</span>`
    el.style.background = 'rgba(80,120,255,.18)'
    return
  }
  if (tile.infested) {
    el.classList.add('infested')
    el.innerHTML = `<span style="font-size:16px">🐛</span>`
    return
  }
  if (tile.planted) {
    const crop = CROPS[tile.cropType] || CROPS.wheat
    const pct = Math.min(100, tile.growth)
    el.classList.add('planted')
    el.style.background = `linear-gradient(to top, ${crop.color}55 ${pct}%, #1a2e1a ${pct}%)`
    const size = 10 + pct * 0.12
    el.innerHTML = `<span style="font-size:${size}px">${pct >= 100 ? crop.emoji : '🌱'}</span>`
    if (tile.waterBoost > 0) el.style.boxShadow = 'inset 0 0 6px rgba(64,164,255,.5)'
    if (tile.pestShield > 0) el.style.outline = '2px solid rgba(200,60,220,.5)'
  }
}

function updateAllTiles() { state.tiles.forEach(updateTileVisual) }

// ── DRONE SPAWNING ─────────────────────────────────────────────────────────
function cellToPx(x, y) {
  const tileEls = farmEl.querySelectorAll('.tile')
  const idx = y * state.gridSize + x
  const tEl = tileEls[idx]
  if (!tEl) return { left: 0, top: 0 }
  const fr = farmEl.getBoundingClientRect()
  const tr = tEl.getBoundingClientRect()
  return {
    left: tr.left - fr.left + tr.width / 2,
    top:  tr.top  - fr.top  + tr.height / 2,
  }
}

function syncDronePosition(drone, snap = false) {
  if (!drone.element) return
  const pos = cellToPx(drone.x, drone.y)
  if (snap) {
    drone.element.style.transition = 'none'
    drone.element.style.left = `${pos.left}px`
    drone.element.style.top  = `${pos.top}px`
    drone.element.style.transform = 'translate(-50%,-50%) scale(1)'
    requestAnimationFrame(() => { if (drone.element) drone.element.style.transition = '' })
    return
  }
  drone.element.style.left = `${pos.left}px`
  drone.element.style.top  = `${pos.top}px`
}

function updatePlanterDroneVisual(drone) {
  if (!drone.element) return
  const crop = CROPS[drone.cropType] || CROPS[selectedCrop]
  drone.element.innerHTML = `${emojis[drone.type] || '🤖'}<span class="drone-badge">${crop.emoji}</span>`
}

function spawnDrone(type) {
  const id = droneIdSeq++
  const maxBat = 100 + state.upgrades.battery * 20
  const cropKey = (type === 'planter') ? selectedCrop : null
  const drone = {
    id, type, cropType: cropKey,
    x: rand(0, state.gridSize - 1),
    y: rand(0, state.gridSize - 1),
    battery: maxBat, maxBattery: maxBat,
    speed: 1 + state.upgrades.speed * 0.15,
    cooldown: 0, carrying: 0,
    charging: false, goingToCharge: false,
    element: null,
  }
  const el = document.createElement('div')
  el.className = 'drone'
  el.dataset.id = id
  el.title = type

  if (type === 'planter') {
    const crop = CROPS[cropKey] || CROPS.wheat
    el.innerHTML = `${emojis[type]}<span class="drone-badge">${crop.emoji}</span>`
  } else {
    el.textContent = emojis[type] || '🤖'
  }

  dronesLayer.appendChild(el)
  drone.element = el
  syncDronePosition(drone, true)
  state.drones.push(drone)
  state.droneCounts[type] = (state.droneCounts[type] || 0) + 1
  return drone
}

function resizeDrones() {
  state.drones.forEach(d => syncDronePosition(d, true))
}

// ── CHARGER / REFINERY PLACEMENT ───────────────────────────────────────────
function placeCharger(x, y) {
  if (getChargerAt(x, y)) { log('❌ Já tem carregador aqui'); return }
  if (getRefineryAt(x, y)) { log('❌ Já tem refinaria aqui'); return }
  state.chargers.push({ x, y })
  state.droneCounts.charger++
  updateTileVisual(getTileAt(x, y))
  log(`🔌 Carregador em ${getCoordStr(x, y)}`)
  updateUI()
}

function spawnRefinery(x, y) {
  if (getRefineryAt(x, y)) { log('❌ Já tem refinaria aqui'); return }
  if (getChargerAt(x, y)) { log('❌ Já tem carregador aqui'); return }
  state.refineries.push({ x, y, stock: 0, processed: 0 })
  state.droneCounts.refinery++
  updateTileVisual(getTileAt(x, y))
  log(`🏭 Refinaria em ${getCoordStr(x, y)}`)
  updateUI()
}

// ── CROP SELECTOR UI ───────────────────────────────────────────────────────
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
      ${Object.entries(CROPS).map(([k, c]) => `
        <button class="crop-btn${k === selectedCrop ? ' active' : ''}" data-crop="${k}"
          title="${c.name}&#10;Vel:${c.growthRate}x  Água:${c.waterNeed}x  Venda:$${c.value}  Semente:$${c.seedCost}">
          ${c.emoji} ${c.name}
          <span style="display:block;font-size:10px;opacity:.7;font-weight:400">semente $${c.seedCost}</span>
        </button>
      `).join('')}
    </div>
    <button id="btnAssignCrop">🎯 Configurar semente por drone</button>
  `
  card.insertBefore(div, card.querySelector('.buy'))

  div.querySelectorAll('.crop-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      selectedCrop = btn.dataset.crop
      div.querySelectorAll('.crop-btn').forEach(b =>
        b.classList.toggle('active', b.dataset.crop === selectedCrop)
      )
      log(`🌿 Padrão: ${CROPS[selectedCrop].name} (semente $${CROPS[selectedCrop].seedCost})`)
    })
  })

  document.getElementById('btnAssignCrop').addEventListener('click', assignCropToPlanter)
}

function assignCropToPlanter() {
  const planters = state.drones.filter(d => d.type === 'planter')
  if (!planters.length) { log('❌ Nenhum plantador disponível'); return }

  const droneChoice = prompt(
    'Qual plantador?\n' +
    planters.map((d, i) => `${i + 1}. Drone #${d.id} → ${CROPS[d.cropType]?.name || '?'} ${CROPS[d.cropType]?.emoji || ''}`).join('\n')
  )
  const idx = parseInt(droneChoice) - 1
  if (isNaN(idx) || idx < 0 || idx >= planters.length) { log('❌ Seleção inválida'); return }
  const drone = planters[idx]

  const cropKeys = Object.keys(CROPS)
  const cropChoice = prompt(
    'Qual semente?\n' +
    cropKeys.map((k, i) => `${i + 1}. ${CROPS[k].emoji} ${CROPS[k].name} (semente $${CROPS[k].seedCost}, venda $${CROPS[k].value})`).join('\n')
  )
  const cidx = parseInt(cropChoice) - 1
  if (isNaN(cidx) || cidx < 0 || cidx >= cropKeys.length) { log('❌ Seleção inválida'); return }

  drone.cropType = cropKeys[cidx]
  updatePlanterDroneVisual(drone)
  log(`🔄 Drone #${drone.id} agora planta ${CROPS[drone.cropType].name} ${CROPS[drone.cropType].emoji}`)
}

// ── TILE CLICK / ROUTE MODE ─────────────────────────────────────────────────
function handleTileClick(x, y) {
  if (state.routeMode) { handleRouteModeClick(x, y); return }

  const tile = getTileAt(x, y)
  if (!tile) return

  if (state.selectedDrone) {
    const d = state.selectedDrone
    d.x = x; d.y = y
    syncDronePosition(d, true)
    state.selectedDrone = null
    farmEl.querySelectorAll('.tile').forEach(t => t.classList.remove('highlight'))
    return
  }
}

function handleRouteModeClick(x, y) {
  if (state.routeStep === 0) {
    state.routePendingDrone = state.drones.find(d => d.x === x && d.y === y)
    if (!state.routePendingDrone) { log('❌ Nenhum drone nesta tile'); return }
    state.routeStep = 1
    log(`📍 Drone #${state.routePendingDrone.id} selecionado. Clique no destino.`)
  } else if (state.routeStep === 1 && state.routePendingDrone) {
    state.routes.push({ drone: state.routePendingDrone, tx: x, ty: y })
    log(`🛣️ Rota: Drone #${state.routePendingDrone.id} → ${getCoordStr(x, y)}`)
    state.routeMode = false; state.routeStep = 0; state.routePendingDrone = null
  }
}

// ── TILE EFFECTS (planter / water / pesticide / collector) ─────────────────
function applyTileEffects(drone) {
  const tile = getTileAt(drone.x, drone.y)
  if (!tile) return
  const type = drone.type

  if (type === 'planter') {
    const cropKey = drone.cropType || selectedCrop
    const crop    = CROPS[cropKey]
    if (tile.planted || tile.infested) return
    if (getRefineryAt(tile.x, tile.y) || getChargerAt(tile.x, tile.y)) return
    if (state.money < crop.seedCost) {
      log(`❌ Sem saldo para sementes de ${crop.name} ($${crop.seedCost})`)
      return
    }
    state.money   -= crop.seedCost
    tile.planted   = true; tile.growth = 1; tile.waterBoost = 0
    tile.pestShield = 0;   tile.infested = false
    tile.cropType  = cropKey
    updateTileVisual(tile)
    log(`🌱 ${crop.emoji} ${crop.name} plantado -$${crop.seedCost} em ${getCoordStr(tile.x, tile.y)}`)
    return
  }

  if (type === 'water') {
    tile.waterBoost = Math.min(4, tile.waterBoost + 2)
    updateTileVisual(tile)
    log(`💧 Irrigação em ${getCoordStr(tile.x, tile.y)}`)
    return
  }

  if (type === 'pesticide') {
    if (tile.infested) {
      tile.infested = false
      tile.pestShield = 3
      updateTileVisual(tile)
      log(`☠️ Praga eliminada em ${getCoordStr(tile.x, tile.y)}`)
    } else {
      tile.pestShield = Math.min(5, (tile.pestShield || 0) + 2)
      updateTileVisual(tile)
    }
    return
  }

  if (type === 'collector') {
    if (!tile.planted || tile.growth < 100) return
    if (getRefineryAt(tile.x, tile.y)) return

    const ref = findClosestRefinery(drone)
    const crop = CROPS[tile.cropType] || CROPS.wheat
    const luck = 1 + state.upgrades.luck * 0.05
    const weatherMult = getWeatherData().growth

    tile.planted  = false; tile.growth = 0
    tile.waterBoost = 0;   tile.cropType = null
    updateTileVisual(tile)

    if (ref) {
      ref.stock++
      drone.carrying++
      const refTile = getTileAt(ref.x, ref.y)
      if (refTile) updateTileVisual(refTile)
      log(`📦 Colhido → refinaria em ${getCoordStr(ref.x, ref.y)} (estoque: ${ref.stock})`)
    } else {
      const earned = Math.round(crop.value * luck * weatherMult)
      state.money += earned
      state.food  += 1
      state.production++
      state.harvestLog.push({ crop: tile.cropType, value: earned, tick: Date.now() })
      log(`💰 Colhido ${crop.emoji} +$${earned}`)
      updateUI()
    }
    return
  }
}

// ── REFINERY PROCESSING LOOP ───────────────────────────────────────────────
function refineryProcessingLoop() {
  state.refineryTick = (state.refineryTick || 0) + 1
  if (state.refineryTick % 20 !== 0) return

  for (const ref of state.refineries) {
    if (ref.stock <= 0) continue
    const batch = Math.min(ref.stock, 3)
    ref.stock -= batch
    ref.processed = (ref.processed || 0) + batch

    const luck = 1 + state.upgrades.luck * 0.05
    const earned = Math.round(batch * 55 * luck)
    state.money += earned
    state.food  += batch
    state.production += batch

    const refTile = getTileAt(ref.x, ref.y)
    if (refTile) updateTileVisual(refTile)
    log(`🏭 Refinaria processou ${batch} item(s) → +$${earned}`)
    updateUI()
  }
}

// ── CROP LOOP ──────────────────────────────────────────────────────────────
function cropLoop() {
  const wd = getWeatherData()
  for (const tile of state.tiles) {
    if (!tile.planted) continue
    const crop = CROPS[tile.cropType] || CROPS.wheat

    // rain waters automatically
    if (wd.name === 'Chuva' || wd.name === 'Tempestade') {
      tile.waterBoost = Math.min(4, tile.waterBoost + 0.5)
    }

    // growth
    let growBy = crop.growthRate * wd.growth
    if (tile.waterBoost > 0) { growBy *= 1.3; tile.waterBoost = Math.max(0, tile.waterBoost - 0.1) }
    if (tile.infested) growBy *= 0.3
    tile.growth = Math.min(100, tile.growth + growBy * 0.4)

    // pest spread
    if (!tile.infested && tile.pestShield <= 0) {
      const chance = 0.0008 * wd.pest
      if (Math.random() < chance) {
        tile.infested = true
        log(`🐛 Praga em ${getCoordStr(tile.x, tile.y)}!`)
      }
    }
    if (tile.pestShield > 0) tile.pestShield -= 0.01

    updateTileVisual(tile)
  }
}

// ── DRONE LOOP ─────────────────────────────────────────────────────────────
function findBestTask(drone) {
  const type = drone.type
  const wd   = getWeatherData()

  if (type === 'planter') {
    return state.tiles.find(t =>
      !t.planted && !t.infested &&
      !getRefineryAt(t.x, t.y) && !getChargerAt(t.x, t.y)
    ) || null
  }

  if (type === 'water') {
    // priority: tiles with low water during dry/hot weather
    const needyFirst = state.tiles
      .filter(t => t.planted && t.waterBoost < 1)
      .sort((a, b) => a.waterBoost - b.waterBoost)
    return needyFirst[0] || state.tiles.find(t => t.planted && t.waterBoost < 2) || null
  }

  if (type === 'pesticide') {
    return state.tiles.find(t => t.infested) ||
           state.tiles.find(t => t.planted && (t.pestShield || 0) < 1) || null
  }

  if (type === 'collector') {
    return state.tiles.find(t => t.planted && t.growth >= 100) || null
  }

  return null
}

function moveDroneToward(drone, tx, ty) {
  const wd = getWeatherData()
  const spd = drone.speed * (1 / wd.battery)
  const dx = tx - drone.x
  const dy = ty - drone.y

  if (Math.abs(dx) >= Math.abs(dy)) {
    drone.x += clamp(Math.sign(dx) * Math.ceil(spd), -1, 1)
  } else {
    drone.y += clamp(Math.sign(dy) * Math.ceil(spd), -1, 1)
  }
drone.x = clamp(drone.x, 0, state.gridSize - 1)
  drone.y = clamp(drone.y, 0, state.gridSize - 1)
}

function updateDroneBattery(drone) {
  const wd = getWeatherData()
  const drain = 0.18 * wd.battery * (1 - state.upgrades.battery * 0.04)
  drone.battery = Math.max(0, drone.battery - drain)
}

function droneLoop() {
  for (const drone of state.drones) {
    if (drone.cooldown > 0) { drone.cooldown--; continue }

    // ── charging logic ─────────────────────────────────────────────────────
    const lowThreshold = drone.maxBattery * 0.25
    if (drone.battery <= 0) {
      drone.charging = true
      drone.goingToCharge = false
    }
    if (drone.battery < lowThreshold && !drone.charging) {
      drone.goingToCharge = true
    }

    if (drone.charging || drone.goingToCharge) {
      const charger = state.chargers.reduce((best, c) => {
        const d = Math.abs(c.x - drone.x) + Math.abs(c.y - drone.y)
        const bd = best ? Math.abs(best.x - drone.x) + Math.abs(best.y - drone.y) : Infinity
        return d < bd ? c : best
      }, null)

      if (!charger) {
        // no charger placed — recover slowly in place
        drone.battery = Math.min(drone.maxBattery, drone.battery + 0.5)
        if (drone.battery >= drone.maxBattery) { drone.charging = false; drone.goingToCharge = false }
        syncDronePosition(drone)
        continue
      }

      if (drone.x === charger.x && drone.y === charger.y) {
        drone.battery = Math.min(drone.maxBattery, drone.battery + 4)
        if (drone.battery >= drone.maxBattery) { drone.charging = false; drone.goingToCharge = false }
      } else {
        moveDroneToward(drone, charger.x, charger.y)
        updateDroneBattery(drone)
      }
      syncDronePosition(drone)
      continue
    }

    // ── route override ─────────────────────────────────────────────────────
    const route = state.routes.find(r => r.drone === drone)
    if (route) {
      if (drone.x === route.tx && drone.y === route.ty) {
        state.routes = state.routes.filter(r => r !== route)
      } else {
        moveDroneToward(drone, route.tx, route.ty)
        updateDroneBattery(drone)
        syncDronePosition(drone)
        continue
      }
    }

    // ── normal task ────────────────────────────────────────────────────────
    const task = findBestTask(drone)
    if (!task) {
      // wander
      if (Math.random() < 0.1) {
        drone.x = clamp(drone.x + rand(-1, 1), 0, state.gridSize - 1)
        drone.y = clamp(drone.y + rand(-1, 1), 0, state.gridSize - 1)
      }
      updateDroneBattery(drone)
      syncDronePosition(drone)
      continue
    }

    if (drone.x === task.x && drone.y === task.y) {
      applyTileEffects(drone)
      drone.cooldown = Math.max(2, Math.round(8 / drone.speed))
    } else {
      moveDroneToward(drone, task.x, task.y)
    }

    updateDroneBattery(drone)
    syncDronePosition(drone)
  }
}

// ── WEATHER LOOP ───────────────────────────────────────────────────────────
function weatherLoop() {
  state.weatherTickCount++
  if (state.weatherTickCount < state.weatherDuration) return
  state.weatherTickCount = 0

  const next = weatherPool[rand(0, weatherPool.length - 1)]
  state.weather = next.name
  state.weatherDuration = rand(...next.duration)

  farmEl.className = ''
  if (next.name === 'Tempestade')    farmEl.classList.add('weather-storm')
  if (next.name === 'Onda de Calor') farmEl.classList.add('weather-heatwave')
  if (next.name === 'Geada')         farmEl.classList.add('weather-frost')

  if (next.tip) log(`${next.emoji} ${next.tip}`)
  log(`🌦️ Clima: ${next.emoji} ${next.name}`)
}

// ── PRODUCTION LOOP ────────────────────────────────────────────────────────
function productionLoop() {
  // passive income from food stockpile
  if (state.food > 0 && Math.random() < 0.02) {
    const bonus = Math.floor(state.food * 0.1)
    if (bonus > 0) {
      state.money += bonus
      state.food  -= Math.min(state.food, Math.ceil(bonus / 10))
    }
  }
}

// ── UI ─────────────────────────────────────────────────────────────────────
function buildUpgradeBar(type, secondary = false) {
  const lvl = state.upgrades[type] || 0
  return `<div class="upgrade-bar">${Array.from({ length: UPGRADE_MAX }, (_, i) =>
    `<span class="${i < lvl ? 'filled' + (secondary ? ' secondary' : '') : ''}"></span>`
  ).join('')}</div>`
}

function updateUI() {
  safeText(elMoney, `$${state.money}`)
  safeText(elFood,  state.food)
  safeText(elFarmScore, state.production)
  safeText(elDroneTotal, state.drones.length)
  safeText(elGridSize, `${state.gridSize}×${state.gridSize}`)

  const wd = getWeatherData()
  safeText(elWeather, `${wd.emoji} ${state.weather}`)

  // production rate: average of last 10 harvests
  if (state.harvestLog.length > 0) {
    const recent = state.harvestLog.slice(-10)
    const avg = Math.round(recent.reduce((s, h) => s + h.value, 0) / recent.length)
    safeText(elProductionRate, `~$${avg}/colheita`)
  }

  safeText(elCountPlanter,   state.droneCounts.planter   || 0)
  safeText(elCountWater,     state.droneCounts.water      || 0)
  safeText(elCountPesticide, state.droneCounts.pesticide  || 0)
  safeText(elCountCollector, state.droneCounts.collector  || 0)
  safeText(elCountCharger,   state.droneCounts.charger    || 0)

  // upgrade buttons
  const sLvl = state.upgrades.speed
  const bLvl = state.upgrades.battery
  const lLvl = state.upgrades.luck

  if (btnUpgradeSpeed) {
    const sp = upgradePrice('speed')
    btnUpgradeSpeed.disabled = state.money < sp || sLvl >= UPGRADE_MAX
    const lbl = btnUpgradeSpeed.querySelector('.price')
    if (lbl) lbl.textContent = sLvl >= UPGRADE_MAX ? 'MAX' : `$${sp}`
    const bar = btnUpgradeSpeed.querySelector('.upgrade-bar')
    if (bar) bar.outerHTML = buildUpgradeBar('speed')
    else btnUpgradeSpeed.insertAdjacentHTML('beforeend', buildUpgradeBar('speed'))
  }
  if (btnUpgradeBattery) {
    const bp = upgradePrice('battery')
    btnUpgradeBattery.disabled = state.money < bp || bLvl >= UPGRADE_MAX
    const lbl = btnUpgradeBattery.querySelector('.price')
    if (lbl) lbl.textContent = bLvl >= UPGRADE_MAX ? 'MAX' : `$${bp}`
  }
  if (btnUpgradeLuck) {
    const lp = upgradePrice('luck')
    btnUpgradeLuck.disabled = state.money < lp || lLvl >= UPGRADE_MAX
    const lbl = btnUpgradeLuck.querySelector('.price')
    if (lbl) lbl.textContent = lLvl >= UPGRADE_MAX ? 'MAX' : `$${lp}`
  }
  if (btnExpandFarm) {
    btnExpandFarm.disabled = state.money < prices.farmExpand || state.gridSize >= 14
  }

  // assign-crop button
  const btnAssign = document.getElementById('btnAssignCrop')
  if (btnAssign) {
    btnAssign.disabled = state.drones.filter(d => d.type === 'planter').length === 0
  }

  // drone buy buttons
  document.querySelectorAll('[data-buy]').forEach(btn => {
    const type = btn.dataset.buy
    btn.disabled = state.money < (prices[type] || 999)
  })
}

// ── BUY DRONE ──────────────────────────────────────────────────────────────
function buyDrone(type) {
  const price = prices[type]
  if (!price) { log(`❌ Tipo desconhecido: ${type}`); return }
  if (state.money < price) { log(`❌ Sem saldo (precisa $${price})`); return }
  state.money -= price
  spawnDrone(type)
  log(`✅ ${emojis[type] || type} comprado por $${price}`)
  updateUI()
}

// ── BUY CHARGER ────────────────────────────────────────────────────────────
function buyCharger() {
  const price = prices.charger
  if (state.money < price) { log(`❌ Sem saldo (precisa $${price})`); return }
  const coord = prompt('Coordenada para o carregador (ex: a3):')
  if (!coord) return
  const col = coord[0].toLowerCase().charCodeAt(0) - 97
  const row = parseInt(coord.slice(1)) - 1
  if (isNaN(col) || isNaN(row) || col < 0 || row < 0 || col >= state.gridSize || row >= state.gridSize) {
    log('❌ Coordenada inválida'); return
  }
  state.money -= price
  placeCharger(col, row)
  updateUI()
}

// ── BUY REFINERY ───────────────────────────────────────────────────────────
function buyRefinery() {
  const price = prices.refinery
  if (state.money < price) { log(`❌ Sem saldo (precisa $${price})`); return }
  const coord = prompt('Coordenada para a refinaria (ex: b4):')
  if (!coord) return
  const col = coord[0].toLowerCase().charCodeAt(0) - 97
  const row = parseInt(coord.slice(1)) - 1
  if (isNaN(col) || isNaN(row) || col < 0 || row < 0 || col >= state.gridSize || row >= state.gridSize) {
    log('❌ Coordenada inválida'); return
  }
  state.money -= price
  spawnRefinery(col, row)
  updateUI()
}

// ── UPGRADES ───────────────────────────────────────────────────────────────
function buyUpgrade(type) {
  if (state.upgrades[type] >= UPGRADE_MAX) { log('⭐ Nível máximo!'); return }
  const price = upgradePrice(type)
  if (state.money < price) { log(`❌ Sem saldo (precisa $${price})`); return }
  state.money -= price
  state.upgrades[type]++
  // apply speed/battery changes to existing drones
  state.drones.forEach(d => {
    d.speed      = 1 + state.upgrades.speed   * 0.15
    d.maxBattery = 100 + state.upgrades.battery * 20
    d.battery    = Math.min(d.battery, d.maxBattery)
  })
  log(`⬆️ ${type} → nível ${state.upgrades[type]}`)
  updateUI()
}

// ── GAME TICK ──────────────────────────────────────────────────────────────
function gameTick() {
  cropLoop()
  droneLoop()
  refineryProcessingLoop()
  productionLoop()
  weatherLoop()
  updateUI()
}

// ── EVENTS ─────────────────────────────────────────────────────────────────
function initEvents() {
  farmEl.addEventListener('mousedown', e => {
    state.mouseDown = true
    const tEl = e.target.closest('.tile')
    if (tEl) handleTileClick(+tEl.dataset.x, +tEl.dataset.y)
  })
  farmEl.addEventListener('mouseover', e => {
    if (!state.mouseDown) return
    const tEl = e.target.closest('.tile')
    if (tEl) handleTileClick(+tEl.dataset.x, +tEl.dataset.y)
  })
  document.addEventListener('mouseup', () => { state.mouseDown = false })

  // buy buttons wired via data-buy attribute
  document.querySelectorAll('[data-buy]').forEach(btn => {
    btn.addEventListener('click', () => buyDrone(btn.dataset.buy))
  })

  // charger / refinery
  const btnCharger  = document.getElementById('buyCharger')
  const btnRefinery = document.getElementById('placeRefinery')
  if (btnCharger)  btnCharger.addEventListener('click', buyCharger)
  if (btnRefinery) btnRefinery.addEventListener('click', buyRefinery)

  // upgrades
  if (btnUpgradeSpeed)   btnUpgradeSpeed.addEventListener('click',   () => buyUpgrade('speed'))
  if (btnUpgradeBattery) btnUpgradeBattery.addEventListener('click', () => buyUpgrade('battery'))
  if (btnUpgradeLuck)    btnUpgradeLuck.addEventListener('click',    () => buyUpgrade('luck'))

  // expand farm
  if (btnExpandFarm) btnExpandFarm.addEventListener('click', expandFarm)

  // route mode toggle
  const btnRoute = document.getElementById('routeMode')
  if (btnRoute) {
    btnRoute.addEventListener('click', () => {
      state.routeMode = !state.routeMode
      state.routeStep = 0
      state.routePendingDrone = null
      btnRoute.textContent = state.routeMode ? '🛣️ Cancelar rota' : '🛣️ Definir rota'
      log(state.routeMode ? '📍 Clique no drone, depois no destino.' : '❌ Modo rota cancelado')
    })
  }

  window.addEventListener('resize', resizeDrones)
}

// ── BOOT ───────────────────────────────────────────────────────────────────
function initGame() {
  seedStart()
  injectCropSelector()
  initEvents()

  // starter drones
  spawnDrone('planter')
  spawnDrone('water')
  spawnDrone('collector')
  spawnDrone('pesticide')

  log('🚜 Fazenda ligada!')
  log('Os drones já começaram a rodar')
  log('Monte uma refinaria usando as coordenadas da malha')
  updateUI()

  setInterval(gameTick, 200)
}

initGame()
