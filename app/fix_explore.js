const fs = require('fs');
const path = 'page.tsx';
let content = fs.readFileSync(path, 'utf8');

content = content.replace(/onClick=\{\(\) => setActiveTab\('explore'\)\}/g, "onClick={() => goPage(6)}");
fs.writeFileSync(path, content, 'utf8');
console.log('Fixed explore button onClick');
