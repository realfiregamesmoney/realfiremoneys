// Elementos
const boardPlayerEl = document.getElementById('board-player');
const boardEnemyEl = document.getElementById('board-enemy');
const rotateBtn = document.getElementById('rotate-btn');
const startBtn = document.getElementById('start-btn');
const statusMsg = document.getElementById('status-msg');
const score1El = document.getElementById('score1');
const score2El = document.getElementById('score2');
const turnIndicator = document.getElementById('turn-indicator');
const p1El = document.querySelector('.player.p1');
const p2El = document.querySelector('.player.p2');

// Áudio
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
function playSound(type) {
    if (audioCtx.state === 'suspended') audioCtx.resume();
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    const now = audioCtx.currentTime;

    if (type === 'hit') {
        osc.type = 'square';
        osc.frequency.setValueAtTime(100, now);
        osc.frequency.exponentialRampToValueAtTime(50, now + 0.3);
        gain.gain.setValueAtTime(0.1, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
        osc.start(now);
        osc.stop(now + 0.3);
    } else if (type === 'miss') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(300, now);
        osc.frequency.exponentialRampToValueAtTime(100, now + 0.2);
        gain.gain.setValueAtTime(0.1, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
        osc.start(now);
        osc.stop(now + 0.2);
    } else if (type === 'place') {
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(400, now);
        osc.frequency.exponentialRampToValueAtTime(200, now + 0.1);
        gain.gain.setValueAtTime(0.05, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
        osc.start(now);
        osc.stop(now + 0.1);
    }
}

// Configurações do Jogo
const SIZE = 10;
const SHIPS = [
    { name: 'Porta-Aviões', size: 5 },
    { name: 'Encouraçado', size: 4 },
    { name: 'Cruzador', size: 3 },
    { name: 'Submarino', size: 3 },
    { name: 'Contratorpedeiro', size: 2 }
];

// O estado de cada célula: 0 = água, 1 = navio, 2 = miss, 3 = hit
let playerBoard = Array(SIZE).fill(null).map(() => Array(SIZE).fill(0));
let enemyBoard = Array(SIZE).fill(null).map(() => Array(SIZE).fill(0));

// Fases: 'setup', 'playerTurn', 'enemyTurn', 'gameOver'
let phase = 'setup';
let currentShipIndex = 0;
let isHorizontal = true; // true = X, false = Y

let playerShipsAlive = 5;
let enemyShipsAlive = 5;

// Estruturas invisíveis para checar quando afunda um navio inteiro
let playerShipData = [];
let enemyShipData = [];

function init() {
    createBoardDOM(boardPlayerEl, true);
    createBoardDOM(boardEnemyEl, false);

    // Adversario places ships randomly
    // placeBotShips();

    updateStatus();
}

function createBoardDOM(container, isPlayer) {
    container.innerHTML = '';
    for (let r = 0; r < SIZE; r++) {
        for (let c = 0; c < SIZE; c++) {
            const cell = document.createElement('div');
            cell.className = 'cell';
            cell.dataset.r = r;
            cell.dataset.c = c;

            if (isPlayer) {
                cell.addEventListener('mouseover', () => handleHover(r, c));
                cell.addEventListener('click', () => placePlayerShip(r, c));
            } else {
                cell.addEventListener('click', () => attackEnemy(r, c));
            }

            container.appendChild(cell);
        }
    }
}

// Fase SETUP (Posicionamento)
rotateBtn.onclick = () => {
    if (phase !== 'setup') return;
    isHorizontal = !isHorizontal;
    rotateBtn.innerText = isHorizontal ? 'Girar Navio (Horizontal)' : 'Girar Navio (Vertical)';
};

function handleHover(r, c) {
    if (phase !== 'setup') return;
    const cells = boardPlayerEl.querySelectorAll('.cell');
    cells.forEach(el => { el.classList.remove('hover-ship', 'hover-error'); });

    const shipSize = SHIPS[currentShipIndex].size;
    const valid = canPlaceShip(playerBoard, r, c, shipSize, isHorizontal);

    for (let i = 0; i < shipSize; i++) {
        let nr = isHorizontal ? r : r + i;
        let nc = isHorizontal ? c + i : c;
        if (nr < SIZE && nc < SIZE) {
            const idx = nr * SIZE + nc;
            cells[idx].classList.add(valid ? 'hover-ship' : 'hover-error');
        }
    }
}

function canPlaceShip(boardArray, r, c, size, horizontal) {
    for (let i = 0; i < size; i++) {
        let nr = horizontal ? r : r + i;
        let nc = horizontal ? c + i : c;
        if (nr >= SIZE || nc >= SIZE || boardArray[nr][nc] !== 0) return false;
    }
    return true;
}

function placePlayerShip(r, c) {
    if (phase !== 'setup') return;
    const ship = SHIPS[currentShipIndex];

    if (canPlaceShip(playerBoard, r, c, ship.size, isHorizontal)) {
        playSound('place');
        let positions = [];
        for (let i = 0; i < ship.size; i++) {
            let nr = isHorizontal ? r : r + i;
            let nc = isHorizontal ? c + i : c;
            playerBoard[nr][nc] = 1;
            positions.push({ r: nr, c: nc });

            const idx = nr * SIZE + nc;
            boardPlayerEl.children[idx].classList.add('ship');
        }
        playerShipData.push({ name: ship.name, positions, hits: 0 });

        currentShipIndex++;
        if (currentShipIndex >= SHIPS.length) {
            phase = 'waiting-start';
            statusMsg.innerText = "FROTA POSICIONADA! INICIE A GUERRA.";
            rotateBtn.style.display = 'none';
            startBtn.style.display = 'inline-block';
            const cells = boardPlayerEl.querySelectorAll('.cell');
            cells.forEach(el => el.classList.remove('hover-ship', 'hover-error'));
        } else {
            statusMsg.innerText = `Posicione seu ${SHIPS[currentShipIndex].name} (${SHIPS[currentShipIndex].size} espaços)`;
        }
    } else {
        playSound('miss'); // errozinho
    }
}

function placeBotShips() {
    SHIPS.forEach(ship => {
        let placed = false;
        let positions = [];
        while (!placed) {
            let r = Math.floor(Math.random() * SIZE);
            let c = Math.floor(Math.random() * SIZE);
            let horiz = Math.random() > 0.5;

            if (canPlaceShip(enemyBoard, r, c, ship.size, horiz)) {
                for (let i = 0; i < ship.size; i++) {
                    let nr = horiz ? r : r + i;
                    let nc = horiz ? c + i : c;
                    enemyBoard[nr][nc] = 1;
                    positions.push({ r: nr, c: nc });
                }
                enemyShipData.push({ name: ship.name, positions, hits: 0 });
                placed = true;
            }
        }
    });
}

// Fase BATALHA
startBtn.onclick = () => {
    phase = 'playerTurn';
    startBtn.style.display = 'none';
    boardEnemyEl.classList.remove('disabled');
    boardPlayerEl.classList.add('disabled');
    updateStatus();
};

function attackEnemy(r, c) {
    if (phase !== 'playerTurn') return;

    const val = enemyBoard[r][c];
    if (val === 2 || val === 3) return; // already shot

    const idx = r * SIZE + c;
    const cellEl = boardEnemyEl.children[idx];

    if (val === 1) {
        enemyBoard[r][c] = 3; // Hit
        cellEl.classList.add('hit');
        playSound('hit');
        checkDestroy(r, c, enemyShipData, false);
    } else if (val === 0) {
        enemyBoard[r][c] = 2; // Miss
        cellEl.classList.add('miss');
        playSound('miss');
    }

    if (checkWin()) return;

    phase = 'enemyTurn';
    boardEnemyEl.classList.add('disabled');
    updateStatus();
    // setTimeout(botAttack, 800);
}

function botAttack() {
    if (phase !== 'enemyTurn') return;

    // Simples Tiro Aleatório (para Arcade)
    let shot = false;
    while (!shot) {
        let r = Math.floor(Math.random() * SIZE);
        let c = Math.floor(Math.random() * SIZE);
        const val = playerBoard[r][c];

        if (val === 0 || val === 1) {
            const idx = r * SIZE + c;
            const cellEl = boardPlayerEl.children[idx];

            if (val === 1) {
                playerBoard[r][c] = 3;
                cellEl.classList.add('hit');
                playSound('hit');
                checkDestroy(r, c, playerShipData, true);
            } else {
                playerBoard[r][c] = 2;
                cellEl.classList.add('miss');
                playSound('miss');
            }
            shot = true;
        }
    }

    if (checkWin()) return;

    phase = 'playerTurn';
    boardEnemyEl.classList.remove('disabled');
    updateStatus();
}

function checkDestroy(r, c, shipData, isPlayerShip) {
    for (let i = 0; i < shipData.length; i++) {
        let ship = shipData[i];
        let found = ship.positions.find(p => p.r === r && p.c === c);
        if (found) {
            ship.hits++;
            if (ship.hits === ship.positions.length) {
                // Afundou
                if (isPlayerShip) playerShipsAlive--;
                else enemyShipsAlive--;

                statusMsg.innerText = isPlayerShip ? `Seu ${ship.name} foi AFUNDADO!` : `Você AFUNDOU o ${ship.name} Inimigo!`;
            }
            break;
        }
    }
}

function updateStatus() {
    score1El.innerText = `Vivos: ${playerShipsAlive}`;
    score2El.innerText = `Vivos: ${enemyShipsAlive}`;

    if (phase === 'playerTurn') {
        p1El.classList.add('active');
        p2El.classList.remove('active');
        turnIndicator.innerText = "ATIRE NO OCEANO INIMIGO";
        turnIndicator.style.color = "#00ffff";
        turnIndicator.style.textShadow = "0 0 5px #00ffff";
        if (statusMsg.innerText.includes('Posicione')) statusMsg.innerText = 'Seu Turno: Fogo!';
    } else if (phase === 'enemyTurn') {
        p2El.classList.add('active');
        p1El.classList.remove('active');
        turnIndicator.innerText = "TURNO DO ADVERSÁRIO (Aguarde)";
        turnIndicator.style.color = "#ff00ff";
        turnIndicator.style.textShadow = "0 0 5px #ff00ff";
    }
}

function checkWin() {
    if (enemyShipsAlive === 0) {
        phase = 'gameOver';
        updateStatus();
        setTimeout(() => alert('VITÓRIA! VOCÊ DESTRUIU A FROTA ADVERSÁRIA!'), 100);
        return true;
    }
    if (playerShipsAlive === 0) {
        phase = 'gameOver';
        updateStatus();
        setTimeout(() => alert('DERROTA! SUA FROTA FOI DESTRUÍDA!'), 100);
        return true;
    }
    return false;
}

init();
