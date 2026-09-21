const fs = require('fs');
const newExts = 'py|c|cpp|java|cs|go|php|rb|swift|ts|sh';

let text = fs.readFileSync('background.js', 'utf8');
text = text.replace(/pptx\|odt\|txt\|csv/g, 'pptx|odt|txt|csv|' + newExts);
fs.writeFileSync('background.js', text);
console.log("Patched background.js");
