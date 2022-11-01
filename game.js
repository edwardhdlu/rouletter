"use strict";

//
// GAME CONSTANTS
//

const gridSize = 7;
const shopSize = 7;
const letterPointsDistribution = {
  A: [1, 9],
  B: [3, 2],
  C: [3, 2],
  D: [2, 4],
  E: [1, 12],
  F: [4, 2],
  G: [2, 3],
  H: [4, 2],
  I: [1, 9],
  J: [8, 1],
  K: [5, 1],
  L: [1, 4],
  M: [3, 2],
  N: [1, 6],
  O: [1, 8],
  P: [3, 2],
  Q: [10, 1],
  R: [1, 6],
  S: [1, 4],
  T: [1, 6],
  U: [1, 4],
  V: [4, 2],
  W: [4, 2],
  X: [8, 1],
  Y: [4, 2],
  Z: [10, 1],
};
const date = new Date();
const seed = date.getUTCMonth() + "/" + date.getUTCDate() + "/" + date.getUTCFullYear();
const rng = new Math.seedrandom(seed);

function getRangeMapping() {
  let rangeMapping = [];
  let x = 0;
  for (const [letter, value] of Object.entries(letterPointsDistribution)) {
    x += value[1];
    rangeMapping.push(x);
  }

  return rangeMapping;
}
const rangeMapping = getRangeMapping();

const coinAudio = new Audio("assets/coins2.wav");
const stonesAudio = new Audio("assets/stones.wav");

// GAME STATE
let shopState = ["A", "E", "I", "O", "U"];
let boardState = [];
let boardStateMultipliers = [];
let dragged = null;
let draggedIndex = null;
let scoreValue = 0;
let bankBalance = 50;
let refreshCost = 3;

//
// FUNCTIONS
//

function clearTileClasses() {
  const letterSquares = document.querySelectorAll(".grid .letter-square");
  const classNames = ["part-of-word", "h", "v", "ha", "hb", "va", "vb"];
  for (const square of letterSquares) {
    for (const name of classNames) {
      square.classList.remove(name);
    }
  }
}

function evaluateString(curString, i, j, readHorizontal) {
  if (enableSet.has(curString.toLowerCase())) {
    // update style for part of word letters
    for (let k = 0; k < curString.length; k++) {
      const tileName = readHorizontal
        ? "#grid-" + i + "-" + (j - 1 - k)
        : "#grid-" + (j - 1 - k) + "-" + i;
      const tile = document.querySelector(tileName);
      tile.firstChild.classList.add("part-of-word");

      let squareClass = readHorizontal ? "h" : "v";
      tile.firstChild.classList.add(squareClass);

      if (k == curString.length - 1) { 
        squareClass += "a";
        tile.firstChild.classList.add(squareClass);
      } else if (k == 0) {
        squareClass += "b";
        tile.firstChild.classList.add(squareClass);
      }
    }

    // evaluate current word score
    let score = 0;
    for (const letter of curString) {
      score += letterPointsDistribution[letter][0];
    }
    return score;
  }
  return 0;
}

function evaluateBoardInDirection(readHorizontal) {
  let score = 0;
  for (let i = 0; i < gridSize; i++) {
    let curString = "";

    for (let j = 0; j < gridSize; j++) {
      const curSquare = readHorizontal ? boardState[i][j] : boardState[j][i];

      if (curSquare != "") {
        curString += curSquare;
      } else {
        score += evaluateString(curString, i, j, readHorizontal);
        curString = "";
      }
    }
    score += evaluateString(curString, i, gridSize, readHorizontal);
  }
  return score;
}

function sampleLetter() {
  let x = Math.floor(rng() * rangeMapping[25] + 1);
  let i = 0;
  while (x > rangeMapping[i]) {
    i++;
  }
  return Object.keys(letterPointsDistribution)[i];
}

function updateDisplays() {
  const bankDisplay = document.querySelector("#bank-value");
  bankDisplay.innerHTML = bankBalance;

  const scoreDisplay = document.querySelector("#score-value");
  scoreDisplay.innerHTML = scoreValue;
}

function updateGameState(i, j) {
  shopState[draggedIndex] = "";
  boardState[i][j] = dragged.firstChild.innerHTML;

  clearTileClasses();
  const hScore = evaluateBoardInDirection(true);
  const vScore = evaluateBoardInDirection(false);
  scoreValue = hScore + vScore;

  updateDisplays();
}

function refreshShop(isFree) {
  if (isFree || bankBalance >= refreshCost) {
    if (!isFree) {
      bankBalance -= refreshCost;
    }
    const letterSquares = document.querySelectorAll(".shop .letter-square");
    for (const square of letterSquares) {
      square.parentNode.removeChild(square);
    }

    let seen = {};
    for (let i = 0; i < shopSize; i++) {
      let l = sampleLetter();
      if (!(l in seen)) {
        seen[l] = 0;
      }

      // enforce at most two of the same letter
      // enforce min/max number of vowels?
      if (seen[l] >= 2) {
        i--;
      } else {
        shopState[i] = l;
        seen[l]++;
      }
    }
    updateShop(shopState);
    updateDisplays();
  }
}

function dragStart(e) {
  dragged = e.target;
  draggedIndex = dragged.parentNode.id.split("-")[1];
  dragged.classList.add("invisible");
}

function dragEnd(e) {
  dragged.classList.remove("invisible");
  dragged = null;
}

function dragOver(e) {
  e.preventDefault();
}

function dragEnter(e) {
  e.preventDefault();
}

function getShopCount() {
  let count = shopSize;
  for (let i = 0; i < shopSize; i++) {
    if (shopState[i] == "") {
      count -= 1;
    }
  }
  return count;
}

function closeShopIfBroke() {
  if (bankBalance <= refreshCost) {
    const refreshButton = document.querySelector(".refresh");
    refreshButton.removeEventListener("click", click);
    refreshButton.classList.add("invisible");
  }

  if (bankBalance <= 0) {
    const letterSquares = document.querySelectorAll(".shop .letter-square");
    for (const square of letterSquares) {
      square.classList.add("invisible");
      square.draggable = false;
    }
  }
}

function drop(e) {
  if (e.target.classList.contains("grid-square") && bankBalance >= 1) {
    stonesAudio.play();

    bankBalance -= 1;
    dragged.parentNode.removeChild(dragged);
    e.target.appendChild(dragged);
    dragged.draggable = false;

    let coords = e.target.id.split("-");
    updateGameState(coords[1], coords[2]);

    if (getShopCount() == 0) {
      refreshShop(true);
    }
    closeShopIfBroke();
  }
}

function click(e) {
  coinAudio.play();

  refreshShop();
  closeShopIfBroke();
}

function initializeGrid() {
  const grid = document.querySelector(".grid");
  for (let i = 0; i < gridSize; i++) {
    let row = [];
    for (let j = 0; j < gridSize; j++) {
      row.push("");

      const square = document.createElement("div");
      square.classList.add(...["square", "grid-square"]);
      square.id = "grid-" + i + "-" + j;

      grid.appendChild(square);
    }
    boardState.push(row);
  }
}

function initializeLetterHandlers() {
  const letterSquares = document.querySelectorAll(".letter-square");
  for (const square of letterSquares) {
    square.addEventListener("dragstart", dragStart);
    square.addEventListener("dragend", dragEnd);
  }
}

function initializeShop() {
  const shop = document.querySelector(".shop");
  for (let i = 0; i < shopSize; i++) {
    const square = document.createElement("div");
    square.classList.add(...["square", "shop-square"]);
    square.id = "shop-" + i;

    shop.appendChild(square);
  }

  refreshShop(true);
  // updateShop();
  updateDisplays();
}

function updateShop() {
  const shopSquares = document.querySelectorAll(".shop-square");
  for (let i = 0; i < shopSize; i++) {
    if (shopState[i] != "") {
      const letter = document.createElement("div");
      letter.classList.add(...["square", "letter-square"]);
      letter.draggable = true;

      const span = document.createElement("span");
      span.classList.add("letter");
      span.innerHTML = shopState[i];

      const letterScore = document.createElement("span");
      letterScore.classList.add("letter-score");
      letterScore.innerHTML = letterPointsDistribution[shopState[i]][0];

      letter.appendChild(span);
      letter.appendChild(letterScore);
      shopSquares[i].appendChild(letter);
    }
  }

  initializeLetterHandlers();
}

function initializeStaticHandlers() {
  const gridSquares = document.querySelectorAll(".grid-square");
  for (const square of gridSquares) {
    square.addEventListener("dragover", dragOver);
    square.addEventListener("dragenter", dragEnter);
    // square.addEventListener('dragleave', dragLeave);
    square.addEventListener("drop", drop);
  }

  const refreshButton = document.querySelector(".refresh");
  refreshButton.addEventListener("click", click);
}

initializeGrid();
initializeShop();
initializeStaticHandlers();
