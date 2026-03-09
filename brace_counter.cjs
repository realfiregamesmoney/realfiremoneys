const fs = require('fs');
const content = fs.readFileSync('/home/mariana/Desktop/site completo/realfiremoneys/src/components/admin/AdminAchievements.tsx', 'utf8');
let openBraces = 0;
let closedBraces = 0;
for (let char of content) {
    if (char === '{') openBraces++;
    if (char === '}') closedBraces++;
}
console.log(`Open: ${openBraces}, Closed: ${closedBraces}`);
if (openBraces !== closedBraces) {
    console.log("BRACE MISMATCH DETECTED!");
}
