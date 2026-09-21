const fs = require('fs');

// 1. Update viewer.html
let html = fs.readFileSync('viewer/viewer.html', 'utf8');
if (!html.includes('pptx-container')) {
    html = html.replace(
        '<div id="odt-container"',
        '<div id="pptx-container" style="display:none; width: 100%; height: 100%; overflow: auto; background: #f0f0f0; padding: 40px; box-sizing: border-box; font-family: sans-serif;"></div>\n        <div id="odt-container"'
    );
    fs.writeFileSync('viewer/viewer.html', html);
}

// 2. Update background.js & content.js
const bg = fs.readFileSync('background.js', 'utf8').replace(/odt\|txt/g, 'pptx|odt|txt');
fs.writeFileSync('background.js', bg);

const ct = fs.readFileSync('content.js', 'utf8').replace(/rtf\|zip\|odt/g, 'rtf|zip|odt|pptx');
fs.writeFileSync('content.js', ct);

// 3. Update viewer.js
let js = fs.readFileSync('viewer/viewer.js', 'utf8');
if (!js.includes("ext === 'pptx'")) {
    js = js.replace("if (ext === 'odt') mimeType = 'application/vnd.oasis.opendocument.text';", 
                    "if (ext === 'odt') mimeType = 'application/vnd.oasis.opendocument.text';\n        if (ext === 'pptx') mimeType = 'application/vnd.openxmlformats-officedocument.presentationml.presentation';");
    
    js = js.replace(/\[([^\]]+)\]\.forEach/, (m, p1) => {
        if (!p1.includes('pptx-container')) return `[${p1}, 'pptx-container'].forEach`;
        return m;
    });

    const pptxRenderCode = `} else if (ext === 'pptx') {
            loadingEl.style.display = 'none';
            const container = document.getElementById('pptx-container');
            container.style.display = 'block';
            
            try {
                const jszip = new JSZip();
                const zip = await jszip.loadAsync(blob);
                
                // Find all slide xml files
                const slideFiles = [];
                zip.folder("ppt/slides").forEach((relativePath, file) => {
                    if (relativePath.match(/^slide\\d+\\.xml$/)) {
                        slideFiles.push({
                            name: relativePath,
                            file: file,
                            num: parseInt(relativePath.replace('slide', '').replace('.xml', ''))
                        });
                    }
                });
                
                slideFiles.sort((a, b) => a.num - b.num);
                
                if (slideFiles.length === 0) {
                    throw new Error('Не найдено слайдов в презентации');
                }
                
                for (let slide of slideFiles) {
                    const slideDiv = document.createElement('div');
                    slideDiv.style.border = '1px solid #ccc';
                    slideDiv.style.marginBottom = '20px';
                    slideDiv.style.padding = '20px';
                    slideDiv.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)';
                    slideDiv.style.background = 'white';
                    slideDiv.style.minHeight = '300px';
                    slideDiv.style.borderRadius = '8px';
                    slideDiv.style.position = 'relative';
                    
                    const slideTitle = document.createElement('div');
                    slideTitle.style.position = 'absolute';
                    slideTitle.style.top = '10px';
                    slideTitle.style.left = '10px';
                    slideTitle.style.color = '#999';
                    slideTitle.style.fontSize = '12px';
                    slideTitle.innerText = 'Слайд ' + slide.num;
                    slideDiv.appendChild(slideTitle);
                    
                    const contentDiv = document.createElement('div');
                    contentDiv.style.marginTop = '20px';
                    contentDiv.style.fontSize = '18px';
                    contentDiv.style.lineHeight = '1.5';
                    
                    const xmlString = await slide.file.async('string');
                    const parser = new DOMParser();
                    const doc = parser.parseFromString(xmlString, "text/xml");
                    
                    const paragraphs = doc.getElementsByTagName('a:p');
                    for (let p of paragraphs) {
                        const pEl = document.createElement('p');
                        pEl.style.margin = '0 0 10px 0';
                        
                        const texts = p.getElementsByTagName('a:t');
                        let pText = '';
                        for (let t of texts) {
                            pText += t.textContent;
                        }
                        
                        if (pText.trim() === '') {
                            pEl.style.minHeight = '1em'; // empty line
                        } else {
                            pEl.textContent = pText;
                        }
                        contentDiv.appendChild(pEl);
                    }
                    
                    slideDiv.appendChild(contentDiv);
                    container.appendChild(slideDiv);
                }
            } catch (err) {
                container.innerHTML = '<div style="color:red; font-family:sans-serif;">Ошибка чтения PPTX: ' + err.message + '</div>';
            }
        `;
        
    js = js.replace(/\} else if \(ext === 'odt'\) \{/, pptxRenderCode + '\n        } else if (ext === \'odt\') {');
    js = js.replace(/if \(id === 'rtf-container' \|\| id === 'odt-container'\) el\.innerHTML = '';/, "if (id === 'rtf-container' || id === 'odt-container' || id === 'pptx-container') el.innerHTML = '';");
    
    fs.writeFileSync('viewer/viewer.js', js);
}
console.log('PPTX patch applied');
