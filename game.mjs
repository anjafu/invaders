//#region CONSTANTS ------------------------------------------------------------------
const FPS = 1000 / 60;
const STATES = { MENU: 1, PLAY: 2, GAMEOVER: 3, HIGHSCORE: 4}

//#endregion

//#region Game variables -------------------------------------------------------------
const scene = document.getElementById("scene");
const brush = getBrush();

const RIGHT_BORDER = scene.width;
const BOTTOM_BORDER = scene.height;
const CENTER = RIGHT_BORDER / 2;

let currentState = STATES.MENU;

let countDownTimer = 5;

let currentMenuCooldown = 10;
let menuCooldown = 0;

let currentScore = 0;
let highScore = 0;

// ------

const MENU = {
  currentIndex: 0,
  buttons: [
    { text: "Play", action: startPlay },
    { text: "High Scores", action: showHighScores }
  ]
}

// ------

const ship = {
  y: BOTTOM_BORDER - 30,
  sx: CENTER - 25, //25 = width/2 to make ship spawn in middle of scene
  x: CENTER - 25,
  width: 50,
  height: 20,
  velocityX: 0,
  velocityY: 0,
  maxVelocity: 3
}

// ------

const projectile = {
  width: 3,
  height: 5,
  speed: 2,
  coolDown: 40,
  bullets: []
}

let cooldown = 0;

// ------

const NPC = {
  width: 50,
  height: 20,
  padding: 20,
  sx: 50,
  sy: 40,
  speed: 1,
  direction: 1,
  colors: ["#290324ff", "#54174cff", "#972387ff", "#d038bcff"],
  pointValues: [40,30,20,10],
  entities: []
}

// ------

// Movement back and forth of NPC´s are govered by counting up to a level
const maxMovementSteps = 50;
let movementSteps = maxMovementSteps;

// ------
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
});


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
  } else if (currentState === STATES.HIGHSCORE){
    checkHighscoreMenu();
  }

  draw();

  //deciding how fast to update the program
  if(currentState === STATES.GAMEOVER){
    //only updates the game every second -> makes it possible to create a countdown timer
    setTimeout(() => {requestAnimationFrame(update); updateCountDownTimer();}, 1000);
  } else {
    requestAnimationFrame(update);
  }
}

function draw() {
  clearScreen();

   switch(currentState){
    case STATES.MENU:
      drawMenu();
      break;
    case STATES.PLAY:
      drawGameState();
      break;
    case STATES.GAMEOVER:
      drawGameOver();
      break;
    case STATES.HIGHSCORE:
      drawHighScore();
      break;
  }

}

init(); // Starts the game

//#endregion


//#region Game functions

function updateMenu(dt) {
  menuCooldown --;

  //puts timer on button so you cant spam it (causing you to go back and forward without control, if next
  //state has a button as well)
  if (controllKeys[" "] && menuCooldown <= 0) {
    menuCooldown = currentMenuCooldown;
    MENU.buttons[MENU.currentIndex].action();
  }


  if (controllKeys.ArrowUp) {
    MENU.currentIndex--;
  } else if (controllKeys.ArrowDown) {
    MENU.currentIndex++;
  }

  MENU.currentIndex = clamp(MENU.currentIndex, 0, MENU.buttons.length - 1);
}

function updateGame(dt) {
  updateShip();
  updateProjectiles();
  updateInvaders();

  if(allInvadersInactive()){
    drawNewGame();
  }

  if (isGameOver()) {
    currentState = STATES.GAMEOVER;
    checkHighscore();
  }
}

function checkHighscoreMenu() {
  menuCooldown--;

  if (controllKeys[" "] && menuCooldown <= 0) {
    menuCooldown = currentMenuCooldown;
    currentState = STATES.MENU;
  }
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
    brush.fillText(text, CENTER, sy);
    sy += 50;

  }
}


function drawNewGame(){
  //recentering the ship in case new game/new wave
  ship.x = ship.sx;
  ship.velocityX = 0;

  //emptying the projectiles in case new wave in middle of game so invaders cant spawn inactive
  projectile.bullets = [];

  drawNewWave();
}

function drawHighScore(){
  brush.textAlign = "center";
  brush.fillStyle = "rgba(170, 46, 81, 1)";

  brush.font = "bold 50px serif";
  brush.fillText("CURRENT", CENTER, 100);
  brush.fillText("HIGHSCORE:", CENTER, 100 + 50 + 10);

  brush.font = "50px serif";
  brush.fillText(highScore + " points", CENTER, 150 + 50 + 20);

  brush.font = "bold 30px serif";
  brush.fillText("> Return to main menu <", CENTER, BOTTOM_BORDER - 50);
}

function drawGameOver(){
  brush.fillStyle = "rgba(170, 46, 81, 1)";
  brush.textAlign = "center";
  brush.font = "80px serif";
  brush.fillText("GAME OVER", CENTER, 200);

  brush.font = "30px serif";
  brush.fillText("Your score: " + currentScore, CENTER, 250);
  brush.fillText("Current highscore: " + highScore, CENTER, 280);
  brush.fillText("Returning to main menu in: " + countDownTimer + "s", CENTER, 340);
}

function drawNewWave(){
  movementSteps = maxMovementSteps; 

  //removing all invaders in case game over -> resets the wave completely
  NPC.entities = [];

  let x = NPC.sx;
  let y = NPC.sy;

  const npcPerRow = Math.floor((RIGHT_BORDER - NPC.height) / (NPC.width + NPC.height));

  //adding the invaders to the NPC entities list 
  for (let j = 0; j < NPC.colors.length; j++) {
    //each row of invader has unique color and values
    let entitiyColor = NPC.colors[j];
    let npcValue = NPC.pointValues[j]; 

    for (let i = 0; i < npcPerRow; i++) {
      NPC.entities.push({ x, y, color: entitiyColor, active: true, width: NPC.width, height: NPC.height, value: npcValue});
      x += NPC.width + NPC.padding;
    }

    x = NPC.sx;
    y += NPC.padding * 1.5; //adds vertical spacing
  }

  NPC.speed = 1;
}

function updateInvaders() {

  let ty = 0;

  if (NPC.direction == 1 && movementSteps >= maxMovementSteps * 2) {
    movementSteps = 0;
    NPC.direction *= -1
  } else if (NPC.direction == -1 && movementSteps >= maxMovementSteps * 2) {
    movementSteps = 0;
    NPC.direction *= -1;
    ty += NPC.height;
  }

  let tx = NPC.speed * NPC.direction;

  for (let i = 0; i < NPC.entities.length; i++) {
    let invader = NPC.entities[i];

    if (invader.active) {

      invader.x += tx;
      invader.y += ty;

      if (isShot(invader)) {
        invader.active = false;
        currentScore += invader.value;
      }

    }

  }

  movementSteps++;
}

//checks if game is over
function isGameOver() {
  for (let invader of NPC.entities) {
    if (invader.active) {
      //game over if active invader reaches ships level
      if (invader.y+invader.height >= ship.y) {
        return true;
      }
    }
  }

  return false;
}

//checks highscore and if it need to be updated
function checkHighscore(){
  if (currentScore > highScore) {
          highScore = currentScore;
    }
}

//checks if all invaders are inactive or not
function allInvadersInactive(){
  for (let invader of NPC.entities) {
    if (invader.active) {
      return false;
    }
  }

  return true;
}


function isShot(target) {

  for (let i = 0; i < projectile.bullets.length; i++) {
    let bullet = projectile.bullets[i];
    if (overlaps(target.x, target.y, target.width, target.height, bullet.x, bullet.y, bullet.width, bullet.height)) {
      bullet.active = false;
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
  tmpX = clamp(tmpX, 0, RIGHT_BORDER - ship.width);

  ship.x = tmpX;

  cooldown--;

  if (controllKeys[" "] && cooldown <= 0) {
    projectile.bullets.push({ x: ship.x + ship.width * 0.5, y: ship.y, dir: -1, active: true, width: projectile.width, height: projectile.height, speed: projectile.speed});
    cooldown = projectile.coolDown;
  }
}

function updateProjectiles() {
  let activeProjectiles = [];
  for (let i = 0; i < projectile.bullets.length; i++) {
    let bullet = projectile.bullets[i];
    bullet.y += bullet.speed * bullet.dir;
    if (bullet.y + bullet.height > 0 && bullet.active) {
      activeProjectiles.push(bullet);
    }
  }
  projectile.bullets = activeProjectiles;
}

function drawGameState() {
  brush.fillStyle = "rgba(170, 46, 81, 1)";
  brush.font = "20px serif";
  brush.textAlign = "left";
  brush.fillText("Score: " + currentScore, 10, 30);

  brush.textAlign = "right";
  brush.fillText("Current highscore: " + highScore, RIGHT_BORDER - 10, 30);


  brush.fillStyle = "#d4366bff";
  brush.fillRect(ship.x, ship.y, ship.width, ship.height);

  for (let bullet of projectile.bullets) {
    if (bullet.active) {
      brush.fillStyle = "white";
      brush.fillRect(bullet.x, bullet.y, bullet.width, bullet.height);
    }
  }

  for (let i = 0; i < NPC.entities.length; i++) {
    let invader = NPC.entities[i];
    if (invader.active) {
      brush.fillStyle = invader.color;
      brush.fillRect(invader.x, invader.y, NPC.width, NPC.height);
    }
  }
}

function startPlay() {
  currentState = STATES.PLAY;
  currentScore = 0;
  drawNewGame();
}

function showHighScores() {
  currentState = STATES.HIGHSCORE;
}

//#endregion

//#region Utility functions ----------------------------------------------------------

function getBrush() {
  return scene.getContext("2d");
}

function clearScreen() {
  if (brush) {
    brush.clearRect(0, 0, RIGHT_BORDER, BOTTOM_BORDER);
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

//function that counts the time
function updateCountDownTimer(){
  countDownTimer --;

  if (countDownTimer <= 0){
    currentState = STATES.MENU;
    //resets the countdown timer for next time
    countDownTimer = 5;
  }
}
//#endregion
