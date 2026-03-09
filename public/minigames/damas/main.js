
// Configurações Supabase (Referência Global via HTML)
const urlParams = new URLSearchParams(window.location.search);
const MATCH_ID = urlParams.get('match_id');
const TOURNAMENT_ID = urlParams.get('tournament_id');
const SB_URL = urlParams.get('sb_url') || localStorage.getItem('sb_url');
const SB_KEY = urlParams.get('sb_key') || localStorage.getItem('sb_key');

// Elementos do DOM

// Elementos do DOM (Obtidos dinamicamente para evitar null)
const getEl = (id) => document.getElementById(id);

// Estado Global
let boardEl, turnIndicator, gameTimerEl, score1El, score2El, p1Box, p2Box;
let currentUser = null;
let currentMatch = null;
let myRole = parseInt(urlParams.get('role')) || 1;
console.log("🎮 Papel na arena de Damas:", myRole);
let state = [];
let turn = 1;
let selectedPos = null;
let validMoves = [];
let piecesP1 = 12;
let piecesP2 = 12;

// Cronômetros
let gameTime = 600;
let p1Time = 300;
let p2Time = 300;
let gameInterval;

// Audio Context
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
function playSound(type) {
    try {
        if (audioCtx.state === 'suspended') audioCtx.resume();
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.connect(gain); gain.connect(audioCtx.destination);
        const now = audioCtx.currentTime;
        if (type === 'move') {
            osc.frequency.setValueAtTime(300, now);
            osc.frequency.exponentialRampToValueAtTime(150, now + 0.1);
            gain.gain.setTargetAtTime(0.05, now, 0.05);
            gain.gain.setTargetAtTime(0.001, now + 0.1, 0.05);
            osc.start(now); osc.stop(now + 0.1);
        } else if (type === 'jump') {
            osc.frequency.setValueAtTime(400, now);
            osc.frequency.exponentialRampToValueAtTime(800, now + 0.15);
            gain.gain.setTargetAtTime(0.05, now, 0.05);
            gain.gain.setTargetAtTime(0.001, now + 0.15, 0.05);
            osc.start(now); osc.stop(now + 0.15);
        }
    } catch (e) { }
}

function loadIdentity() {
    try {
        const user = JSON.parse(localStorage.getItem('rf_current_user'));
        if (user) {
            if (user.name && getEl('name1')) getEl('name1').innerText = user.name;
            if (user.img && getEl('avatar1')) getEl('avatar1').src = user.img;
        }
    } catch (e) { }
}

function startTimers() {
    console.log("⏰ Cronômetros Ativados (10m Partida / 5m Turno)");
    clearInterval(gameInterval);
    gameInterval = setInterval(() => {
        gameTime--;
        if (turn === 1) {
            p1Time--;
            if (p1Time <= 0) endGame(2, "Tempo Esgotado!");
        } else {
            p2Time--;
            if (p2Time <= 0) endGame(1, "Tempo Esgotado!");
        }
        if (gameTime <= 0) {
            if (piecesP1 === piecesP2) endGame(0, "Empate por tempo!");
            else endGame(piecesP1 > piecesP2 ? 1 : 2, "Fim de Jogo por vantagem!");
        }
        updateUI();
    }, 1000);
}

function updateUI() {
    const format = (t) => {
        const m = Math.max(0, Math.floor(t / 60));
        const s = Math.max(0, t % 60);
        return `${m}:${s.toString().padStart(2, '0')}`;
    };

    if (gameTimerEl) gameTimerEl.innerText = format(gameTime);
    if (score1El) score1El.innerHTML = `Peças: ${piecesP1} <div class="timer-val">${format(p1Time)}</div>`;
    if (score2El) score2El.innerHTML = `Peças: ${piecesP2} <div class="timer-val">${format(p2Time)}</div>`;

    if (turn === 1) {
        if (p1Box) p1Box.classList.add('active');
        if (p2Box) p2Box.classList.remove('active');
    } else {
        if (p2Box) p2Box.classList.add('active');
        if (p1Box) p1Box.classList.remove('active');
    }

    if (turnIndicator) {
        turnIndicator.innerText = (turn === myRole) ? "SUA VEZ" : "ADVERSÁRIO";
    }
}

function initBoard() {
    state = Array(8).fill(0).map(() => Array(8).fill(0));
    for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
            if ((r + c) % 2 !== 0) {
                if (r < 3) state[r][c] = 2;
                else if (r > 4) state[r][c] = 1;
            }
        }
    }
    piecesP1 = 12; piecesP2 = 12;
    turn = 1;
    render();
}

function render() {
    if (!boardEl) return;
    boardEl.innerHTML = '';
    const isMyTurn = (turn === myRole);

    for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
            const cell = document.createElement('div');
            cell.className = 'cell ' + ((r + c) % 2 === 0 ? 'light' : 'dark');

            const move = validMoves.find(m => m.r === r && m.c === c);
            if (move && isMyTurn) {
                cell.classList.add('valid-move');
                cell.onclick = () => executeMove(move);
            } else {
                cell.onclick = () => isMyTurn && handleCellClick(r, c);
            }

            const val = state[r][c];
            if (val !== 0) {
                const piece = document.createElement('div');
                piece.className = 'piece p' + Math.abs(val);
                if (val < 0) piece.classList.add('king');
                if (selectedPos && selectedPos.r === r && selectedPos.c === c) piece.classList.add('selected');
                cell.appendChild(piece);
            }
            boardEl.appendChild(cell);
        }
    }
    updateUI();
}

function handleCellClick(r, c) {
    const val = state[r][c];
    if (val !== 0 && Math.abs(val) === turn) {
        if (selectedPos && selectedPos.r === r && selectedPos.c === c) {
            selectedPos = null; validMoves = [];
        } else {
            selectedPos = { r, c };
            validMoves = getValidMoves(r, c);
        }
        render();
    }
}

function getValidMoves(r, c) {
    const val = state[r][c];
    const p = Math.abs(val);
    const king = val < 0;
    const res = [];
    const dirs = [];
    if (p === 1 || king) dirs.push([-1, -1], [-1, 1]);
    if (p === 2 || king) dirs.push([1, -1], [1, 1]);

    for (let d of dirs) {
        let nr = r + d[0], nc = c + d[1];
        if (nr >= 0 && nr < 8 && nc >= 0 && nc < 8) {
            if (state[nr][nc] === 0) {
                res.push({ r: nr, c: nc });
            } else if (Math.abs(state[nr][nc]) !== p) {
                let jr = nr + d[0], jc = nc + d[1];
                if (jr >= 0 && jr < 8 && jc >= 0 && jc < 8 && state[jr][jc] === 0) {
                    res.push({ r: jr, c: jc, jump: true, jr: nr, jc: nc });
                }
            }
        }
    }
    return res;
}

function executeMove(move) {
    const from = { ...selectedPos };
    const val = state[from.r][from.c];
    state[move.r][move.c] = val;
    state[from.r][from.c] = 0;
    if (move.jump) {
        state[move.jr][move.jc] = 0;
        if (turn === 1) piecesP2--; else piecesP1--;
        playSound('jump');
    } else {
        playSound('move');
    }
    if (turn === 1 && move.r === 0 && val === 1) state[move.r][move.c] = -1;
    if (turn === 2 && move.r === 7 && val === 2) state[move.r][move.c] = -2;
    turn = turn === 1 ? 2 : 1;
    selectedPos = null; validMoves = [];

    // Verificação de Vitória
    if (piecesP1 <= 0) setTimeout(() => endGame(2, "Oponente capturou todas as suas peças!"), 200);
    else if (piecesP2 <= 0) setTimeout(() => endGame(1, "Parabéns! Você capturou todas as peças!"), 200);

    render();
}

function init() {
    boardEl = getEl('board');
    if (!boardEl) {
        console.error("🔥 ERRO FATAL: Elemento #board não encontrado!");
        return;
    }

    turnIndicator = getEl('turn-status');
    gameTimerEl = getEl('game-timer');
    score1El = getEl('score1');
    score2El = getEl('score2');
    p1Box = getEl('p1-box');
    p2Box = getEl('p2-box');

    loadIdentity();
    initBoard();
    startTimers();
}

function endGame(winner, reason) {
    if (window.isGameEnded) return;
    window.isGameEnded = true;
    clearInterval(gameInterval);

    const isWinner = (winner === myRole);

    // Emite sinal para o componente React pai
    window.parent.postMessage({
        type: 'GAME_ENDED',
        isWinner: isWinner,
        winnerRole: winner,
        reason: reason,
        tournamentId: TOURNAMENT_ID,
        matchId: MATCH_ID
    }, '*');
}

// Inicialização segura via DOMContentLoaded
window.addEventListener('DOMContentLoaded', () => {
    try {
        init();
    } catch (e) {
        console.error("🔥 ERRO FATAL AO INICIAR DAMAS:", e);
    }
});

