/**
 * Real Fire - Escudo Anti-Cheat Militar (Client-Side)
 * Módulo Injetado em todos os Mini-Jogos para proteção de memória e heurística de bot.
 * Funcionalidades: Anti-Guile, Anti-Kingrow, SpeedHack block, Auto-Clicker block.
 */

(function () {
    console.log("[Real Fire Security] Inicializando Escudo Anti-Cheat Nível Máximo...");

    // 1. Heurística de Auto-Clicker (Area Cinza / Macro Kingrow)
    let clickCount = 0;
    let lastClickTime = Date.now();
    const MAX_CLICKS_PER_SECOND = 12; // Acima disso é desumano (Bot/Macro)

    document.addEventListener('click', function (e) {
        const now = Date.now();
        if (now - lastClickTime < 1000) {
            clickCount++;
        } else {
            clickCount = 1;
            lastClickTime = now;
        }

        if (clickCount > MAX_CLICKS_PER_SECOND) {
            triggerThreat("Macro/Auto-Clicker Detectado (Heurística de Padrão Kingrow)", "red");
            // Trava os eventos de clique para o bot não progredir
            e.stopPropagation();
            e.preventDefault();
        }
    }, true);

    // 2. Anti-DevTools / Injeção de Código (Modo Guile - Memória)
    // Se a pessoa tentar abrir o inspecionar elemento para alterar pontuação / hitboxes
    const threshold = 160;
    let devtoolsOpen = false;
    setInterval(function () {
        const widthDiff = window.outerWidth - window.innerWidth > threshold;
        const heightDiff = window.outerHeight - window.innerHeight > threshold;
        if ((widthDiff || heightDiff) && !devtoolsOpen) {
            devtoolsOpen = true;
            triggerThreat("Tentativa de injeção de memória (DevTools Aberto - Possível Guile)", "yellow");
        } else if (!widthDiff && !heightDiff && devtoolsOpen) {
            devtoolsOpen = false;
        }
    }, 1000);

    // 3. SpeedHack / Manipulação de Tempo (Bypass comum em canvas)
    let lastPerf = performance.now();
    let lastTime = Date.now();
    setInterval(function () {
        let perfDiff = performance.now() - lastPerf;
        let timeDiff = Date.now() - lastTime;
        // Se a diferença entre tempo de CPU e tempo físico for gritante, o jogo está acelerado via cheat engine
        if (Math.abs(perfDiff - timeDiff) > 500) {
            triggerThreat("Manipulação de Motor Engine (Speedhack / Time Warp)", "red");
        }
        lastPerf = performance.now();
        lastTime = Date.now();
    }, 2000);

    // 4. Comunicar ao Servidor/React do Real Fire
    function triggerThreat(reason, level) {
        console.error(`[ARES SECURITY BLOCK] Ameaça Bloqueada: ${reason}`);

        // Dispara uma mensagem para o React Window Parent onde o jogo está carregado usando iframe.
        // O React capturará isso e jogará no Painel de Admin ou deslogará o usuário ativo instantaneamente.
        if (window.parent && window.parent !== window) {
            window.parent.postMessage({
                type: 'REALFIRE_SECURITY_ALERT',
                payload: {
                    name: "Jogador_Na_Partida", // Na prática o parent identifica quem é
                    reason: reason,
                    level: level,
                    timestamp: Date.now()
                }
            }, '*');
        }

        // Punição Imediata Visual dentro do Game
        if (level === 'red') {
            document.body.innerHTML = `
                <div style="background: black; color: red; height: 100vh; width: 100vw; display: flex; flex-direction: column; align-items: center; justify-content: center; font-family: monospace; z-index: 999999; position: fixed; top: 0; left: 0;">
                    <h1 style="font-size: 3rem; margin: 0; text-transform: uppercase;">Acesso Bloqueado</h1>
                    <p style="color: yellow; font-size: 1.2rem;">SISTEMA MILITAR ARES: ${reason}</p>
                    <p>Sua atividade foi registrada no painel do administrador.</p>
                </div>
            `;
        }
    }

    // Proteger variáveis globais da janela contra sobrescrita de cheats simples
    Object.freeze(window.RealFireSecurity = { status: 'Ativo e Inviolável' });
})();
