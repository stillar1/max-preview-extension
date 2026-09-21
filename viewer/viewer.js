
const urlParams = new URLSearchParams(window.location.search);
const fileUrl = urlParams.get('url');
let originalFileName = urlParams.get('name') || 'Document';

window.onerror = function(msg, url, lineNo, columnNo, error) {
    const loadingEl = document.getElementById('loading');
    if(loadingEl) {
        loadingEl.style.display = 'block';
        loadingEl.innerHTML = `<span style="color:red; font-weight:bold;">Global Error:</span><br>${msg}<br>Line: ${lineNo}`;
    }
    return false;
};

document.getElementById('fileName').textContent = originalFileName;


let currentBlobUrl = null;
let currentFileName = originalFileName;
let isInsideZip = false;

document.getElementById('downloadBtn').addEventListener('click', () => {
    const urlToDownload = currentBlobUrl || fileUrl;
    if (chrome && chrome.downloads && urlToDownload) {
        chrome.downloads.download({
            url: urlToDownload,
            filename: currentFileName
        });
    } else {
        const a = document.createElement('a');
        a.href = urlToDownload || '#';
        a.download = currentFileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    }
});

const originalBtn = document.getElementById('downloadOriginalBtn');
if (originalBtn) {
    originalBtn.addEventListener('click', () => {
        if (chrome && chrome.downloads && fileUrl) {
            chrome.downloads.download({
                url: fileUrl,
                filename: originalFileName
            });
        } else {
            const a = document.createElement('a');
            a.href = fileUrl || '#';
            a.download = originalFileName;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
        }
    });
}


function hideAllContainers() {
    ['loading', 'docx-container', 'luckysheet-iframe', 'pdf-container', 'rtf-container', 'img-container', 'zip-container', 'text-container', 'media-container', 'unsupported-container', 'odt-container', 'pptx-container'].forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            el.style.display = 'none';
            if (id === 'zip-container') document.getElementById('zip-list').innerHTML = '';
            if (id === 'text-container') el.textContent = '';
            if (id === 'media-container') el.innerHTML = '';
            if (id === 'rtf-container' || id === 'odt-container' || id === 'pptx-container') el.innerHTML = '';
            if (id === 'docx-container') el.innerHTML = '';
        }
    });
}

async function renderBlob(blob, fileName, isInnerFile = false) {
    if (currentBlobUrl) {
        URL.revokeObjectURL(currentBlobUrl);
    }
    currentBlobUrl = URL.createObjectURL(blob);
    currentFileName = fileName;
    isInsideZip = isInnerFile;
    
    const originalBtn = document.getElementById('downloadOriginalBtn');
    if (originalBtn) {
        originalBtn.style.display = isInnerFile ? 'inline-block' : 'none';
    }

    hideAllContainers();
    const loadingEl = document.getElementById('loading');
    loadingEl.style.display = 'block';
    loadingEl.innerHTML = 'Обработка файла...';
    
    document.getElementById('fileName').textContent = fileName;
    
    const extMatch = fileName.match(/\.([a-zA-Z0-9]+)$/);
    let ext = extMatch ? extMatch[1].toLowerCase() : '';

    try {
        if (ext === 'pdf') {
            loadingEl.style.display = 'none';
            const container = document.getElementById('pdf-container');
            container.src = URL.createObjectURL(blob);
            container.style.display = 'block';
        } else if (ext === 'rtf') {
            loadingEl.style.display = 'none';
            const container = document.getElementById('rtf-container');
            container.style.display = 'block';
            
            const buffer = await blob.arrayBuffer();
            RTFJS.loggingEnabled(false);
            const doc = new RTFJS.Document(new Uint8Array(buffer));
            const elements = await doc.render();
            elements.forEach(el => container.appendChild(el));
        } else if (ext === 'png' || ext === 'jpeg' || ext === 'jpg') {
            loadingEl.style.display = 'none';
            const container = document.getElementById('img-container');
            document.getElementById('img-preview').src = URL.createObjectURL(blob);
            container.style.display = 'block';
        } else if (ext === 'docx') {
            loadingEl.style.display = 'none';
            const container = document.getElementById('docx-container');
            container.style.display = 'block';
            await docx.renderAsync(blob, container);
        } else if (ext === 'xlsx' || ext === 'xls') {
            const iframe = document.getElementById('luckysheet-iframe');
            iframe.style.display = 'block';
            
            const file = new File([blob], fileName, {type: blob.type});
            LuckyExcel.transformExcelToLucky(file, function(exportJson, luckysheetfile){
                if(exportJson.sheets == null || exportJson.sheets.length == 0){
                    throw new Error("Ошибка чтения excel файла (пустые данные)!");
                }
                
                let hasActive = false;
                exportJson.sheets.forEach(sheet => {
                    if (sheet.status == 1) {
                        if (hasActive) {
                            sheet.status = 0;
                        } else {
                            hasActive = true;
                        }
                    }
                });
                if (!hasActive && exportJson.sheets.length > 0) {
                    exportJson.sheets[0].status = 1;
                }

                let isSent = false;
                const sendData = () => {
                    if (isSent) return;
                    isSent = true;
                    loadingEl.style.display = 'none';
                    iframe.contentWindow.postMessage({
                        action: 'loadExcel',
                        sheets: exportJson.sheets,
                        title: (exportJson.info && exportJson.info.name) ? exportJson.info.name : fileName,
                        userInfo: (exportJson.info && exportJson.info.creator) ? exportJson.info.creator : ''
                    }, '*');
                };
                
                window.addEventListener('message', (event) => {
                    if (event.data && event.data.action === 'iframeReady') {
                        sendData();
                    }
                });
                
                setTimeout(() => {
                    if(!isSent) sendData();
                }, 1500);
            }, function(err){
                console.error("Import failed", err);
                if(loadingEl) {
                    loadingEl.style.display = 'block';
                    loadingEl.innerHTML = '<span style="color:red; font-weight:bold;">Ошибка чтения Excel:</span><br>' + err;
                }
            });
        } else if (ext === 'pptx') {
            loadingEl.style.display = 'none';
            const container = document.getElementById('pptx-container');
            container.style.display = 'block';
            
            try {
                const jszip = new JSZip();
                const zip = await jszip.loadAsync(blob);
                
                // Find all slide xml files
                const slideFiles = [];
                zip.folder("ppt/slides").forEach((relativePath, file) => {
                    if (relativePath.match(/^slide\d+\.xml$/)) {
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
                    
                    
                    // Extract images
                    const relsFile = zip.file(`ppt/slides/_rels/slide${slide.num}.xml.rels`);
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

                    container.appendChild(slideDiv);
                }
            } catch (err) {
                container.innerHTML = '<div style="color:red; font-family:sans-serif;">Ошибка чтения PPTX: ' + err.message + '</div>';
            }
        
        } else if (ext === 'odt') {
            loadingEl.style.display = 'none';
            const container = document.getElementById('odt-container');
            container.style.display = 'block';
            
            try {
                const jszip = new JSZip();
                const zip = await jszip.loadAsync(blob);
                if (!zip.file('content.xml')) throw new Error('Некорректный ODT файл: отсутствует content.xml');
                
                const xmlString = await zip.file('content.xml').async('string');
                const parser = new DOMParser();
                const doc = parser.parseFromString(xmlString, "text/xml");
                
                // Простая конвертация ODT XML -> HTML
                function convertNode(node) {
                    if (node.nodeType === 3) return document.createTextNode(node.nodeValue); // Text node
                    if (node.nodeType !== 1) return null; // Only elements
                    
                    let el = null;
                    const tag = node.tagName.toLowerCase();
                    
                    if (tag === 'text:p') el = document.createElement('p');
                    else if (tag === 'text:h') {
                        const level = node.getAttribute('text:outline-level') || '1';
                        el = document.createElement('h' + Math.min(level, 6));
                    }
                    else if (tag === 'text:span') el = document.createElement('span');
                    else if (tag === 'text:a') {
                        el = document.createElement('a');
                        el.href = node.getAttribute('xlink:href') || '#';
                        el.style.color = 'blue';
                        el.style.textDecoration = 'underline';
                    }
                    else if (tag === 'text:list') el = document.createElement('ul');
                    else if (tag === 'text:list-item') el = document.createElement('li');
                    else if (tag === 'table:table') {
                        el = document.createElement('table');
                        el.style.borderCollapse = 'collapse';
                        el.style.width = '100%';
                        el.style.marginBottom = '1em';
                    }
                    else if (tag === 'table:table-row') el = document.createElement('tr');
                    else if (tag === 'table:table-cell') {
                        el = document.createElement('td');
                        el.style.border = '1px solid #ccc';
                        el.style.padding = '4px 8px';
                    }
                    else if (tag === 'draw:image') {
                        el = document.createElement('img');
                        el.style.maxWidth = '100%';
                        const href = node.getAttribute('xlink:href');
                        if (href && zip.file(href)) {
                            zip.file(href).async("blob").then(imgBlob => {
                                el.src = URL.createObjectURL(imgBlob);
                            });
                        }
                    }
                    else if (tag === 'text:s') {
                        el = document.createElement('span');
                        const spaces = parseInt(node.getAttribute('text:c') || '1', 10);
                        el.innerHTML = '&nbsp;'.repeat(spaces);
                    }
                    else if (tag === 'text:tab') {
                        el = document.createElement('span');
                        el.innerHTML = '&nbsp;&nbsp;&nbsp;&nbsp;';
                    }
                    
                    if (!el) {
                        el = document.createElement('span');
                    }
                    
                    if (el.tagName === 'P') {
                        el.style.margin = '0 0 1em 0';
                        el.style.minHeight = '1em';
                    }
                    
                    for (let child of node.childNodes) {
                        const converted = convertNode(child);
                        if (converted) el.appendChild(converted);
                    }
                    
                    return el;
                }
                
                const textElement = doc.getElementsByTagName('office:text')[0];
                if (textElement) {
                    for (let child of textElement.childNodes) {
                        const converted = convertNode(child);
                        if (converted) container.appendChild(converted);
                    }
                }
                
            } catch (err) {
                container.innerHTML = '<div style="color:red; font-family:sans-serif;">Ошибка чтения ODT: ' + err.message + '</div>';
            }
        } else if (ext === 'zip') {
            loadingEl.style.display = 'none';
            const container = document.getElementById('zip-container');
            const list = document.getElementById('zip-list');
            container.style.display = 'block';
            
            try {
                const jszip = new JSZip();
                const zip = await jszip.loadAsync(blob);
                
                Object.keys(zip.files).forEach(filename => {
                    const file = zip.files[filename];
                    const li = document.createElement('li');
                    li.style.padding = '8px 0';
                    li.style.borderBottom = '1px solid #eee';
                    li.style.display = 'flex';
                    li.style.alignItems = 'center';
                    li.style.justifyContent = 'space-between';
                    
                    const left = document.createElement('div');
                    
                    if (file.dir) {
                        left.innerHTML = '📁 <strong>' + filename + '</strong>';
                        li.appendChild(left);
                    } else {
                        const size = file._data && file._data.uncompressedSize ? (file._data.uncompressedSize / 1024).toFixed(1) + ' KB' : '';
                        left.innerHTML = '📄 ' + filename + (size ? ' <span style="color:#999;font-size:0.9em;">(' + size + ')</span>' : '');
                        
                        const btn = document.createElement('button');
                        btn.textContent = 'Открыть';
                        btn.style.padding = '4px 12px';
                        btn.style.cursor = 'pointer';
                        btn.style.border = '1px solid #ccc';
                        btn.style.background = '#fff';
                        btn.style.borderRadius = '4px';
                        
                        btn.onclick = async () => {
                            try {
                                btn.textContent = 'Загрузка...';
                                btn.disabled = true;
                                const fileBlob = await file.async("blob");
                                // We don't have mime type perfectly here, but renderBlob uses extension!
                                await renderBlob(fileBlob, filename, true);
                            } catch (e) {
                                alert("Ошибка открытия файла: " + e.message);
                                btn.textContent = 'Открыть';
                                btn.disabled = false;
                            }
                        };
                        
                        li.appendChild(left);
                        li.appendChild(btn);
                    }
                    list.appendChild(li);
                });
            } catch (err) {
                list.innerHTML = '<li style="color:red;">Ошибка чтения архива: ' + err.message + '</li>';
            }
        } else if (['txt','csv','json','xml','md','js','css','html'].includes(ext)) {
            loadingEl.style.display = 'none';
            const container = document.getElementById('text-container');
            container.style.display = 'block';
            container.textContent = await blob.text();
        } else if (['mp4','webm','ogg','mp3','wav'].includes(ext)) {
            loadingEl.style.display = 'none';
            const container = document.getElementById('media-container');
            container.style.display = 'flex';
            
            const isVideo = ['mp4','webm','ogg'].includes(ext);
            const media = document.createElement(isVideo ? 'video' : 'audio');
            media.controls = true;
            media.style.maxWidth = '100%';
            media.style.maxHeight = '100%';
            media.src = URL.createObjectURL(blob);
            container.appendChild(media);
        } else {
            loadingEl.style.display = 'none';
            document.getElementById('unsupported-container').style.display = 'flex';
        }
    } catch (e) {
        console.error(e);
        loadingEl.style.display = 'block';
        loadingEl.innerHTML = `<span style="color:red; font-weight:bold;">Ошибка:</span><br>${e.message}`;
    }
}

async function loadFile() {
    const loadingEl = document.getElementById('loading');
    try {
        if (!fileUrl) return; // if opened directly without url
        if (fileUrl.startsWith('blob:')) {
            throw new Error("Файл зашифрован (blob).");
        }
        
        loadingEl.innerHTML = `Загрузка файла...`;
        
        const response = await fetch(fileUrl);
        if (!response.ok) throw new Error("HTTP " + response.status);
        
        const extMatch = originalFileName.match(/\.([a-zA-Z0-9]+)$/);
        let ext = extMatch ? extMatch[1].toLowerCase() : '';
        if (!ext) {
            const urlExtMatch = fileUrl.split('?')[0].match(/\.([a-zA-Z0-9]+)$/);
            if (urlExtMatch) ext = urlExtMatch[1].toLowerCase();
        }
        
        // ПРИНУДИТЕЛЬНО задаем правильный MIME-тип
        let mimeType = 'application/octet-stream';
        if (ext === 'pdf') mimeType = 'application/pdf';
        if (ext === 'png') mimeType = 'image/png';
        if (ext === 'jpeg' || ext === 'jpg') mimeType = 'image/jpeg';
        if (ext === 'docx') mimeType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
        if (ext === 'xlsx') mimeType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
        if (ext === 'xls') mimeType = 'application/vnd.ms-excel';
        if (ext === 'rtf') mimeType = 'application/rtf';
        if (ext === 'zip') mimeType = 'application/zip';
        if (ext === 'odt') mimeType = 'application/vnd.oasis.opendocument.text';
        if (ext === 'pptx') mimeType = 'application/vnd.openxmlformats-officedocument.presentationml.presentation';
        if (['txt','csv','json','xml','md','js','css','html'].includes(ext)) mimeType = 'text/plain';
        if (['mp4','webm','ogg'].includes(ext)) mimeType = 'video/' + ext;
        if (['mp3','wav','ogg'].includes(ext)) mimeType = 'audio/' + (ext==='mp3'?'mpeg':ext);
        
        const rawBlob = await response.blob();
        const blob = new Blob([rawBlob], { type: mimeType });
        
        await renderBlob(blob, originalFileName);

    } catch (e) {
        console.error(e);
        loadingEl.style.display = 'block';
        loadingEl.innerHTML = `<span style="color:red; font-weight:bold;">Ошибка:</span><br>${e.message}`;
    }
}

// Запускаем файл сразу без кнопки
loadFile();
