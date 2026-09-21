const fs = require('fs');
let js = fs.readFileSync('viewer/viewer.js', 'utf8');

const regex = /const paragraphs = doc.getElementsByTagName\('a:p'\);[\s\S]*?slideDiv\.appendChild\(contentDiv\);/m;
const replacement = `
                    // Extract images
                    const relsFile = zip.file(\`ppt/slides/_rels/slide\${slide.num}.xml.rels\`);
                    const relMap = {};
                    if (relsFile) {
                        const relsXml = await relsFile.async('string');
                        const relsDoc = parser.parseFromString(relsXml, 'text/xml');
                        const rels = relsDoc.getElementsByTagName('Relationship');
                        for (let rel of rels) {
                            relMap[rel.getAttribute('Id')] = rel.getAttribute('Target');
                        }
                    }

                    // Elements inside spTree can be text or pictures
                    const spTree = doc.getElementsByTagName('p:spTree')[0];
                    if (spTree) {
                        for (let child of spTree.children) {
                            if (child.tagName === 'p:sp') {
                                // Text shape
                                const paragraphs = child.getElementsByTagName('a:p');
                                for (let p of paragraphs) {
                                    const pEl = document.createElement('p');
                                    pEl.style.margin = '0 0 10px 0';
                                    const texts = p.getElementsByTagName('a:t');
                                    let pText = '';
                                    for (let t of texts) {
                                        pText += t.textContent;
                                    }
                                    if (pText.trim() === '') pEl.style.minHeight = '1em';
                                    else pEl.textContent = pText;
                                    contentDiv.appendChild(pEl);
                                }
                            } else if (child.tagName === 'p:pic') {
                                // Picture
                                const blip = child.getElementsByTagName('a:blip')[0];
                                if (blip) {
                                    const embedId = blip.getAttribute('r:embed');
                                    const target = relMap[embedId];
                                    if (target) {
                                        // target is usually "../media/image1.png"
                                        const imgPath = target.replace('../', 'ppt/');
                                        const imgFile = zip.file(imgPath);
                                        if (imgFile) {
                                            const imgBlob = await imgFile.async('blob');
                                            const imgEl = document.createElement('img');
                                            imgEl.src = URL.createObjectURL(imgBlob);
                                            imgEl.style.maxWidth = '100%';
                                            imgEl.style.maxHeight = '300px';
                                            imgEl.style.display = 'block';
                                            imgEl.style.margin = '10px 0';
                                            contentDiv.appendChild(imgEl);
                                        }
                                    }
                                }
                            }
                        }
                    }
                    slideDiv.appendChild(contentDiv);
`;

if (regex.test(js)) {
    js = js.replace(regex, replacement);
    fs.writeFileSync('viewer/viewer.js', js);
    console.log('Images patch applied');
} else {
    console.log('Regex not matched');
}
