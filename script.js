const grid = document.getElementById("grid");

const state = {

  money:100,
  food:0,

  drones:{
    planter:0,
    water:0,
    pesticide:0,
    collector:0
  },

  tiles:[]
};

const prices = {
  planter:50,
  water:75,
  pesticide:120,
  collector:100
};

function updateUI(){

  document.getElementById("money").innerText = state.money;
  document.getElementById("food").innerText = state.food;

  document.getElementById("planterCount").innerText = state.drones.planter;
  document.getElementById("waterCount").innerText = state.drones.water;
  document.getElementById("pesticideCount").innerText = state.drones.pesticide;
  document.getElementById("collectorCount").innerText = state.drones.collector;

  const total =
    state.drones.planter +
    state.drones.water +
    state.drones.pesticide +
    state.drones.collector;

  const efficiency = Math.min(100, total * 8);

  document.getElementById("efficiency").innerText =
    efficiency + "%";
}

function log(text){

  const logBox = document.getElementById("log");

  const line = document.createElement("div");

  line.innerText = "> " + text;

  logBox.prepend(line);

  while(logBox.children.length > 20){
    logBox.removeChild(logBox.lastChild);
  }
}

function buyDrone(type){

  if(state.money < prices[type]){
    log("Dinheiro insuficiente.");
    return;
  }

  state.money -= prices[type];

  state.drones[type]++;

  log("Novo drone comprado.");

  updateUI();
}

function createGrid(){

  for(let i = 0; i < 48; i++){

    const tile = document.createElement("div");

    tile.classList.add("tile");

    const data = {

      planted:false,
      growth:0,
      protected:false,

      element:tile
    };

    state.tiles.push(data);

    grid.appendChild(tile);
  }
}

function gameLoop(){

  state.tiles.forEach(tile => {

    if(!tile.planted){

      if(Math.random() < 0.03 * state.drones.planter){

        tile.planted = true;
        tile.growth = 1;

        tile.element.classList.add("planted");
        tile.element.setAttribute("data-icon", "🌱");
      }
    }

    else{

      let speed = 0.2;

      if(state.drones.water > 0){

        speed += state.drones.water * 0.25;

        tile.element.setAttribute("data-icon", "💧");
      }

      tile.growth += speed;

      if(state.drones.pesticide > 0){

        tile.protected = true;

        tile.element.setAttribute("data-icon", "☠️");
      }

      if(!tile.protected && Math.random() < 0.002){

        tile.planted = false;
        tile.growth = 0;

        tile.element.classList.remove("planted");
        tile.element.classList.remove("grown");

        tile.element.setAttribute("data-icon", "");

        log("Uma plantação morreu.");
      }

      if(tile.growth >= 100){

        tile.element.classList.add("grown");

        if(state.drones.collector > 0){

          state.food += 10;
          state.money += 15;

          tile.planted = false;
          tile.growth = 0;

          tile.element.classList.remove("planted");
          tile.element.classList.remove("grown");

          tile.element.setAttribute("data-icon", "📦");

          log("Colheita realizada.");
        }
      }
    }

  });

  updateUI();
}

createGrid();
updateUI();

setInterval(gameLoop, 120);
