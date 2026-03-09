const deckBtn = document.getElementById('deck-btn');
const discardPileEl = document.getElementById('discard-pile');
const playerHandEl = document.getElementById('player-hand');
const unoBtn = document.getElementById('uno-btn');
const modal = document.getElementById('color-picker');
const colorBtns = document.querySelectorAll('.c-btn');

const score1El = document.getElementById('score1');
const score2El = document.getElementById('score2');
const turnIndicator = document.getElementById('turn-indicator');
const p1El = document.querySelector('.player.p1');
const p2El = document.querySelector('.player.p2');
const statusMsg = document.getElementById('status-msg');

let deck = [];
let discardPile = [];
let p1Hand = [];
let p2Hand = [];
let turn = 1; // 1 = P1, 2 = P2 (Multiplayer)
let currentColor = ''; // Para caso joguem curinga
let playerCalledUno = false;
let pendingColorChoice = false;

const COLORS = ['red', 'blue', 'green', 'yellow'];
const VALUES = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', '+2', 'Block']; // Sem coringa pra bater mais rápido e direto no Arcade? Vamos por 1 curinga básico.
const WILDS = ['Color']; // Muda a cor

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
        osc.frequency.setValueAtTime(600, now);
        osc.frequency.exponentialRampToValueAtTime(300, now + 0.1);
        gain.gain.setValueAtTime(0.1, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
        osc.start(now);
        osc.stop(now + 0.1);
    } else if (type === 'draw') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(300, now);
        osc.frequency.exponentialRampToValueAtTime(400, now + 0.1);
        gain.gain.setValueAtTime(0.05, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
        osc.start(now);
        osc.stop(now + 0.1);
    } else if (type === 'uno') {
        osc.type = 'square';
        osc.frequency.setValueAtTime(400, now);
        osc.frequency.setValueAtTime(600, now + 0.1);
        osc.frequency.setValueAtTime(800, now + 0.2);
        gain.gain.setValueAtTime(0.1, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
        osc.start(now);
        osc.stop(now + 0.3);
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

function init() {
    deck = [];
    COLORS.forEach(c => {
        VALUES.forEach(v => {
            deck.push({ color: c, value: v });
            if (v !== '0') deck.push({ color: c, value: v }); // Duas de cada exceto 0
        });
    });
    // Add 4 wilds
    for (let i = 0; i < 4; i++) deck.push({ color: 'black', value: '🎨' });

    shuffle(deck);

    p1Hand = deck.splice(0, 7);
    p2Hand = deck.splice(0, 7);

    // Primeira carta da mesa não pode ser especial para simplificar
    let first = deck.find(c => VALUES.includes(c.value) && c.color !== 'black' && isNaN(c.value) === false);
    deck.splice(deck.indexOf(first), 1);
    discardPile.push(first);
    currentColor = first.color;

    turn = 1;
    playerCalledUno = false;
    pendingColorChoice = false;
    modal.style.display = 'none';

    render();
}

function shuffle(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
}

function render() {
    if (pendingColorChoice) return; // Trava a UI enquanto escolhe cor

    score1El.innerText = `Cartas: ${p1Hand.length}`;
    score2El.innerText = `Cartas: ${p2Hand.length}`;

    // Atualiza Lixo
    const topCard = discardPile[discardPile.length - 1];
    discardPileEl.className = `card ${currentColor === 'black' ? topCard.color : currentColor}`;
    // Se a cor atual for forçada pelo coringa, pinta a carta lixo para refletir a nova cor exigida, ou só pinta a borda.
    // Pra ficar claro, vamos mudar o bg da div lixo forçadamente via classe
    if (topCard.color === 'black') {
        discardPileEl.className = `card ${currentColor}`;
    }
    discardPileEl.innerText = topCard.value;

    // Atualiza Mão
    playerHandEl.innerHTML = '';
    p1Hand.forEach((c, i) => {
        const el = document.createElement('div');
        el.className = `card ${c.color}`;
        el.innerText = c.value;
        el.onclick = () => playCard(i, 1);
        playerHandEl.appendChild(el);
    });

    if (turn === 1) {
        p1El.classList.add('active');
        p2El.classList.remove('active');
        turnIndicator.innerText = "SUA VEZ DE JOGAR";
        turnIndicator.style.color = "#00ffff";
        turnIndicator.style.textShadow = "0 0 5px #00ffff";
        deckBtn.style.opacity = '1';
    } else {
        p2El.classList.add('active');
        p1El.classList.remove('active');
        turnIndicator.innerText = "TURNO DO ADVERSÁRIO";
        turnIndicator.style.color = "#ff00ff";
        turnIndicator.style.textShadow = "0 0 5px #ff00ff";
        deckBtn.style.opacity = '0.5';
    }

    checkWin();
}

function showMsg(msg) {
    statusMsg.innerText = msg;
    setTimeout(() => { if (statusMsg.innerText === msg) statusMsg.innerText = ''; }, 2000);
}

function isValidPlay(card) {
    const topCard = discardPile[discardPile.length - 1];
    if (card.color === 'black') return true; // Curinga deita em cima de tudo
    if (card.color === currentColor) return true; // Mesma cor atual
    if (card.value === topCard.value) return true; // Mesmo símbolo/numero
    return false;
}

function playCard(index, player) {
    if (turn !== player || pendingColorChoice) return;

    const hand = player === 1 ? p1Hand : p2Hand;
    const card = hand[index];

    if (!isValidPlay(card)) {
        if (player === 1) { playSound('error'); showMsg("Carta Inválida!"); }
        return;
    }

    playSound('card');

    // Penalidade se esqueceu Uno falso? Arcade simplificado: se tiver 1 carta e nao gritou UNO, pesca 2. (Verificado depois)
    hand.splice(index, 1);
    discardPile.push(card);

    // Process Special
    if (card.color === 'black') {
        if (player === 1) {
            pendingColorChoice = true;
            modal.style.display = 'flex';
            render();
            return; // Espera modal
        } else {
            // Adversário a cor que mais tem na mao
            const colorCounts = { red: 0, blue: 0, green: 0, yellow: 0 };
            p2Hand.forEach(c => { if (c.color !== 'black') colorCounts[c.color]++; });
            let bestColor = 'red';
            let max = -1;
            for (let key in colorCounts) {
                if (colorCounts[key] > max) { max = colorCounts[key]; bestColor = key; }
            }
            currentColor = bestColor;
            showMsg(`Adversário pediu cor: ${currentColor.toUpperCase()}`);
            finalizePlay(card.value);
            return;
        }
    } else {
        currentColor = card.color;
        finalizePlay(card.value);
    }
}

// Lida botoes de cor do player 1
colorBtns.forEach(btn => {
    btn.onclick = (e) => {
        currentColor = e.target.dataset.color;
        modal.style.display = 'none';
        pendingColorChoice = false;
        showMsg(`Cor mudada para: ${currentColor.toUpperCase()}`);
        finalizePlay('🎨');
    };
});

function drawCard(player, qty = 1, manual = false) {
    for (let i = 0; i < qty; i++) {
        if (deck.length === 0) {
            // Refill deck except last card
            const top = discardPile.pop();
            deck = discardPile.slice();
            discardPile = [top];
            shuffle(deck);
        }
        if (deck.length > 0) {
            const c = deck.pop();
            if (player === 1) p1Hand.push(c);
            else p2Hand.push(c);
        }
    }

    playSound('draw');

    if (manual) {
        showMsg(player === 1 ? "Você comprou carta e passou a vez" : "Adversário comprou carta.");
        turn = turn === 1 ? 2 : 1;
        render();
        if (turn === 2) // Aguardando multiplayer: setTimeout(botLogic, 1500);
    }
}

// Botao Compra
deckBtn.onclick = () => {
    if (turn !== 1 || pendingColorChoice) return;

    // Simplification: Se bater comprar, compra 1 e passa. Se quisesse regra oficial, compra e avalia.
    drawCard(1, 1, true);
    playerCalledUno = false; // Reset gritou
}

unoBtn.onclick = () => {
    if (p1Hand.length === 2 && turn === 1) { // Só validaremos se bater botão antes ou durante penultima e for sua vez (ou simplificado sempre possivel)
        playerCalledUno = true;
        playSound('uno');
        showMsg("UNO GRITADO!");
    } else {
        playSound('error');
    }
}

function finalizePlay(value) {
    // Check penalty UNO (Player only in this arcade mode)
    if (turn === 1 && p1Hand.length === 1 && !playerCalledUno) {
        showMsg("Esqueceu de gritar UNO! Compra +2");
        drawCard(1, 2, false);
    }

    if (p1Hand.length !== 1) playerCalledUno = false; // reset state

    if (value === '+2') {
        const victim = turn === 1 ? 2 : 1;
        drawCard(victim, 2, false);
        showMsg(victim === 1 ? "Você tomou +2 cartas!" : "Adversário tomou +2 cartas!");
        // Na maioria das regras modernas +2 pula a vez de quem comprou.
        // turn stays same para passar para quem jogou? Não, muda normal e a pessoa perde action.
        turn = turn === 1 ? 2 : 1; // pass
        // mas ai passa dnv pq ele perde a vez.
        turn = victim === 1 ? 2 : 1; // victim skips
    } else if (value === 'Block') {
        showMsg("NOPE! Perdeu a vez.");
        // Gira o turno e devolve. No X1, pular vez significa que voce joga denovo
        // entao turn = turn (Nao altera)
    } else {
        // Normal card, pass turn
        turn = turn === 1 ? 2 : 1;
    }

    render();
    if (checkWin()) return;

    if (turn === 2) // Aguardando multiplayer: setTimeout(botLogic, 1500);
}

function botLogic() {
    if (turn !== 2 || checkWin()) return;

    // Tem carta compativel?
    let validIndex = -1;
    for (let i = 0; i < p2Hand.length; i++) {
        if (isValidPlay(p2Hand[i])) { validIndex = i; break; }
    }

    if (validIndex !== -1) {
        // Se tiver 2 cartas, o bot grita UNO magicamente
        if (p2Hand.length === 2) {
            playSound('uno');
            showMsg("UNO! Bot gritou primeiro!");
        }
        playCard(validIndex, 2);
    } else {
        // Compra da mesa e encerra
        drawCard(2, 1, true);
    }
}

function checkWin() {
    if (p1Hand.length === 0) {
        showMsg("🏆 VITÓRIA! VOCÊ ZEROU AS CARTAS!");
        setTimeout(() => alert("VITÓRIA! GÊNIO DAS CARTAS CIANAS!"), 200);
        return true;
    }
    if (p2Hand.length === 0) {
        showMsg("💀 O JOGADOR 2 LEVOU A MELHOR!");
        setTimeout(() => alert("ADVERSÁRIO ZEROU PRIMEIRO!"), 200);
        return true;
    }
    return false;
}

init();
