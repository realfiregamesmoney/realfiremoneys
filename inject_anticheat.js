const fs = require('fs');
const path = require('path');

const base = 'public/minigames';
const games = ['batalhanaval','uno','jogodavelha','damas','caraacara','jumping','shooting','cacheta','xadrez','domino'];

games.forEach(game => {
    const file = path.join(base, game, 'index.html');
    if (fs.existsSync(file)) {
        let content = fs.readFileSync(file, 'utf8');
        if (!content.includes('anticheat.js')) {
            content = content.replace('</head>', '    <script src="/minigames/anticheat.js"></script>\n</head>');
            fs.writeFileSync(file, content);
            console.log('Injected in', game);
        }
    }
    
    // Some use lobby.html, some main.html. Let's make sure.
    const fileLobby = path.join(base, game, 'lobby.html');
    if (fs.existsSync(fileLobby)) {
        let lobbyContent = fs.readFileSync(fileLobby, 'utf8');
        if (!lobbyContent.includes('anticheat.js')) {
            lobbyContent = lobbyContent.replace('</head>', '    <script src="/minigames/anticheat.js"></script>\n</head>');
            fs.writeFileSync(fileLobby, lobbyContent);
            console.log('Injected in lobby', game);
        }
    }
});
