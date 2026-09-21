const fs = require('fs');
let html = fs.readFileSync('viewer/viewer.html', 'utf8');
html = html.replace('align-items: center; flex-direction: column; align-items: center;', 'flex-direction: column; align-items: center;');
html = html.replace('flex-direction: column; align-items: center; justify-content: center; background: #000;', 'align-items: center; justify-content: center; background: #000;');
fs.writeFileSync('viewer/viewer.html', html);
