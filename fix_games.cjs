const fs = require('fs');

function fixMainJS(filePath) {
    let content = fs.readFileSync(filePath, 'utf8');

    // 1. replace updateUI
    content = content.replace(/function updateUI\(\) \{[\s\S]*?if \(!gameStarted\) \{/g, `function updateUI() {
    scoreEl.innerText = \`Pontos: \${score}\`;
    healthEl.innerText = \`Vida: \${health}\`;
    levelEl.innerText = \`Nv. \${currentLevel}\`;
    
    if (window.parent && window.parent !== window) {
        window.parent.postMessage({ type: 'SCORE_UPDATE', score: score }, '*');
    }

    if (health <= 0) {
        gameOver = true;
        gameOverEl.style.display = 'block';
        finalScoreEl.innerText = score;
        
        if (window.parent && window.parent !== window) {
            window.parent.postMessage({ type: 'GAME_OVER', score: score }, '*');
        }
    }
}

function calculateLevelAndDifficulty() {`);

    // it might be replacing too much. Let's just do targeted replace:
    content = fs.readFileSync(filePath, 'utf8');
    
    let toReplace = content.match(/function updateUI\(\) \{[\s\S]*?if \(health <= 0\) \{[\s\S]*?\}\n\}/);
    if(toReplace) {
        content = content.replace(toReplace[0], `function updateUI() {
    scoreEl.innerText = \`Pontos: \${score}\`;
    healthEl.innerText = \`Vida: \${health}\`;
    levelEl.innerText = \`Nv. \${currentLevel}\`;
    
    if (window.parent && window.parent !== window) {
        window.parent.postMessage({ type: 'SCORE_UPDATE', score: score }, '*');
    }

    if (health <= 0) {
        gameOver = true;
        gameOverEl.style.display = 'block';
        finalScoreEl.innerText = score;
        if (window.parent && window.parent !== window) {
            window.parent.postMessage({ type: 'GAME_OVER', score: score }, '*');
        }
    }
}`);
    }

    // 2. add RESTART_ALLOWED message listener and TRY_AGAIN_REQUEST
    if (!content.includes("RESTART_ALLOWED")) {
        content += `\n
window.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'RESTART_ALLOWED') {
        resetGame();
    }
});

const __restartBtn = document.getElementById('restart-btn');
if (__restartBtn) {
    __restartBtn.addEventListener('click', (e) => {
        e.stopPropagation(); // prevent quit game
        if (window.parent && window.parent !== window) {
            window.parent.postMessage({ type: 'TRY_AGAIN_REQUEST' }, '*');
        } else {
            resetGame();
        }
    });
}

window.addEventListener('click', (e) => {
    if (gameOver && e.target !== __restartBtn && e.target.id !== 'restart-btn') {
        if (window.parent && window.parent !== window) {
            window.parent.postMessage({ type: 'QUIT_GAME' }, '*');
        }
    }
});
`;
    }

    fs.writeFileSync(filePath, content);
}

fixMainJS('/home/mariana/Desktop/site completo/realfiremoneys/public/minigames/jumping/main.js');
fixMainJS('/home/mariana/Desktop/site completo/realfiremoneys/public/minigames/shooting/main.js');

console.log('Fixed jumping and shooting main.js');
