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
const randomSeed = "seed123";
const rng = new Math.seedrandom();

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

// GAME STATE
let shopState = ["A", "E", "I", "O", "U"];
let boardState = [];
let dragged = null;
let draggedIndex = null;
let scoreValue = 0;
let bankBalance = 50;
let refreshCost = 4;

//
// FUNCTIONS
//

function clearTileClasses() {
  const letterSquares = document.querySelectorAll(".grid .letter-square");
  for (const square of letterSquares) {
    square.classList.remove("part-of-word");
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
    i += 1;
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

    for (let i = 0; i < shopSize; i++) {
      shopState[i] = sampleLetter();
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
    }
  }
}

function drop(e) {
  if (e.target.classList.contains("grid-square") && bankBalance >= 1) {
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
