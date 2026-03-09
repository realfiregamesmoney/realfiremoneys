const boardContentEl = document.getElementById('board-content');
const playerHandEl = document.getElementById('player-hand');
const drawBtn = document.getElementById('draw-btn');
const passBtn = document.getElementById('pass-btn');

const score1El = document.getElementById('score1');
const score2El = document.getElementById('score2');
const turnIndicator = document.getElementById('turn-indicator');
const p1El = document.querySelector('.player.p1');
const p2El = document.querySelector('.player.p2');

const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
function playSound(type) {
    if (audioCtx.state === 'suspended') audioCtx.resume();
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    const now = audioCtx.currentTime;

    if (type === 'placed') {
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(400, now);
        osc.frequency.exponentialRampToValueAtTime(100, now + 0.1);
        gain.gain.setValueAtTime(0.1, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
        osc.start(now);
        osc.stop(now + 0.1);
    } else if (type === 'error') {
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(150, now);
        osc.frequency.exponentialRampToValueAtTime(50, now + 0.2);
        gain.gain.setValueAtTime(0.1, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
        osc.start(now);
        osc.stop(now + 0.2);
    }
}

// Domino State
let deck = [];
let handP1 = [];
let handP2 = [];
let board = [];
let leftEnd = null;
let rightEnd = null;
let turn = 1; // 1 = Ciano, 2 = Magenta (Bot)

function init() {
    deck = [];
    for (let i = 0; i <= 6; i++) {
        for (let j = i; j <= 6; j++) {
            deck.push({ left: i, right: j, isDouble: i === j });
        }
    }
    shuffle(deck);

    handP1 = deck.splice(0, 7);
    handP2 = deck.splice(0, 7);
    board = [];
    leftEnd = null;
    rightEnd = null;

    // Who starts? Usually the highest double. For Arcade, P1 starts.
    turn = 1;
    render();
}

function shuffle(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
}

function render() {
    drawBtn.innerText = `Comprar (${deck.length})`;
    drawBtn.disabled = deck.length === 0 || turn !== 1;
    passBtn.style.display = (turn === 1 && !hasValidMove(handP1) && deck.length === 0) ? 'inline-block' : 'none';

    score1El.innerText = `Pedras: ${handP1.length}`;
    score2El.innerText = `Pedras: ${handP2.length}`;

    if (turn === 1) {
        p1El.classList.add('active');
        p2El.classList.remove('active');
        turnIndicator.innerText = "VEZ DO CIANO (Você)";
        turnIndicator.style.color = "#00ffff";
        turnIndicator.style.textShadow = "0 0 5px #00ffff";
    } else {
        p2El.classList.add('active');
        p1El.classList.remove('active');
        turnIndicator.innerText = "VEZ DO FOGO (P2)";
        turnIndicator.style.color = "#ff00ff";
        turnIndicator.style.textShadow = "0 0 5px #ff00ff";
    }

    renderHand();
    renderBoard();

    // Winners
    if (handP1.length === 0) return setTimeout(() => alert("VOCÊ BATEU E VENCEU!"), 100);
    if (handP2.length === 0) return setTimeout(() => alert("JOGADOR 2 BATEU E VENCEU!"), 100);
    checkBlock();

    if (turn === 2) {
        // setTimeout(botPlay, 1000); // bot thinks
    }
}

function getDotsTemplate(val) {
    if (val === 0) return '';
    let html = '';
    if (val === 1) html += '<div class="dot dot-pos-1"></div>';
    if (val === 2) { html += '<div class="dot dot-pos-2-1"></div><div class="dot dot-pos-2-2"></div>'; }
    if (val === 3) { html += '<div class="dot dot-pos-3-1"></div><div class="dot dot-pos-3-2"></div><div class="dot dot-pos-3-3"></div>'; }
    if (val === 4) { html += '<div class="dot dot-pos-4-1"></div><div class="dot dot-pos-4-2"></div><div class="dot dot-pos-4-3"></div><div class="dot dot-pos-4-4"></div>'; }
    if (val === 5) { html += '<div class="dot dot-pos-5-1"></div><div class="dot dot-pos-5-2"></div><div class="dot dot-pos-5-3"></div><div class="dot dot-pos-5-4"></div><div class="dot dot-pos-5-5"></div>'; }
    if (val === 6) { html += '<div class="dot dot-pos-6-1"></div><div class="dot dot-pos-6-2"></div><div class="dot dot-pos-6-3"></div><div class="dot dot-pos-6-4"></div><div class="dot dot-pos-6-5"></div><div class="dot dot-pos-6-6"></div>'; }
    return html;
}

function createDOMDomino(tile, asBoardItem = false) {
    const el = document.createElement('div');
    el.className = 'domino-tile';
    if (asBoardItem && tile.isDouble) el.classList.add('domino-double');

    // Inversão visual CSS
    let topVal = tile.left;
    let botVal = tile.right;

    if (asBoardItem) {
        el.classList.add('domino-horizontal');
        if (tile.flipVisual) el.classList.add('flip');
    }

    el.innerHTML = `
        <div class="domino-half top">
            ${getDotsTemplate(topVal)}
        </div>
        <div class="domino-half bottom">
            ${getDotsTemplate(botVal)}
        </div>
    `;
    return el;
}

function renderHand() {
    playerHandEl.innerHTML = '';
    handP1.forEach((t, index) => {
        const el = createDOMDomino(t, false);
        el.onclick = () => playerPlay(index);
        playerHandEl.appendChild(el);
    });
}

function renderBoard() {
    boardContentEl.innerHTML = '';
    board.forEach(t => {
        const el = createDOMDomino(t, true);
        boardContentEl.appendChild(el);
    });
}

// Logic Rules
function hasValidMove(hand) {
    if (board.length === 0) return true;
    return hand.some(t => t.left === leftEnd || t.right === leftEnd || t.left === rightEnd || t.right === rightEnd);
}

function playerPlay(index) {
    // Permite jogar em ambos os turnos para testar multiplayer local
    // if (turn !== 1 && turn !== 2) return;
    const t = handP1[index];

    if (board.length === 0) {
        t.flipVisual = false;
        leftEnd = t.left; rightEnd = t.right;
        board.push(t);
        handP1.splice(index, 1);
        finishPlay();
        return;
    }

    // Try fit right, then left. Arcade rules simple auto-fit
    let played = false;

    // Se pode em ambos, prompt para o jogador? Neste arcade, envia pra direita se livre.
    if ((t.left === rightEnd || t.right === rightEnd) && !played) {
        if (t.left === rightEnd) {
            t.flipVisual = true; // Botão do Right encosta, left fica virado pro fim.
            rightEnd = t.right;
        } else {
            t.flipVisual = false;
            rightEnd = t.left;
        }
        board.push(t);
        played = true;
    }
    else if ((t.left === leftEnd || t.right === leftEnd) && !played) {
        if (t.right === leftEnd) {
            t.flipVisual = true;
            leftEnd = t.left;
        } else {
            t.flipVisual = false;
            leftEnd = t.right;
        }
        board.unshift(t);
        played = true;
    }

    if (played) {
        handP1.splice(index, 1);
        finishPlay();
    } else {
        playSound('error');
    }
}

function botPlay() {
    // IA desativada para Multiplayer
}

function finishPlay() {
    playSound('placed');
    turn = turn === 1 ? 2 : 1;
    render();
}

function checkBlock() {
    if (deck.length === 0 && !hasValidMove(handP1) && !hasValidMove(handP2)) {
        setTimeout(() => alert('JOGO TRANCADO! Vence quem tem menos peças.'), 200);
    }
}

drawBtn.onclick = () => {
    if (turn === 1 && deck.length > 0 && !hasValidMove(handP1)) {
        handP1.push(deck.pop());
        render();
    } else {
        playSound('error');
    }
};

passBtn.onclick = () => {
    if (turn === 1 && deck.length === 0 && !hasValidMove(handP1)) {
        finishPlay();
    }
}

init();
