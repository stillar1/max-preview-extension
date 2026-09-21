const fs = require('fs');
let html = fs.readFileSync('viewer/viewer.html', 'utf8');
html = html.replace('display:none; width: 100%; height: 100%; display: flex;', 'display:none; width: 100%; height: 100%; align-items: center;');
fs.writeFileSync('viewer/viewer.html', html);
