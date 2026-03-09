import fs from 'fs';
const data = fs.readFileSync('./src/pages/Profile.tsx', 'utf8');
const lines = data.split('\n');
lines.slice(0, 50).forEach(l => console.log(l));
