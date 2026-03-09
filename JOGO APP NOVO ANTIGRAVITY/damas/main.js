const boardSize = 8;
const boardEl = document.getElementById('board');
const turnIndicator = document.getElementById('turn-indicator');
const p1El = document.querySelector('.player.p1');
const p2El = document.querySelector('.player.p2');
const score1El = document.getElementById('score1');
const score2El = document.getElementById('score2');

// Audio elements using Web Audio Context
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
function playSound(type) {
    if (audioCtx.state === 'suspended') audioCtx.resume();
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    const now = audioCtx.currentTime;

    if (type === 'move') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(300, now);
        osc.frequency.exponentialRampToValueAtTime(150, now + 0.1);
        gain.gain.setValueAtTime(0.05, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
        osc.start(now);
        osc.stop(now + 0.1);
    } else if (type === 'jump') {
        osc.type = 'square';
        osc.frequency.setValueAtTime(400, now);
        osc.frequency.exponentialRampToValueAtTime(800, now + 0.15);
        gain.gain.setValueAtTime(0.05, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
        osc.start(now);
        osc.stop(now + 0.15);
    }
}

// 0: empty, 1: p1, -1: p1 king, 2: p2, -2: p2 king
let state = [];
let turn = 1; // 1 = p1 (Cyan), 2 = p2 (Magenta)
let selectedPos = null;
let validMoves = [];
let piecesP1 = 12;
let piecesP2 = 12;

function init() {
    state = Array(8).fill(null).map(() => Array(8).fill(0));
    for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
            if ((r + c) % 2 !== 0) {
                if (r < 3) state[r][c] = 2; // Magenta (top)
                else if (r > 4) state[r][c] = 1; // Cyan (bottom)
            }
        }
    }
    piecesP1 = 12;
    piecesP2 = 12;
    turn = 1;
    selectedPos = null;
    validMoves = [];
    render();
}

function render() {
    boardEl.innerHTML = '';
    for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
            const cell = document.createElement('div');
            cell.className = 'cell ' + ((r + c) % 2 === 0 ? 'light' : 'dark');

            // Check if valid move target
            const isMoveObj = validMoves.find(m => m.r === r && m.c === c);
            if (isMoveObj) {
                cell.classList.add('valid-move');
                cell.onclick = () => executeMove(isMoveObj);
            } else {
                cell.onclick = () => handleCellClick(r, c);
            }

            const val = state[r][c];
            if (val !== 0) {
                const piece = document.createElement('div');
                const pType = Math.abs(val);
                piece.className = 'piece p' + pType;
                if (val < 0) piece.classList.add('king');

                if (selectedPos && selectedPos.r === r && selectedPos.c === c) {
                    piece.classList.add('selected');
                }

                cell.appendChild(piece);
            }
            boardEl.appendChild(cell);
        }
    }

    score1El.innerText = piecesP1;
    score2El.innerText = piecesP2;

    if (turn === 1) {
        p1El.classList.add('active');
        p2El.classList.remove('active');
        turnIndicator.innerText = "VEZ DO CIANO (J1)";
        turnIndicator.style.color = "#00ffff";
        turnIndicator.style.textShadow = "0 0 5px #00ffff";
    } else {
        p2El.classList.add('active');
        p1El.classList.remove('active');
        turnIndicator.innerText = "VEZ DO MAGENTA (J2)";
        turnIndicator.style.color = "#ff00ff";
        turnIndicator.style.textShadow = "0 0 5px #ff00ff";
    }

    if (piecesP1 === 0) setTimeout(() => alert("MAGENTA VENCE!"), 100);
    if (piecesP2 === 0) setTimeout(() => alert("CIANO VENCE!"), 100);
}

function handleCellClick(r, c) {
    const val = state[r][c];
    if (val !== 0 && Math.abs(val) === turn) {
        // Seleciona peça
        if (selectedPos && selectedPos.r === r && selectedPos.c === c) {
            selectedPos = null; // deselect
            validMoves = [];
        } else {
            selectedPos = { r, c };
            validMoves = getValidMovesForPiece(r, c);
        }
        render();
    }
}

function executeMove(move) {
    const val = state[selectedPos.r][selectedPos.c];
    state[move.r][move.c] = val;
    state[selectedPos.r][selectedPos.c] = 0;

    // Captura?
    if (move.jump) {
        playSound('jump');
        state[move.jumpR][move.jumpC] = 0;
        if (turn === 1) piecesP2--;
        else piecesP1--;
    } else {
        playSound('move');
    }

    // Promove a Dama?
    if (turn === 1 && move.r === 0 && val === 1) {
        state[move.r][move.c] = -1; // King p1
    } else if (turn === 2 && move.r === 7 && val === 2) {
        state[move.r][move.c] = -2; // King p2
    }

    // Passa turno
    turn = turn === 1 ? 2 : 1;
    selectedPos = null;
    validMoves = [];
    render();
}

function getValidMovesForPiece(r, c) {
    const val = state[r][c];
    const isKing = val < 0;
    const player = Math.abs(val);

    let dirs = [];
    if (player === 1 || isKing) dirs.push([-1, -1], [-1, 1]); // Cima
    if (player === 2 || isKing) dirs.push([1, -1], [1, 1]);   // Baixo

    const moves = [];
    // Prioriza mostrar pulos se houver? Pela regra basica, permitimos qualquer um, 
    // ou apenas pulos se existirem? Faremos simples primeiro (qualquer)

    for (let d of dirs) {
        let nr = r + d[0], nc = c + d[1];
        if (nr >= 0 && nr < 8 && nc >= 0 && nc < 8) {
            if (state[nr][nc] === 0) {
                // Movimento normal
                moves.push({ r: nr, c: nc, jump: false });
            } else if (Math.abs(state[nr][nc]) !== player) {
                // Possivel Pulo
                let jr = nr + d[0], jc = nc + d[1];
                if (jr >= 0 && jr < 8 && jc >= 0 && jc < 8 && state[jr][jc] === 0) {
                    moves.push({ r: jr, c: jc, jump: true, jumpR: nr, jumpC: nc });
                }
            }
        }
    }
    return moves;
}

init();
