//#region CONSTANTS ------------------------------------------------------------------
const FPS = 1000 / 60;
const STATES = { MENU: 1, PLAY: 2, GAMEOVER: 3 }

//#endregion

//#region Game variables -------------------------------------------------------------
const scene = document.getElementById("scene");
const brush = getBrush();

let currentState = STATES.IDLE;

let secondsLeftOfTimer = 5;

// ------

const MENU = {
  currentIndex: 0,
  buttons: [
    { text: "Play", action: startPlay },
    { text: "High Scores", action: showHigScores }
  ]
}

// ------

const ship = {
  x: (scene.width * 0.5) - 25,
  y: scene.height - 30,
  width: 50,
  height: 20,
  velocityX: 0,
  velocityY: 0,
  maxVelocity: 3
}

// ------

const projectieWidth = 3;
const projectileHeight = 5;
const projectileSpeed = 2;
const projectileCooldown = 40;
let cooldown = 0;
let projectiles = [];

// ------

const NPC = {
  width: 50,
  height: 20,
  padding: 20,
  sx: 50,
  sy: 20,
  speed: 1,
  direction: 1,
  enteties: []
}

const npcPerRow = Math.floor((scene.width - NPC.height) / (NPC.width + NPC.height));

// ------

// Movment back and forth of NPC´s are govered by counting up to a level
const maxMovmentSteps = 50;
let movmentSteps = maxMovmentSteps;

// ------
// The following is a simple way of 
let controllKeys = {
  ArrowDown: false,
  ArrowUp: false,
  ArrowLeft: false,
  ArrowRight: false,
  " ": false, // space
}

window.addEventListener("keydown", function (e) {
  controllKeys[e.key] = true;
});

window.addEventListener("keyup", function (e) {
  controllKeys[e.key] = false;
})


//#endregion


//#region Game engine ----------------------------------------------------------------

function init() {
  drawNewGame();
  currentState = STATES.MENU;
  update();
}

function update(time) {

  if (currentState === STATES.MENU) {
    updateMenu(time);
  } else if (currentState === STATES.PLAY) {
    updateGame(time);
  } 

  draw();

  if(currentState === STATES.GAMEOVER){
    setTimeout(() => {requestAnimationFrame(update); timeCounter();}, 1000);
  } else {
    requestAnimationFrame(update);
  }
  
}

function draw() {
  clearScreen();

  if (currentState === STATES.MENU) {
    drawMenu();
  } else if (currentState === STATES.PLAY) {
    drawGameState();
  } else if (currentState === STATES.GAMEOVER){
    drawGameOver();
  }
}

init(); // Starts the game

//#endregion


//#region Game functions

function updateMenu(dt) {

  if (controllKeys[" "]) {
    MENU.buttons[MENU.currentIndex].action();
  }


  if (controllKeys.ArrowUp) {
    MENU.currentIndex--;
  } else if (controllKeys.ArrowDown) {
    MENU.currentIndex++;
  }

  MENU.currentIndex = clamp(MENU.currentIndex, 0, MENU.buttons.length - 1);


}

function drawMenu() {
  let sy = 100;
  for (let i = 0; i < MENU.buttons.length; i++) {


    let text = MENU.buttons[i].text;
    if (i == MENU.currentIndex) {
      text = `> ${text} <`
      brush.font = "bold 50px serif";
    } else {
      brush.font = "50px serif";
    }

    brush.textAlign = "center";
    brush.fillStyle = "rgba(170, 46, 81, 1)";
    brush.fillText(text, scene.width/2, sy);
    sy += 50;

  }
}

function drawNewGame(){
  ship.x = (scene.width * 0.5) - 25;
  ship.velocityX = 0;

  NPC.enteties = [];

  let x = NPC.sx;
  let y = NPC.sy;
  console.log(y);
  for (let i = 0; i < npcPerRow; i++) {
    NPC.enteties.push({ x, y, color: "#922783ff", active: true, width: NPC.width, height: NPC.height });
    x += NPC.width + NPC.padding;
  }

  NPC.speed = 1;
}

function updateGame(dt) {
  updateShip();
  updateProjectiles();
  updateInvaders();
  if (isGameOver()) {
    currentState = STATES.GAMEOVER;
  }
}

function updateInvaders() {

  let ty = 0;

  if (NPC.direction == 1 && movmentSteps >= maxMovmentSteps * 2) {
    movmentSteps = 0;
    NPC.direction *= -1
  } else if (NPC.direction == -1 && movmentSteps >= maxMovmentSteps * 2) {
    movmentSteps = 0;
    NPC.direction *= -1;
    ty += NPC.height;
  }

  let tx = NPC.speed * NPC.direction;

  for (let i = 0; i < npcPerRow; i++) {
    let invader = NPC.enteties[i];

    if (invader.active) {

      invader.x += tx;
      invader.y += ty;

      if (isShot(invader)) {
        invader.active = false;
      }

    }

  }

  movmentSteps++;

}

function isGameOver() {
  for (let invader of NPC.enteties) {
    if (invader.active) {
      if (invader.y+invader.height >= ship.y) {
        return true;
      }
    }
  }

  return false;
}

function drawGameOver(){
  brush.fillStyle = "white";
  brush.textAlign = "center";
  brush.font = "80px Times New Roman";
  brush.fillText("GAME OVER", scene.width/2, 200);

  brush.font = "30px Times New Roman";
  brush.fillText("Returning to main menu in: " + secondsLeftOfTimer + "s", scene.width/2, 240);
}

//function that counts the time
function timeCounter(){
  secondsLeftOfTimer --;
  //console.log(secondsLeftOfTimer);

  if (secondsLeftOfTimer <= 0){
    currentState = STATES.MENU;
    secondsLeftOfTimer = 5;
  }
}


function isShot(target) {

  for (let i = 0; i < projectiles.length; i++) {
    let projectile = projectiles[i];
    if (overlaps(target.x, target.y, target.width, target.height, projectile.x, projectile.y, projectile.width, projectile.height)) {
      projectile.active = false;
      return true;
    }
  }

  return false;
}

function updateShip() {
  if (controllKeys.ArrowLeft) {
    ship.velocityX--;
  } else if (controllKeys.ArrowRight) {
    ship.velocityX++;
  }

  ship.velocityX = clamp(ship.velocityX, ship.maxVelocity * -1, ship.maxVelocity);

  let tmpX = ship.x + ship.velocityX;
  tmpX = clamp(tmpX, 0, scene.width - ship.width);

  ship.x = tmpX;

  cooldown--;

  if (controllKeys[" "] && cooldown <= 0) {
    projectiles.push({ x: ship.x + ship.width * 0.5, y: ship.y, dir: -1, active: true, width: projectieWidth, height: projectileHeight });
    cooldown = projectileCooldown;
  }
}

function updateProjectiles() {
  let activeProjectiles = []
  for (let i = 0; i < projectiles.length; i++) {
    let projectile = projectiles[i]
    projectile.y += projectileSpeed * projectile.dir;
    if (projectile.y + projectileHeight > 0 && projectile.active) {
      activeProjectiles.push(projectile);
    }
  }
  projectiles = activeProjectiles;
}

function drawGameState() {

  brush.fillStyle = "#d4366bff";
  brush.fillRect(ship.x, ship.y, ship.width, ship.height);

  for (let projectile of projectiles) {
    if (projectile.active) {
      brush.fillStyle = "white";
      brush.fillRect(projectile.x, projectile.y, projectieWidth, projectileHeight);
    }
  }

  for (let i = 0; i < npcPerRow; i++) {
    let invader = NPC.enteties[i];
    if (invader.active) {
      brush.fillStyle = invader.color;
      brush.fillRect(invader.x, invader.y, NPC.width, NPC.height);
    }
  }
}

function startPlay() {
  currentState = STATES.PLAY;
  drawNewGame();
}

function showHigScores() {

}

//#endregion

//#region Utility functions ----------------------------------------------------------

function getBrush() {
  return scene.getContext("2d");
}

function clearScreen() {
  if (brush) {
    brush.clearRect(0, 0, scene.width, scene.height);
  }
}

function clamp(val, min, max) {
  return Math.min(Math.max(val, min), max)
}

function overlaps(x1, y1, w1, h1, x2, y2, w2, h2) {

  if (x1 + w1 < x2 || x2 + w2 < x1) {
    return false;
  }

  if (y1 + h1 < y2 || y2 + h2 < y1) {
    return false;
  }

  return true;
}
//#endregion
