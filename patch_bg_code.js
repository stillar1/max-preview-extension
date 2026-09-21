const fs = require('fs');
const newExts = 'py|c|cpp|java|cs|go|php|rb|swift|ts|sh';

function addExts(filename) {
    let text = fs.readFileSync(filename, 'utf8');
    text = text.replace(/rtf\|zip\|odt\|pptx\|txt/g, 'rtf|zip|odt|pptx|txt|' + newExts);
    text = text.replace(/rtf\|zip\|odt\|pptx(\)|\\)/g, 'rtf|zip|odt|pptx|txt|csv|json|xml|md|js|css|html|' + newExts + '$1');
    fs.writeFileSync(filename, text);
}

addExts('background.js');
addExts('content.js');
console.log("Patched background and content");
