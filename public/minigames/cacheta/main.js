// Configurações Supabase (Referência Global via HTML)
const urlParams = new URLSearchParams(window.location.search);
const MATCH_ID = urlParams.get('match_id');
const TOURNAMENT_ID = urlParams.get('tournament_id');
const myRole = parseInt(urlParams.get('role')) || 1;
console.log("🎮 Papel na arena de Cacheta:", myRole);

const deckBtn = document.getElementById('deck-btn');
const discardPileEl = document.getElementById('discard-pile');
const playerHandEl = document.getElementById('player-hand');
const discardBtn = document.getElementById('discard-mode-btn');
const batidaBtn = document.getElementById('batida-btn');

const score1El = document.getElementById('score1');
const score2El = document.getElementById('score2');
const turnIndicator = document.getElementById('turn-indicator');
const turnTimerEl = document.getElementById('turn-timer');
const gameTimerEl = document.getElementById('game-timer');
const p1El = document.querySelector('.player.p1');
const p2El = document.querySelector('.player.p2');
const statusMsg = document.getElementById('status-msg');

// Timers
let gameTime = 600; // Match limit: 10 mins
let p1Time = 300;   // Player 1 Pool: 5 mins
let p2Time = 300;   // Player 2 Pool: 5 mins
let gameInterval;

const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
function playSound(type) {
    if (audioCtx.state === 'suspended') audioCtx.resume();
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    const now = audioCtx.currentTime;

    if (type === 'card') {
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(400, now);
        osc.frequency.exponentialRampToValueAtTime(100, now + 0.1);
        gain.gain.setValueAtTime(0.1, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
        osc.start(now);
        osc.stop(now + 0.1);
    } else if (type === 'draw') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(300, now);
        osc.frequency.exponentialRampToValueAtTime(500, now + 0.1);
        gain.gain.setValueAtTime(0.05, now);
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
    } else if (type === 'win') {
        osc.type = 'square';
        osc.frequency.setValueAtTime(400, now);
        osc.frequency.setValueAtTime(600, now + 0.2);
        osc.frequency.setValueAtTime(800, now + 0.4);
        gain.gain.setValueAtTime(0.1, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.6);
        osc.start(now);
        osc.stop(now + 0.6);
    }
}

const SUITS = [
    { name: 'hearts', symbol: '♥' },
    { name: 'diamonds', symbol: '♦' },
    { name: 'clubs', symbol: '♣' },
    { name: 'spades', symbol: '♠' }
];
const RANKS = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];

let deck = [];
let discardPile = [];
let p1Hand = [];
let p2Hand = [];

let turn = 1; // 1 = P1, 2 = Bot
let phase = 'draw'; // 'draw' = Precisa comprar (monte ou lixo), 'discard' = Precisa descartar
let selectedHandIndex = -1;

// Variaveis Reorganização de Cartas
let draggedCardIndex = null;
let touchStartX = 0, touchStartY = 0;
let isDraggingCard = false;

function loadIdentity() {
    try {
        const user = JSON.parse(localStorage.getItem('rf_current_user'));
        if (user) {
            if (user.name) document.getElementById('name1').innerText = user.name;
            if (user.img) document.getElementById('avatar1').src = user.img;
        }
    } catch (e) { }
}

function startTimers() {
    clearInterval(gameInterval);
    gameInterval = setInterval(() => {
        // Match Timer (Total 10m)
        gameTime--;

        // Individual Player Pool (5m each)
        if (turn === 1) {
            p1Time--;
            if (p1Time <= 0) {
                endGame(2, "Seu tempo acabou!");
            }
        } else {
            p2Time--;
            if (p2Time <= 0) {
                endGame(1, "Tempo do oponente acabou!");
            }
        }

        if (gameTime <= 0) {
            if (p1Hand.length === p2Hand.length) endGame(0, "Empate por tempo!");
            else endGame(p1Hand.length < p2Hand.length ? 1 : 2, "Tempo da Partida Esgotado!");
        }
        updateGameTimerUI();
        updatePlayerClocksUI();
    }, 1000);
}

function endGame(winner, reason) {
    if (window.isGameEnded) return;
    window.isGameEnded = true;
    clearInterval(gameInterval);

    const isWinner = (winner === myRole);
    console.log(`[ARENA] Fim da Partida: Vencedor #${winner}. Eu sou #${myRole}. Vitoria? ${isWinner}`);

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

function updateGameTimerUI() {
    const mins = Math.floor(gameTime / 60);
    const secs = gameTime % 60;
    if (gameTimerEl) gameTimerEl.innerText = `${mins}:${secs.toString().padStart(2, '0')}`;
}

function updatePlayerClocksUI() {
    const formatTime = (t) => {
        const m = Math.floor(t / 60);
        const s = t % 60;
        return `${m}:${s.toString().padStart(2, '0')}`;
    };

    // Update Scores with Clocks
    score1El.innerHTML = `Cartas: ${p1Hand.length} <div class="timer-val">${formatTime(p1Time)}</div>`;
    score2El.innerHTML = `Cartas: ${p2Hand.length} <div class="timer-val">${formatTime(p2Time)}</div>`;
}

function init() {
    deck = [];
    // Baralho Duplo para Cacheta (104 cartas)
    for (let d = 0; d < 2; d++) {
        SUITS.forEach(s => {
            RANKS.forEach(r => {
                deck.push({ suit: s, rank: r });
            });
        });
    }
    shuffle(deck);

    p1Hand = deck.splice(0, 9); // Distribui 9 pra cada na regra geral
    p2Hand = deck.splice(0, 9);

    // Abre 1 no lixo
    discardPile.push(deck.pop());

    turn = 1;
    phase = 'draw';
    selectedHandIndex = -1;
    render();
}

function shuffle(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
}

function showMsg(msg) {
    statusMsg.innerText = msg;
    setTimeout(() => { if (statusMsg.innerText === msg) statusMsg.innerText = 'Organize suas cartas'; }, 3000);
}

function render() {
    updatePlayerClocksUI();

    // Atualiza Lixo
    const topCard = discardPile.length > 0 ? discardPile[discardPile.length - 1] : null;
    if (topCard) {
        discardPileEl.className = `card suit-${topCard.suit.name}`;
        discardPileEl.innerHTML = `
            <div class="top-left"><span>${topCard.rank}</span><span>${topCard.suit.symbol}</span></div>
            <div class="center-suit">${topCard.suit.symbol}</div>
            <div class="bottom-right"><span>${topCard.rank}</span><span>${topCard.suit.symbol}</span></div>
        `;
    } else {
        discardPileEl.className = 'card empty';
        discardPileEl.innerHTML = 'LIXO';
    }

    // Atualiza Mão
    playerHandEl.innerHTML = '';

    // Simplificado: Mostra botoes dependendo da fase
    if (phase === 'draw') {
        discardBtn.innerText = "Fase: Compre do Lixo ou Baralho";
    } else {
        discardBtn.innerText = "Fase: Descarte! (clique numa carta e aperte aqui)";
    }

    p1Hand.forEach((c, i) => {
        const el = document.createElement('div');
        el.className = `card suit-${c.suit.name}`;
        if (i === selectedHandIndex) el.classList.add('selected');

        el.innerHTML = `
            <div class="top-left"><span>${c.rank}</span><span>${c.suit.symbol}</span></div>
            <div class="center-suit">${c.suit.symbol}</div>
            <div class="bottom-right"><span>${c.rank}</span><span>${c.suit.symbol}</span></div>
        `;

        // === LÓGICA DE ORGANIZAÇÃO DE CARTAS === //

        // 1. Desktop (HTML5 Drag & Drop)
        el.draggable = true;
        el.ondragstart = (e) => {
            draggedCardIndex = i;
            setTimeout(() => el.style.opacity = '0.5', 0);
        };
        el.ondragend = () => { el.style.opacity = '1'; draggedCardIndex = null; };
        el.ondragover = (e) => { e.preventDefault(); };
        el.ondrop = (e) => {
            e.preventDefault();
            if (draggedCardIndex !== null && draggedCardIndex !== i) {
                const drgCard = p1Hand.splice(draggedCardIndex, 1)[0];
                p1Hand.splice(i, 0, drgCard);
                selectedHandIndex = -1; // reseta seleto apos mover
                render();
            }
        };

        // 2. Mobile (Touch Events)
        el.ontouchstart = (e) => {
            draggedCardIndex = i;
            isDraggingCard = false;
            touchStartX = e.touches[0].clientX;
            touchStartY = e.touches[0].clientY;
            // Visual feedback leve
            el.style.transform = 'scale(1.05)';
        };
        el.ontouchmove = (e) => {
            const dx = Math.abs(e.touches[0].clientX - touchStartX);
            const dy = Math.abs(e.touches[0].clientY - touchStartY);
            if (dx > 10 || dy > 10) isDraggingCard = true; // Confirma que é arraste, não clique
        };
        el.ontouchend = (e) => {
            el.style.transform = '';
            if (isDraggingCard && draggedCardIndex !== null) {
                const touch = e.changedTouches[0];
                const targetEl = document.elementFromPoint(touch.clientX, touch.clientY);
                if (targetEl && targetEl.closest('.card')) {
                    const dropTarget = targetEl.closest('.card');
                    const dropIdx = Array.from(playerHandEl.children).indexOf(dropTarget);
                    // Checa se soltou na mesma mao e indice diferente
                    if (dropIdx !== -1 && dropIdx !== draggedCardIndex && p1Hand[dropIdx]) {
                        const drgCard = p1Hand.splice(draggedCardIndex, 1)[0];
                        p1Hand.splice(dropIdx, 0, drgCard);
                        selectedHandIndex = -1;
                        setTimeout(render, 50); // timer curto evita bugs visuais no dom
                    }
                }
            }
            draggedCardIndex = null;
        };

        // Click handler modificado pra nao conflitar com touchmove
        el.onclick = (e) => {
            if (isDraggingCard) { isDraggingCard = false; return; }
            selectCard(i);
        };

        playerHandEl.appendChild(el);
    });

    if (turn === 1) {
        p1El.classList.add('active'); p2El.classList.remove('active');
        turnIndicator.innerText = "SUA VEZ";
        deckBtn.style.opacity = '1';
    } else {
        p2El.classList.add('active'); p1El.classList.remove('active');
        turnIndicator.innerText = "ADVERSÁRIO";
        deckBtn.style.opacity = '0.5';
    }
}

function selectCard(idx) {
    if (selectedHandIndex === idx) selectedHandIndex = -1; // deselect
    else selectedHandIndex = idx;
    render();
}

// BOTOES DE COMPRA
deckBtn.onclick = () => {
    if (turn !== 1 || phase !== 'draw') { playSound('error'); return; }

    // Checa fim do deck (simula reembaralhar na vida real)
    if (deck.length === 0) {
        const top = discardPile.pop();
        deck = discardPile.slice();
        discardPile = [top];
        shuffle(deck);
    }

    p1Hand.push(deck.pop());
    playSound('draw');
    phase = 'discard';
    selectedHandIndex = p1Hand.length - 1; // auto seleciona a nova pra ajudar
    render();
};

discardPileEl.onclick = () => {
    if (turn !== 1 || phase !== 'draw' || discardPile.length === 0) { playSound('error'); return; }
    p1Hand.push(discardPile.pop());
    playSound('draw');
    phase = 'discard';
    selectedHandIndex = p1Hand.length - 1;
    render();
};

// BOTÃO DESCARTE
discardBtn.onclick = () => {
    if (turn !== 1 || phase !== 'discard' || selectedHandIndex === -1) { playSound('error'); return; }

    const card = p1Hand.splice(selectedHandIndex, 1)[0];
    discardPile.push(card);
    playSound('card');

    selectedHandIndex = -1;
    turn = 2; // Passa a vez
    phase = 'draw';
    render();

    setTimeout(botLogic, 1500);
};

// BOTÃO DE BATER
batidaBtn.onclick = () => {
    if (turn !== 1) return;

    if (p1Hand.length === 9 || p1Hand.length === 10) {
        if (validateCachetaHand(p1Hand)) {
            playSound('win');
            setTimeout(() => endGame(1, "Você bateu Cacheta com sucesso!"), 100);
        } else {
            playSound('error');
            alert("Batida Inválida! Suas cartas não formam 3 jogos válidos (Trincas/Quadras ou Sequências do mesmo naipe).");
        }
    } else {
        playSound('error');
        alert("Você precisa ter 9 ou 10 cartas para bater.");
    }
};

// --- CACHETA VALIDATION ENGINE --- //
const RANK_VALUES = { 'A': 1, '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8, '9': 9, '10': 10, 'J': 11, 'Q': 12, 'K': 13 };

function validateCachetaHand(hand) {
    if (hand.length < 9) return false;

    // Convert to a sortable structure
    const cards = hand.map(c => ({ suit: c.suit.name, rankStr: c.rank, val: RANK_VALUES[c.rank] }));
    return canFormValidGroups(cards);
}

function canFormValidGroups(cards) {
    if (cards.length === 0) return true; // All cards grouped successfully
    // Allow checking subsets. Basically, if length is left at 1 for a 10-card hand, the 9 cards formed 3 perfect games.
    if (cards.length === 1) return true;

    // Recursive Backtracking to find subsets of valid games
    // A valid game is a Set (3+ same rank) or a Run (3+ same suit consecutive)

    // Sort logic to make run detection easier
    cards.sort((a, b) => a.val - b.val);

    // Try extracting every valid group of size 3 or 4 starting with first available card
    for (let size = 3; size <= Math.min(cards.length, 4); size++) {
        // Find combinations of 'size' cards
        const combs = getCombinations(cards, size);
        for (let comb of combs) {
            if (isValidSet(comb) || isValidRun(comb)) {
                // Remove these cards from the main list and recurse
                const remaining = removeCards(cards, comb);
                if (canFormValidGroups(remaining)) {
                    return true;
                }
            }
        }
    }
    return false;
}

function isValidSet(group) {
    if (group.length < 3) return false;
    const firstRank = group[0].val;
    return group.every(c => c.val === firstRank); // Trinca ou Quadra
}

function isValidRun(group) {
    if (group.length < 3) return false;
    // Must be same suit
    const suit = group[0].suit;
    if (!group.every(c => c.suit === suit)) return false;

    // Must be sequential (Assumes group is sorted by val)
    const sortedVals = group.map(c => c.val).sort((a, b) => a - b);
    for (let i = 1; i < sortedVals.length; i++) {
        if (sortedVals[i] !== sortedVals[i - 1] + 1) return false;
    }
    return true;
}

function getCombinations(arr, size) {
    const result = [];
    const f = (prefix, arr, size) => {
        if (size === 0) {
            result.push(prefix);
            return;
        }
        for (let i = 0; i < arr.length; i++) {
            f([...prefix, arr[i]], arr.slice(i + 1), size - 1);
        }
    };
    f([], arr, size);
    return result;
}

function removeCards(source, toRemove) {
    const res = [...source];
    for (let c of toRemove) {
        const idx = res.findIndex(r => r.rankStr === c.rankStr && r.suit === c.suit);
        if (idx !== -1) res.splice(idx, 1);
    }
    return res;
}
// --------------------------------- //

function botLogic() {
    if (turn !== 2) return;

    if (phase === 'draw') {
        // Compra sempre do deck oculto
        if (deck.length === 0) {
            const top = discardPile.pop(); deck = discardPile.slice(); discardPile = [top]; shuffle(deck);
        }
        p2Hand.push(deck.pop());
        playSound('draw');
        phase = 'discard';
        setTimeout(botLogic, 1000);
    } else {
        // Descarte: Bot descarta aleatorio para este Arcade Basico
        const idx = Math.floor(Math.random() * p2Hand.length);
        discardPile.push(p2Hand.splice(idx, 1)[0]);
        playSound('card');

        // Verifica bater? (Arcade - bot tem 5% chance se tiver 9 cartas dps da volta)
        if (p2Hand.length === 9 && Math.random() < 0.05) {
            playSound('win');
            setTimeout(() => endGame(2, "O adversário bateu Cacheta!"), 100);
            return;
        }

        turn = 1;
        phase = 'draw';
        showMsg("O Bot jogou no lixo. Sua vez!");
        render();
    }
}

loadIdentity();
startTimers();
init();
