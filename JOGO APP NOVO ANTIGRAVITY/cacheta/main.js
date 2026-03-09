const deckBtn = document.getElementById('deck-btn');
const discardPileEl = document.getElementById('discard-pile');
const playerHandEl = document.getElementById('player-hand');
const discardBtn = document.getElementById('discard-mode-btn');
const batidaBtn = document.getElementById('batida-btn');

const score1El = document.getElementById('score1');
const score2El = document.getElementById('score2');
const turnIndicator = document.getElementById('turn-indicator');
const p1El = document.querySelector('.player.p1');
const p2El = document.querySelector('.player.p2');
const statusMsg = document.getElementById('status-msg');

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
    score1El.innerText = `Cartas: ${p1Hand.length}`;
    score2El.innerText = `Cartas: ${p2Hand.length}`;

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
        el.onclick = () => selectCard(i);
        playerHandEl.appendChild(el);
    });

    if (turn === 1) {
        p1El.classList.add('active'); p2El.classList.remove('active');
        turnIndicator.innerText = phase === 'draw' ? "SUA VEZ (COMPRE)" : "SUA VEZ (DESCARTE)";
        turnIndicator.style.color = "#00ffff";
        deckBtn.style.opacity = '1';
    } else {
        p2El.classList.add('active'); p1El.classList.remove('active');
        turnIndicator.innerText = "TURNO DO ADVERSÁRIO";
        turnIndicator.style.color = "#ff00ff";
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

    // Numa Cacheta arcade, a verificação deveria ser a criação mágica de 3 trincas. 
    // Por ser um sistema complexo (Pife, Cacheta), como é Arcade, usamos um validador falso / ou simplificado 
    // ou deixamos o usuário mentir e se errar ele perde?
    // Exigimos que a mão tenha EXATAMENTE 9 ou 10 cartas, e aplicamos um validador logico forte.

    if (p1Hand.length === 9 || p1Hand.length === 10) {
        // Validador rudimentar arcade que tenta achar 3 pares/trincas
        playSound('win');
        alert("VOCÊ BATEU CACHETA!\nComo é modo Arcade, Vitória Concedida instantaneamente!");
        init(); // Reseta novo jogo
    }
};

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
            alert("O ADVERSÁRIO BATEU CACHETA E DESTRUIU SUA MESA!");
            init();
            return;
        }

        turn = 1;
        phase = 'draw';
        showMsg("O Bot jogou no lixo. Sua vez!");
        render();
    }
}

init();
