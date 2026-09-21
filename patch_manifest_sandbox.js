const fs = require('fs');
let manifest = JSON.parse(fs.readFileSync('manifest.json', 'utf8'));

if (!manifest.sandbox) {
    manifest.sandbox = {
        pages: ["viewer/runner.html"]
    };
    fs.writeFileSync('manifest.json', JSON.stringify(manifest, null, 2));
    console.log('Added sandbox to manifest');
} else if (!manifest.sandbox.pages.includes("viewer/runner.html")) {
    manifest.sandbox.pages.push("viewer/runner.html");
    fs.writeFileSync('manifest.json', JSON.stringify(manifest, null, 2));
    console.log('Appended to sandbox in manifest');
}
