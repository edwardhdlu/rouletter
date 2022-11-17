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
const seed =
  date.getUTCMonth() + "/" + date.getUTCDate() + "/" + date.getUTCFullYear();
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

const audioMapping = {
  refresh: ["coins2.wav", 0.3],
  drop: ["stones.wav", 1.0],
  shuffle: ["tambourine.wav", 0.04],
  undo: ["cancel.wav", 0.1],
};

// GAME STATE
let shopState = ["", "", "", "", "", "", ""];
let boardState = [];
let boardStateMultipliers = [];
let dragged = null;
let placed = null;
let draggedIndex = null;
let scoreValue = 0;
let bankBalance = 50;
let refreshCost = 3;

//
// FUNCTIONS
//

function playAudio(audioName) {
  let audioPath = "assets/" + audioMapping[audioName][0];
  let audio = new Audio(audioPath);
  audio.volume = audioMapping[audioName][1];
  audio.play();
}

function clearTileClasses() {
  const letterSquares = document.querySelectorAll(".letter-square");
  const classNames = ["part-of-word", "h", "v", "ha", "hb", "va", "vb", "hovered"];
  for (const square of letterSquares) {
    for (const name of classNames) {
      square.classList.remove(name);
    }
  }
}

function evaluateString(curString, i, j, readHorizontal) {
  if (enableSet.has(curString.toLowerCase())) {
    let score = 0;

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

      // evaluate current word score
      let letterMultiplier = 1;
      let multiplierState = readHorizontal
        ? boardStateMultipliers[i][j - 1 - k]
        : boardStateMultipliers[j - 1 - k][i];
      if (multiplierState == 1) {
        letterMultiplier = 2;
      } else if (multiplierState == 2) {
        letterMultiplier = 3;
      }
      score +=
        letterMultiplier *
        letterPointsDistribution[curString[curString.length - k - 1]][0];
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

function getShopLetterSquareElements() {
  return document.querySelectorAll(".shop .letter-square");
}

function refreshShop() {
  if (getShopCount() == 0 || bankBalance >= refreshCost) {
    if (getShopCount() > 0) {
      bankBalance -= refreshCost;
    }

    removeSquaresFromShop();

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
    updateShop();
    updateDisplays();
    setButtonValid("undo", false);
  }
}

function dragStart(e) {
  dragged = e.target;
  draggedIndex = dragged.parentNode.id.split("-")[1];
  dragged.classList.add("invisible");
}

function dragEnd(e) {
  dragged.classList.remove("invisible");
  // dragged = null;
}

function dragOver(e) {
  e.preventDefault();
}

function dragEnter(e) {
  e.preventDefault();
  if (e.target.classList.contains("grid-square")) {
    e.target.classList.add("hovered");
  } else if (e.target.classList.contains("letter-square") && e.target.firstChild.innerHTML == dragged.firstChild.innerHTML) {
    e.target.classList.add("hovered");
  }
}

function dragLeave(e) {
  e.preventDefault();
  e.target.classList.remove("hovered");
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
  if (bankBalance < refreshCost) {
    setButtonValid("refresh", false);
  }

  if (bankBalance <= 0) {
    setButtonValid("shuffle", false);

    const letterSquares = getShopLetterSquareElements();
    for (const square of letterSquares) {
      square.classList.add("invisible");
      square.draggable = false;
    }
  }
}

function isValidLevelUpTarget(e) {
  let gridSquare = null;
  if (e.target.classList.contains("letter-square")) {
    gridSquare = e.target.parentNode;
  } else if (
    e.target.classList.contains("letter") ||
    e.target.classList.contains("letter-score")
  ) {
    gridSquare = e.target.parentNode.parentNode;
  }

  if (gridSquare != null) {
    let coords = gridSquare.id.split("-");
    let i = coords[1];
    let j = coords[2];
    

    let curLetter = dragged.firstChild.innerHTML;
    if (curLetter == boardState[i][j]) {
      if (boardStateMultipliers[i][j] <= 1) {
        boardStateMultipliers[i][j] += 1;
        const square = document.querySelector("#grid-" + i + "-" + j);
        square.firstChild.classList.add("level-" + boardStateMultipliers[i][j]);
        dragged.parentNode.removeChild(dragged);
        placed = [dragged, i, j];

        return true;
      }
    }
  }
  return false;
}

function isValidGridTarget(e) {
  if (e.target.classList.contains("grid-square")) {
    dragged.parentNode.removeChild(dragged);
    e.target.appendChild(dragged);

    let coords = e.target.id.split("-");
    let i = coords[1];
    let j = coords[2];
    boardState[i][j] = dragged.firstChild.innerHTML;
    placed = [dragged, i, j];

    return true;
  }
  return false;
}

function drop(e) {
  if (bankBalance >= 1 && (isValidGridTarget(e) || isValidLevelUpTarget(e))) {
    playAudio("drop");
    bankBalance -= 1;
    dragged.draggable = false;
    dragged.addEventListener("dragenter", dragEnter);
    dragged.addEventListener("dragleave", dragLeave);
    e.target.classList.remove("hovered");
    shopState[draggedIndex] = "";

    clearTileClasses();
    const hScore = evaluateBoardInDirection(true);
    const vScore = evaluateBoardInDirection(false);
    scoreValue = hScore + vScore;
    updateDisplays();

    setButtonValid("undo", true);
    closeShopIfBroke();
    if (getShopCount() == 0 && bankBalance > 0) {
      setButtonValid("refresh", true);
    }
  }
}

function refreshButtonHandler(e) {
  playAudio("refresh");
  refreshShop();
  closeShopIfBroke();
}

function shuffleButtonHandler(e) {
  playAudio("shuffle");
  shopState = shopState
    .map((value) => ({ value, sort: Math.random() }))
    .sort((a, b) => a.sort - b.sort)
    .map(({ value }) => value);

  removeSquaresFromShop();
  updateShop();
}

function undoButtonHandler(e) {
  playAudio("undo");

  // update board
  let i = placed[1];
  let j = placed[2];
  if (boardStateMultipliers[i][j] > 0) {
    const square = document.querySelector("#grid-" + i + "-" + j);
    square.firstChild.classList.remove("level-" + boardStateMultipliers[i][j]);
    boardStateMultipliers[i][j]--;
  } else {
    boardState[i][j] = "";
    placed[0].parentNode.removeChild(placed[0]);
  }
  bankBalance += 1;
  placed[0].draggable = true;

  clearTileClasses();
  const hScore = evaluateBoardInDirection(true);
  const vScore = evaluateBoardInDirection(false);
  scoreValue = hScore + vScore;
  updateDisplays();

  // update shop
  shopState[shopState.indexOf("")] = placed[0].firstChild.innerHTML;
  removeSquaresFromShop();
  updateShop();

  // update buttons
  if (bankBalance >= refreshCost) {
    setButtonValid("refresh", true);
  } else {
    setButtonValid("refresh", false);
  }
  if (bankBalance == 1) {
    setButtonValid("shuffle", true);
  }
  setButtonValid("undo", false);

}

function setButtonValid(buttonName, isValid) {
  let buttonClass = "";
  let buttonHandler = null;
  if (buttonName == "refresh") {
    buttonClass = ".refresh-button";
    buttonHandler = refreshButtonHandler;
  } else if (buttonName == "shuffle") {
    buttonClass = ".shuffle-button";
    buttonHandler = shuffleButtonHandler;
  } else if (buttonName == "undo") {
    buttonClass = ".undo-button";
    buttonHandler = undoButtonHandler;
  }

  const button = document.querySelector(buttonClass);
  if (isValid) {
    button.addEventListener("click", buttonHandler);
    button.classList.remove("invisible");
  } else {
    button.removeEventListener("click", buttonHandler);
    button.classList.add("invisible");
  }
}


function removeSquaresFromShop() {
  const letterSquares = getShopLetterSquareElements();
  for (const square of letterSquares) {
    square.parentNode.removeChild(square);
  }
}

function initializeGrid() {
  const grid = document.querySelector(".grid");
  for (let i = 0; i < gridSize; i++) {
    let row = [];
    let mRow = [];
    for (let j = 0; j < gridSize; j++) {
      row.push("");
      mRow.push(0);
      const square = document.createElement("div");
      square.classList.add(...["square", "grid-square"]);
      square.id = "grid-" + i + "-" + j;

      grid.appendChild(square);
    }
    boardState.push(row);
    boardStateMultipliers.push(mRow);
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

  refreshShop();
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
    square.addEventListener('dragleave', dragLeave);
    square.addEventListener("drop", drop);
  }

  setButtonValid("refresh", true);
  setButtonValid("shuffle", true);
  setButtonValid("undo", false);
}

initializeGrid();
initializeShop();
initializeStaticHandlers();
